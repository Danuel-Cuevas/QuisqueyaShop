"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingService = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
// Configure emulator settings if not in production
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
}
admin.initializeApp();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
const db = admin.firestore();
// Middleware to verify token
async function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
}
// Generate invoice from order
app.post('/generate', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const { orderId } = req.body;
        if (!orderId) {
            res.status(400).json({ error: 'Order ID is required' });
            return;
        }
        // Get order
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        const order = orderDoc.data();
        if (order.userId !== user.uid && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        // Check if invoice already exists
        const existingInvoice = await db.collection('invoices')
            .where('orderId', '==', orderId)
            .limit(1)
            .get();
        if (!existingInvoice.empty) {
            const invoiceDoc = existingInvoice.docs[0];
            res.json({ id: invoiceDoc.id, ...invoiceDoc.data() });
            return;
        }
        // Generate invoice number
        const invoiceCount = await db.collection('invoices').count().get();
        const invoiceNumber = `INV-${Date.now()}-${invoiceCount.data().count + 1}`;
        // Calculate totals
        const items = order.items || [];
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.1; // 10% tax
        const total = subtotal + tax;
        // Get product names
        const productIds = items.map((item) => item.productId);
        const productDocs = await Promise.all(productIds.map((id) => db.collection('products').doc(id).get()));
        const invoiceItems = items.map((item, index) => {
            const productDoc = productDocs[index];
            const product = productDoc.exists ? productDoc.data() : { name: 'Unknown Product' };
            return {
                productId: item.productId,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: item.price,
                total: item.price * item.quantity,
            };
        });
        const invoice = {
            orderId,
            userId: order.userId,
            items: invoiceItems,
            subtotal,
            tax,
            total,
            currency: order.currency || 'USD',
            status: 'draft',
            invoiceNumber,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const invoiceRef = await db.collection('invoices').add(invoice);
        const invoiceDoc = await invoiceRef.get();
        res.status(201).json({ id: invoiceDoc.id, ...invoiceDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Issue invoice
app.post('/:invoiceId/issue', verifyToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const user = req.user;
        if (user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
        if (!invoiceDoc.exists) {
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }
        const invoice = invoiceDoc.data();
        if (invoice.status !== 'draft') {
            res.status(400).json({ error: 'Invoice is not in draft status' });
            return;
        }
        await db.collection('invoices').doc(invoiceId).update({
            status: 'issued',
            issuedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        const updatedInvoice = await db.collection('invoices').doc(invoiceId).get();
        res.json({ id: updatedInvoice.id, ...updatedInvoice.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Mark invoice as paid
app.post('/:invoiceId/pay', verifyToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const user = req.user;
        const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
        if (!invoiceDoc.exists) {
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }
        const invoice = invoiceDoc.data();
        if (invoice.userId !== user.uid && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (invoice.status !== 'issued') {
            res.status(400).json({ error: 'Invoice must be issued before payment' });
            return;
        }
        await db.collection('invoices').doc(invoiceId).update({
            status: 'paid',
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        const updatedInvoice = await db.collection('invoices').doc(invoiceId).get();
        res.json({ id: updatedInvoice.id, ...updatedInvoice.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get invoice by ID
app.get('/:invoiceId', verifyToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const user = req.user;
        const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
        if (!invoiceDoc.exists) {
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }
        const invoice = invoiceDoc.data();
        if (invoice.userId !== user.uid && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        res.json({ id: invoiceDoc.id, ...invoice });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get invoices by user
app.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = req.user;
        if (user.uid !== userId && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const invoicesSnapshot = await db.collection('invoices')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        const invoices = invoicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.billingService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map