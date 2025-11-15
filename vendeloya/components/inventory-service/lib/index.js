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
exports.inventoryService = void 0;
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
// Get inventory for product
app.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const doc = await db.collection('inventory').doc(productId).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Inventory not found' });
            return;
        }
        const data = doc.data();
        res.json({ productId: doc.id, ...data });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get all inventory
app.get('/products', async (_req, res) => {
    try {
        const snapshot = await db.collection('inventory').get();
        const items = snapshot.docs.map(doc => ({
            productId: doc.id,
            ...doc.data(),
        }));
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update inventory (admin only)
app.put('/product/:productId', verifyAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity, lowStockThreshold } = req.body;
        const updateData = {
            updatedAt: new Date().toISOString(),
        };
        if (quantity !== undefined) {
            updateData.quantity = parseInt(quantity);
            updateData.available = updateData.quantity - (updateData.reserved || 0);
        }
        if (lowStockThreshold !== undefined) {
            updateData.lowStockThreshold = parseInt(lowStockThreshold);
        }
        const docRef = db.collection('inventory').doc(productId);
        const doc = await docRef.get();
        if (doc.exists) {
            const currentData = doc.data();
            updateData.reserved = currentData.reserved || 0;
            updateData.available = (updateData.quantity || currentData.quantity) - updateData.reserved;
            await docRef.update(updateData);
        }
        else {
            // Create new inventory entry
            const newInventory = {
                productId,
                quantity: parseInt(quantity) || 0,
                reserved: 0,
                available: parseInt(quantity) || 0,
                lowStockThreshold: parseInt(lowStockThreshold) || 10,
                updatedAt: new Date().toISOString(),
            };
            await docRef.set(newInventory);
        }
        const updatedDoc = await docRef.get();
        res.json({ productId: updatedDoc.id, ...updatedDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Reserve inventory
app.post('/reserve', async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        if (!productId || !quantity || quantity <= 0) {
            res.status(400).json({ error: 'Invalid productId or quantity' });
            return;
        }
        const docRef = db.collection('inventory').doc(productId);
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Inventory not found' });
            return;
        }
        const inventory = doc.data();
        const available = inventory.quantity - inventory.reserved;
        if (available < quantity) {
            res.status(400).json({ error: 'Insufficient inventory' });
            return;
        }
        await docRef.update({
            reserved: admin.firestore.FieldValue.increment(quantity),
            available: available - quantity,
            updatedAt: new Date().toISOString(),
        });
        const updatedDoc = await docRef.get();
        res.json({ productId: updatedDoc.id, ...updatedDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Release reserved inventory
app.post('/release', async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        if (!productId || !quantity || quantity <= 0) {
            res.status(400).json({ error: 'Invalid productId or quantity' });
            return;
        }
        const docRef = db.collection('inventory').doc(productId);
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Inventory not found' });
            return;
        }
        const inventory = doc.data();
        if (inventory.reserved < quantity) {
            res.status(400).json({ error: 'Cannot release more than reserved' });
            return;
        }
        await docRef.update({
            reserved: admin.firestore.FieldValue.increment(-quantity),
            available: admin.firestore.FieldValue.increment(quantity),
            updatedAt: new Date().toISOString(),
        });
        const updatedDoc = await docRef.get();
        res.json({ productId: updatedDoc.id, ...updatedDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Consume inventory (reduce quantity and reserved)
app.post('/consume', async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        if (!productId || !quantity || quantity <= 0) {
            res.status(400).json({ error: 'Invalid productId or quantity' });
            return;
        }
        const docRef = db.collection('inventory').doc(productId);
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Inventory not found' });
            return;
        }
        const inventory = doc.data();
        if (inventory.reserved < quantity) {
            res.status(400).json({ error: 'Insufficient reserved inventory' });
            return;
        }
        await docRef.update({
            quantity: admin.firestore.FieldValue.increment(-quantity),
            reserved: admin.firestore.FieldValue.increment(-quantity),
            updatedAt: new Date().toISOString(),
        });
        const updatedDoc = await docRef.get();
        const updatedData = updatedDoc.data();
        updatedData.available = updatedData.quantity - updatedData.reserved;
        await docRef.update({ available: updatedData.available });
        const finalDoc = await docRef.get();
        res.json({ productId: finalDoc.id, ...finalDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get low stock items
app.get('/low-stock', async (_req, res) => {
    try {
        const snapshot = await db.collection('inventory').get();
        const items = snapshot.docs
            .map(doc => ({ productId: doc.id, ...doc.data() }))
            .filter(item => item.available <= item.lowStockThreshold);
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.inventoryService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map