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
exports.ordersService = void 0;
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
// Create order from cart
app.post('/create', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const { cartId, shippingAddress } = req.body;
        if (!cartId) {
            res.status(400).json({ error: 'Cart ID is required' });
            return;
        }
        // Get cart
        const cartDoc = await db.collection('carts').doc(cartId).get();
        if (!cartDoc.exists) {
            res.status(404).json({ error: 'Cart not found' });
            return;
        }
        const cart = cartDoc.data();
        if (cart.userId !== user.uid) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (cart.items.length === 0) {
            res.status(400).json({ error: 'Cart is empty' });
            return;
        }
        // Create order
        const order = {
            userId: user.uid,
            items: cart.items,
            total: cart.total,
            currency: 'USD',
            status: 'pending',
            shippingAddress: shippingAddress || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const orderRef = await db.collection('orders').add(order);
        const orderDoc = await orderRef.get();
        // Clear cart
        await db.collection('carts').doc(cartId).update({
            items: [],
            total: 0,
            updatedAt: new Date().toISOString(),
        });
        res.status(201).json({ id: orderDoc.id, ...orderDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get order by ID
app.get('/:orderId', verifyToken, async (req, res) => {
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
        res.json({ id: orderDoc.id, ...order });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get user orders
app.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = req.user;
        if (user.uid !== userId && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        const orders = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get all orders (admin only)
app.get('/', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const ordersSnapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const orders = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update order status (admin only)
app.put('/:orderId/status', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const user = req.user;
        const { status } = req.body;
        if (user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const validStatuses = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        await db.collection('orders').doc(orderId).update({
            status,
            updatedAt: new Date().toISOString(),
        });
        const orderDoc = await db.collection('orders').doc(orderId).get();
        res.json({ id: orderDoc.id, ...orderDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.ordersService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map