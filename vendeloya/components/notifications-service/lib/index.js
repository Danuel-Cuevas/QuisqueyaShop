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
exports.notificationsService = void 0;
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
// Send notification
app.post('/send', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const { userId, type, title, message } = req.body;
        if (!userId || !type || !title || !message) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        if (user.uid !== userId && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const notification = {
            userId,
            type,
            title,
            message,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        const notificationRef = await db.collection('notifications').add(notification);
        const notificationId = notificationRef.id;
        // Publish to Pub/Sub for async processing
        const topic = pubsub.topic('notifications');
        await topic.publishMessage({
            json: {
                notificationId,
                userId,
                type,
                title,
                message,
            },
        });
        res.status(202).json({ id: notificationId, ...notification });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get user notifications
app.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = req.user;
        if (user.uid !== userId && user.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const notificationsSnapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const notifications = notificationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Cloud Function to process notifications from Pub/Sub
// Note: Pub/Sub triggers in v2 use different syntax - commented out for now
/*
export const processNotification = functions.pubsub.topic('notifications').onMessage(async (message: any) => {
  const data = message.json;
  const { notificationId, userId } = data;

  try {
    // Simulate sending notification
    // In production, integrate with email service (SendGrid, SES) or SMS service (Twilio)
    const success = Math.random() > 0.1; // 90% success rate

    const status = success ? 'sent' : 'failed';
    const sentAt = success ? new Date().toISOString() : undefined;

    await db.collection('notifications').doc(notificationId).update({
      status,
      sentAt,
    });

    functions.logger.info(`Notification ${notificationId} ${status} to user ${userId}`);
  } catch (error) {
    functions.logger.error(`Error processing notification ${notificationId}:`, error);
    await db.collection('notifications').doc(notificationId).update({
      status: 'failed',
    });
  }
});
*/
// Firestore trigger: send notification when order is created
// Note: Firestore triggers in v2 use different syntax - commented out for now
/*
export const onOrderCreated = functions.firestore.document('orders/{orderId}').onCreate(async (snap: any, context: any) => {
    const order = snap.data();
    const userId = order.userId;

    const notification: Notification = {
      userId,
      type: 'email',
      title: 'Order Confirmed',
      message: `Your order #${context.params.orderId} has been confirmed.`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const notificationRef = await db.collection('notifications').add(notification);

    // Publish to Pub/Sub
    const topic = pubsub.topic('notifications');
    await topic.publishMessage({
      json: {
        notificationId: notificationRef.id,
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      },
    });
  });
*/
exports.notificationsService = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map