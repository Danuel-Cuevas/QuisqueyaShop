import * as functions from 'firebase-functions/v2';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import { PubSub } from '@google-cloud/pubsub';

// Configure emulator settings if not in production
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
}

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const db = admin.firestore();
const pubsub = new PubSub();

export interface Notification {
  id?: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
}

// Middleware to verify token
async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}

// Send notification
app.post('/send', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { userId, type, title, message } = req.body;

    if (!userId || !type || !title || !message) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (user.uid !== userId && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const notification: Notification = {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user notifications
app.get('/user/:userId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = (req as any).user;

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
  } catch (error: any) {
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

export const notificationsService = functions.https.onRequest(app);

