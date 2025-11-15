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
exports.usersService = void 0;
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
// Middleware to verify token and extract user
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
// Create user profile
app.post('/register', async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
        });
        // Set default role
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'user' });
        // Create user profile in Firestore
        const userProfile = {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: displayName || userRecord.displayName || '',
            role: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await db.collection('users').doc(userRecord.uid).set(userProfile);
        res.status(201).json({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userProfile.displayName,
            role: userProfile.role,
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Get user profile
app.get('/profile/:uid', verifyToken, async (req, res) => {
    try {
        const { uid } = req.params;
        const user = req.user;
        if (user.uid !== uid && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(userDoc.data());
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update user profile
app.put('/profile/:uid', verifyToken, async (req, res) => {
    try {
        const { uid } = req.params;
        const user = req.user;
        const { displayName, photoURL } = req.body;
        if (user.uid !== uid && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const updateData = {
            updatedAt: new Date().toISOString(),
        };
        if (displayName) {
            updateData.displayName = displayName;
            await admin.auth().updateUser(uid, { displayName });
        }
        if (photoURL !== undefined) {
            updateData.photoURL = photoURL;
            // Only update Firebase Auth photoURL if it's a valid HTTP/HTTPS URL
            // Data URLs (base64) should only be stored in Firestore
            if (photoURL && (photoURL.startsWith('http://') || photoURL.startsWith('https://'))) {
                await admin.auth().updateUser(uid, { photoURL });
            }
            else if (photoURL === null) {
                // Remove photoURL from Auth if explicitly set to null
                await admin.auth().updateUser(uid, { photoURL: null });
            }
            // If it's a data URL, we only store it in Firestore, not in Auth
        }
        await db.collection('users').doc(uid).update(updateData);
        const userDoc = await db.collection('users').doc(uid).get();
        res.json(userDoc.data());
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update user role (admin only)
app.put('/role/:uid', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const { uid } = req.params;
        const { role } = req.body;
        if (user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (!['user', 'admin'].includes(role)) {
            res.status(400).json({ error: 'Invalid role' });
            return;
        }
        await admin.auth().setCustomUserClaims(uid, { role });
        await db.collection('users').doc(uid).update({
            role,
            updatedAt: new Date().toISOString(),
        });
        res.json({ message: 'Role updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// List all users (admin only)
app.get('/users', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => doc.data());
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete user
app.delete('/:uid', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const { uid } = req.params;
        if (user.uid !== uid && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        await admin.auth().deleteUser(uid);
        await db.collection('users').doc(uid).delete();
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.usersService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map