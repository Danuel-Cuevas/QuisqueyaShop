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
exports.reportsService = void 0;
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
// Generate sales report
app.post('/sales', verifyAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const user = req.user;
        if (!startDate || !endDate) {
            res.status(400).json({ error: 'Start date and end date are required' });
            return;
        }
        // Get orders in date range
        // Note: Firestore requires an index for range queries on the same field
        // For now, we'll get all orders and filter in memory
        const ordersSnapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .get();
        // Convert dates to Date objects for proper comparison
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        // Filter by date range and exclude cancelled orders
        const ordersInRange = ordersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((order) => {
            if (!order.createdAt)
                return false;
            const orderDate = new Date(order.createdAt);
            // Check if order date is within range (inclusive) and not cancelled
            return orderDate >= startDateObj && orderDate <= endDateObj && order.status !== 'cancelled';
        });
        const orders = ordersInRange;
        const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
        // Group by status
        const ordersByStatus = orders.reduce((acc, order) => {
            const status = order.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        const report = {
            type: 'sales',
            period: 'monthly',
            startDate,
            endDate,
            data: {
                totalSales,
                totalOrders,
                averageOrderValue,
                ordersByStatus,
                orders: orders.map((order) => ({
                    orderId: order.id,
                    userId: order.userId,
                    total: order.total,
                    status: order.status,
                    createdAt: order.createdAt,
                })),
            },
            generatedAt: new Date().toISOString(),
            generatedBy: user.uid,
        };
        const reportRef = await db.collection('reports').add(report);
        const reportDoc = await reportRef.get();
        res.status(201).json({ id: reportDoc.id, ...reportDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Generate inventory report
app.post('/inventory', verifyAdmin, async (req, res) => {
    try {
        const user = req.user;
        // Try inventory collection first, fallback to products
        let inventorySnapshot;
        let useInventoryCollection = false;
        try {
            inventorySnapshot = await db.collection('inventory').get();
            if (inventorySnapshot.docs.length > 0) {
                useInventoryCollection = true;
            }
        }
        catch (error) {
            // Inventory collection doesn't exist or is empty
        }
        let inventory = [];
        let totalProducts = 0;
        let totalStock = 0;
        let totalReserved = 0;
        let totalAvailable = 0;
        let lowStockItems = [];
        const lowStockThreshold = 10;
        if (useInventoryCollection && inventorySnapshot) {
            inventory = inventorySnapshot.docs.map(doc => ({
                productId: doc.id,
                ...doc.data(),
            }));
            totalProducts = inventory.length;
            totalStock = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
            totalReserved = inventory.reduce((sum, item) => sum + (item.reserved || 0), 0);
            totalAvailable = inventory.reduce((sum, item) => sum + (item.available || 0), 0);
            lowStockItems = inventory.filter((item) => {
                const available = item.available || 0;
                const threshold = item.lowStockThreshold || lowStockThreshold;
                return available <= threshold;
            });
        }
        else {
            // Use products collection
            const productsSnapshot = await db.collection('products').get();
            const products = productsSnapshot.docs.map(doc => ({
                productId: doc.id,
                name: doc.data().name,
                stock: doc.data().stock || 0,
            }));
            totalProducts = products.length;
            totalStock = products.reduce((sum, item) => sum + (item.stock || 0), 0);
            totalReserved = 0;
            totalAvailable = totalStock;
            lowStockItems = products.filter((item) => {
                const stock = item.stock || 0;
                return stock <= lowStockThreshold;
            });
        }
        const report = {
            type: 'inventory',
            period: 'monthly',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            data: {
                totalProducts,
                totalStock,
                totalReserved,
                totalAvailable,
                lowStockCount: lowStockItems.length,
                lowStockItems: lowStockItems.map((item) => ({
                    productId: item.productId,
                    productName: item.name || item.productName || 'Sin nombre',
                    available: item.available || item.stock || 0,
                    threshold: item.lowStockThreshold || lowStockThreshold,
                })),
            },
            generatedAt: new Date().toISOString(),
            generatedBy: user.uid,
        };
        const reportRef = await db.collection('reports').add(report);
        const reportDoc = await reportRef.get();
        res.status(201).json({ id: reportDoc.id, ...reportDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Generate products report
app.post('/products', verifyAdmin, async (req, res) => {
    try {
        const user = req.user;
        const productsSnapshot = await db.collection('products').get();
        const products = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        const totalProducts = products.length;
        const productsByCategory = products.reduce((acc, product) => {
            const category = product.category || 'uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        const report = {
            type: 'products',
            period: 'monthly',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            data: {
                totalProducts,
                productsByCategory,
                products: products.map((product) => ({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    stock: product.stock,
                })),
            },
            generatedAt: new Date().toISOString(),
            generatedBy: user.uid,
        };
        const reportRef = await db.collection('reports').add(report);
        const reportDoc = await reportRef.get();
        res.status(201).json({ id: reportDoc.id, ...reportDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get report by ID
app.get('/:reportId', verifyAdmin, async (req, res) => {
    try {
        const { reportId } = req.params;
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (!reportDoc.exists) {
            res.status(404).json({ error: 'Report not found' });
            return;
        }
        res.json({ id: reportDoc.id, ...reportDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// List all reports
app.get('/', verifyAdmin, async (req, res) => {
    try {
        const { type, limit } = req.query;
        let query = db.collection('reports');
        if (type) {
            query = query.where('type', '==', type);
        }
        query = query.orderBy('generatedAt', 'desc');
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        else {
            query = query.limit(50);
        }
        const snapshot = await query.get();
        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete report
app.delete('/:reportId', verifyAdmin, async (req, res) => {
    try {
        const { reportId } = req.params;
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (!reportDoc.exists) {
            res.status(404).json({ error: 'Report not found' });
            return;
        }
        await db.collection('reports').doc(reportId).delete();
        res.status(200).json({ message: 'Report deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.reportsService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map