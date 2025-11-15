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
exports.catalogService = void 0;
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
// Middleware to verify admin
async function verifyAdmin(req, res, next) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        if (decodedToken.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        req.user = decodedToken;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
}
// Get all products
app.get('/products', async (req, res) => {
    try {
        const { category, limit, offset } = req.query;
        let query = db.collection('products');
        if (category) {
            query = query.where('category', '==', category);
        }
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        if (offset) {
            query = query.offset(parseInt(offset));
        }
        const snapshot = await query.get();
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get product by ID
app.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('products').doc(id).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json({ id: doc.id, ...doc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create product (admin only)
app.post('/products', verifyAdmin, async (req, res) => {
    try {
        const { name, description, price, category, imageUrl, stock, sku } = req.body;
        if (!name || !description || !price || !category || !sku) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const product = {
            name,
            description,
            price: parseFloat(price),
            category,
            imageUrl: imageUrl || '',
            stock: parseInt(stock) || 0,
            sku,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const docRef = await db.collection('products').add(product);
        const doc = await docRef.get();
        res.status(201).json({ id: doc.id, ...doc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update product (admin only)
app.put('/products/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {
            updatedAt: new Date().toISOString(),
        };
        const allowedFields = ['name', 'description', 'price', 'category', 'imageUrl', 'stock', 'sku'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        await db.collection('products').doc(id).update(updateData);
        const doc = await db.collection('products').doc(id).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json({ id: doc.id, ...doc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete product (admin only)
app.delete('/products/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('products').doc(id).delete();
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get products by category
app.get('/categories/:category/products', async (req, res) => {
    try {
        const { category } = req.params;
        const snapshot = await db.collection('products')
            .where('category', '==', category)
            .get();
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.catalogService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map