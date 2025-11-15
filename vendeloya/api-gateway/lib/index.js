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
exports.apiGateway = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
// Configure emulator settings if not in production
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
}
admin.initializeApp();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
// Service URLs (in production, use environment variables)
const SERVICES = {
    users: process.env.USERS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/usersService',
    catalog: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/catalogService',
    cart: process.env.CART_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/cartService',
    orders: process.env.ORDERS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/ordersService',
    payments: process.env.PAYMENTS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/paymentsService',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/inventoryService',
    billing: process.env.BILLING_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/billingService',
    notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/notificationsService',
    audit: process.env.AUDIT_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/auditService',
    reports: process.env.REPORTS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/reportsService',
};
// Middleware to verify Firebase ID token
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
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Proxy routes
app.use('/users', verifyToken, async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.users}${req.path}`,
            data: req.body,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/catalog', async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.catalog}${req.path}`,
            data: req.body,
            params: req.query,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/cart', verifyToken, async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.cart}${req.path}`,
            data: req.body,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/orders', verifyToken, async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.orders}${req.path}`,
            data: req.body,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/payments', verifyToken, async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.payments}${req.path}`,
            data: req.body,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/inventory', async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.inventory}${req.path}`,
            data: req.body,
            params: req.query,
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/billing', verifyToken, async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.billing}${req.path}`,
            data: req.body,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/notifications', verifyToken, async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.notifications}${req.path}`,
            data: req.body,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/audit', verifyToken, async (req, res) => {
    try {
        const response = await (0, axios_1.default)({
            method: req.method,
            url: `${SERVICES.audit}${req.path}`,
            data: req.body,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});
app.use('/reports', verifyToken, async (req, res) => {
    try {
        // Get service path (remove /reports prefix if present)
        const servicePath = req.path.startsWith('/') ? req.path : `/${req.path}`;
        // Only send body for POST, PUT, PATCH requests
        const requestConfig = {
            method: req.method,
            url: `${SERVICES.reports}${servicePath}`,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        };
        // Only include data for methods that support body
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            requestConfig.data = req.body;
        }
        // Include query parameters
        if (Object.keys(req.query).length > 0) {
            requestConfig.params = req.query;
        }
        const response = await (0, axios_1.default)(requestConfig);
        res.json(response.data);
    }
    catch (error) {
        console.error('Reports service error:', error.message, error.response?.status, error.response?.data);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
});
exports.apiGateway = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map