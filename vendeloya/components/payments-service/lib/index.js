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
exports.paymentsService = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
const pubsub_1 = require("@google-cloud/pubsub");
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
const pubsub = new pubsub_1.PubSub();
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
// Process payment
app.post('/process', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const { orderId, amount, currency, paymentMethod } = req.body;
        if (!orderId || !amount || !currency || !paymentMethod) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Verify order exists
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        const order = orderDoc.data();
        if (order.userId !== user.uid) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        // Create payment record
        const payment = {
            orderId,
            userId: user.uid,
            amount: parseFloat(amount),
            currency,
            paymentMethod,
            status: 'processing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const paymentRef = await db.collection('payments').add(payment);
        const paymentId = paymentRef.id;
        // Simulate payment processing (in production, integrate with payment gateway)
        setTimeout(async () => {
            const success = Math.random() > 0.1; // 90% success rate for demo
            const status = success ? 'completed' : 'failed';
            const transactionId = success ? `TXN-${Date.now()}` : undefined;
            await db.collection('payments').doc(paymentId).update({
                status,
                transactionId,
                updatedAt: new Date().toISOString(),
            });
            // Publish payment result to Pub/Sub
            const topic = pubsub.topic('payment-processed');
            await topic.publishMessage({
                json: {
                    paymentId,
                    orderId,
                    status,
                    transactionId,
                },
            });
            // Update order status
            if (success) {
                await db.collection('orders').doc(orderId).update({
                    status: 'paid',
                    updatedAt: new Date().toISOString(),
                });
            }
        }, 2000);
        const paymentDoc = await db.collection('payments').doc(paymentId).get();
        res.status(202).json({ id: paymentDoc.id, ...paymentDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get payment by ID
app.get('/:paymentId', verifyToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const user = req.user;
        const paymentDoc = await db.collection('payments').doc(paymentId).get();
        if (!paymentDoc.exists) {
            res.status(404).json({ error: 'Payment not found' });
            return;
        }
        const payment = paymentDoc.data();
        if (payment.userId !== user.uid && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        res.json({ id: paymentDoc.id, ...payment });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get payments by order
app.get('/order/:orderId', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const user = req.user;
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
        const paymentsSnapshot = await db.collection('payments')
            .where('orderId', '==', orderId)
            .get();
        const payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(payments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Refund payment (admin only)
app.post('/:paymentId/refund', verifyToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const user = req.user;
        if (user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const paymentDoc = await db.collection('payments').doc(paymentId).get();
        if (!paymentDoc.exists) {
            res.status(404).json({ error: 'Payment not found' });
            return;
        }
        const payment = paymentDoc.data();
        if (payment.status !== 'completed') {
            res.status(400).json({ error: 'Payment must be completed to refund' });
            return;
        }
        await db.collection('payments').doc(paymentId).update({
            status: 'refunded',
            updatedAt: new Date().toISOString(),
        });
        // Publish refund event
        const topic = pubsub.topic('payment-refunded');
        await topic.publishMessage({
            json: {
                paymentId,
                orderId: payment.orderId,
            },
        });
        const updatedPayment = await db.collection('payments').doc(paymentId).get();
        res.json({ id: updatedPayment.id, ...updatedPayment.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.paymentsService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map