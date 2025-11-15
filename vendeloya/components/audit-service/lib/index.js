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
exports.auditService = void 0;
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
// Create audit log
app.post('/log', async (req, res) => {
    try {
        const { userId, action, resource, resourceId, details, ipAddress, userAgent } = req.body;
        if (!action || !resource) {
            res.status(400).json({ error: 'Action and resource are required' });
            return;
        }
        const auditLog = {
            userId: userId || null,
            action,
            resource,
            resourceId: resourceId || null,
            details: details || null,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            timestamp: new Date().toISOString(),
        };
        const logRef = await db.collection('audit_logs').add(auditLog);
        const logDoc = await logRef.get();
        res.status(201).json({ id: logDoc.id, ...logDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get audit logs (admin only)
app.get('/logs', verifyAdmin, async (req, res) => {
    try {
        const { userId, resource, action, startDate, endDate, limit } = req.query;
        let query = db.collection('audit_logs');
        if (userId) {
            query = query.where('userId', '==', userId);
        }
        if (resource) {
            query = query.where('resource', '==', resource);
        }
        if (action) {
            query = query.where('action', '==', action);
        }
        if (startDate) {
            query = query.where('timestamp', '>=', startDate);
        }
        if (endDate) {
            query = query.where('timestamp', '<=', endDate);
        }
        query = query.orderBy('timestamp', 'desc');
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        else {
            query = query.limit(100);
        }
        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get audit log by ID (admin only)
app.get('/logs/:logId', verifyAdmin, async (req, res) => {
    try {
        const { logId } = req.params;
        const logDoc = await db.collection('audit_logs').doc(logId).get();
        if (!logDoc.exists) {
            res.status(404).json({ error: 'Audit log not found' });
            return;
        }
        res.json({ id: logDoc.id, ...logDoc.data() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get audit logs for a specific resource
app.get('/resource/:resource/:resourceId', verifyAdmin, async (req, res) => {
    try {
        const { resource, resourceId } = req.params;
        const snapshot = await db.collection('audit_logs')
            .where('resource', '==', resource)
            .where('resourceId', '==', resourceId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.auditService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map