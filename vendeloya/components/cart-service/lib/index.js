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
exports.cartService = void 0;
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
// Get user cart
app.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = req.user;
        if (user.uid !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const cartSnapshot = await db.collection('carts')
            .where('userId', '==', userId)
            .limit(1)
            .get();
        if (cartSnapshot.empty) {
            // Create empty cart
            const newCart = {
                userId,
                items: [],
                total: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const docRef = await db.collection('carts').add(newCart);
            const doc = await docRef.get();
            res.json({ id: doc.id, ...doc.data() });
            return;
        }
        const cartDoc = cartSnapshot.docs[0];
        res.json({ id: cartDoc.id, ...cartDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Add item to cart
app.post('/user/:userId/items', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = req.user;
        const { productId, quantity } = req.body;
        if (user.uid !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (!productId || !quantity || quantity <= 0) {
            res.status(400).json({ error: 'Invalid productId or quantity' });
            return;
        }
        // Get product to get price
        const productDoc = await db.collection('products').doc(productId).get();
        if (!productDoc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        const product = productDoc.data();
        const price = product.price;
        // Get or create cart
        const cartSnapshot = await db.collection('carts')
            .where('userId', '==', userId)
            .limit(1)
            .get();
        let cartId;
        let cart;
        if (cartSnapshot.empty) {
            cart = {
                userId,
                items: [],
                total: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const docRef = await db.collection('carts').add(cart);
            cartId = docRef.id;
        }
        else {
            const cartDoc = cartSnapshot.docs[0];
            cartId = cartDoc.id;
            cart = { id: cartDoc.id, ...cartDoc.data() };
        }
        // Check if item already exists
        const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += quantity;
        }
        else {
            cart.items.push({ productId, quantity, price });
        }
        // Recalculate total
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.updatedAt = new Date().toISOString();
        await db.collection('carts').doc(cartId).update(cart);
        const updatedCart = await db.collection('carts').doc(cartId).get();
        res.json({ id: updatedCart.id, ...updatedCart.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update item quantity
app.put('/user/:userId/items/:productId', verifyToken, async (req, res) => {
    try {
        const { userId, productId } = req.params;
        const user = req.user;
        const { quantity } = req.body;
        if (user.uid !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (!quantity || quantity <= 0) {
            res.status(400).json({ error: 'Invalid quantity' });
            return;
        }
        const cartSnapshot = await db.collection('carts')
            .where('userId', '==', userId)
            .limit(1)
            .get();
        if (cartSnapshot.empty) {
            res.status(404).json({ error: 'Cart not found' });
            return;
        }
        const cartDoc = cartSnapshot.docs[0];
        const cart = { id: cartDoc.id, ...cartDoc.data() };
        const itemIndex = cart.items.findIndex(item => item.productId === productId);
        if (itemIndex < 0) {
            res.status(404).json({ error: 'Item not found in cart' });
            return;
        }
        cart.items[itemIndex].quantity = quantity;
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.updatedAt = new Date().toISOString();
        await db.collection('carts').doc(cartDoc.id).update(cart);
        const updatedCart = await db.collection('carts').doc(cartDoc.id).get();
        res.json({ id: updatedCart.id, ...updatedCart.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Remove item from cart
app.delete('/user/:userId/items/:productId', verifyToken, async (req, res) => {
    try {
        const { userId, productId } = req.params;
        const user = req.user;
        if (user.uid !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const cartSnapshot = await db.collection('carts')
            .where('userId', '==', userId)
            .limit(1)
            .get();
        if (cartSnapshot.empty) {
            res.status(404).json({ error: 'Cart not found' });
            return;
        }
        const cartDoc = cartSnapshot.docs[0];
        const cart = { id: cartDoc.id, ...cartDoc.data() };
        cart.items = cart.items.filter(item => item.productId !== productId);
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.updatedAt = new Date().toISOString();
        await db.collection('carts').doc(cartDoc.id).update(cart);
        const updatedCart = await db.collection('carts').doc(cartDoc.id).get();
        res.json({ id: updatedCart.id, ...updatedCart.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Clear cart
app.delete('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = req.user;
        if (user.uid !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const cartSnapshot = await db.collection('carts')
            .where('userId', '==', userId)
            .limit(1)
            .get();
        if (cartSnapshot.empty) {
            res.status(404).json({ error: 'Cart not found' });
            return;
        }
        const cartDoc = cartSnapshot.docs[0];
        await db.collection('carts').doc(cartDoc.id).update({
            items: [],
            total: 0,
            updatedAt: new Date().toISOString(),
        });
        res.json({ message: 'Cart cleared successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.cartService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map