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

export interface Payment {
  id?: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
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

// Process payment
app.post('/process', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { orderId, amount, currency, paymentMethod } = req.body;

    if (!orderId || !amount || !currency || !paymentMethod) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify order exists
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = orderDoc.data()!;
    if (order.userId !== user.uid) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Create payment record
    const payment: Payment = {
      orderId,
      userId: user.uid,
      amount: parseFloat(amount),
      currency,
      paymentMethod,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const paymentRef = await db.collection('payments').add(payment);
    const paymentId = paymentRef.id;

    // Simulate payment processing (in production, integrate with payment gateway)
    setTimeout(async () => {
      const success = Math.random() > 0.1; // 90% success rate for demo
      const status = success ? 'completed' : 'failed';
      const transactionId = success ? `TXN-${Date.now()}` : undefined;

      await db.collection('payments').doc(paymentId).update({
        status,
        transactionId,
        updatedAt: new Date().toISOString(),
      });

      // Publish payment result to Pub/Sub
      const topic = pubsub.topic('payment-processed');
      await topic.publishMessage({
        json: {
          paymentId,
          orderId,
          status,
          transactionId,
        },
      });

      // Update order status
      if (success) {
        await db.collection('orders').doc(orderId).update({
          status: 'paid',
          updatedAt: new Date().toISOString(),
        });
      }
    }, 2000);

    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    res.status(202).json({ id: paymentDoc.id, ...paymentDoc.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment by ID
app.get('/:paymentId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const user = (req as any).user;

    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const payment = paymentDoc.data()!;
    if (payment.userId !== user.uid && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ id: paymentDoc.id, ...payment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get payments by order
app.get('/order/:orderId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const user = (req as any).user;

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = orderDoc.data()!;
    if (order.userId !== user.uid && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const paymentsSnapshot = await db.collection('payments')
      .where('orderId', '==', orderId)
      .get();

    const payments = paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Refund payment (admin only)
app.post('/:paymentId/refund', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const user = (req as any).user;

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const payment = paymentDoc.data()!;
    if (payment.status !== 'completed') {
      res.status(400).json({ error: 'Payment must be completed to refund' });
      return;
    }

    await db.collection('payments').doc(paymentId).update({
      status: 'refunded',
      updatedAt: new Date().toISOString(),
    });

    // Publish refund event
    const topic = pubsub.topic('payment-refunded');
    await topic.publishMessage({
      json: {
        paymentId,
        orderId: payment.orderId,
      },
    });

    const updatedPayment = await db.collection('payments').doc(paymentId).get();
    res.json({ id: updatedPayment.id, ...updatedPayment.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const paymentsService = functions.https.onRequest(app);

