import * as functions from 'firebase-functions/v2';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';

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

export interface Invoice {
  id?: string;
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  invoiceNumber: string;
  issuedAt?: string;
  paidAt?: string;
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

// Generate invoice from order
app.post('/generate', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ error: 'Order ID is required' });
      return;
    }

    // Get order
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

    // Check if invoice already exists
    const existingInvoice = await db.collection('invoices')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (!existingInvoice.empty) {
      const invoiceDoc = existingInvoice.docs[0];
      res.json({ id: invoiceDoc.id, ...invoiceDoc.data() });
      return;
    }

    // Generate invoice number
    const invoiceCount = await db.collection('invoices').count().get();
    const invoiceNumber = `INV-${Date.now()}-${invoiceCount.data().count + 1}`;

    // Calculate totals
    const items = order.items || [];
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    // Get product names
    const productIds = items.map((item: any) => item.productId);
    const productDocs = await Promise.all(
      productIds.map((id: string) => db.collection('products').doc(id).get())
    );

    const invoiceItems = items.map((item: any, index: number) => {
      const productDoc = productDocs[index];
      const product = productDoc.exists ? productDoc.data() : { name: 'Unknown Product' };
      return {
        productId: item.productId,
        productName: product.name as string,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity,
      };
    });

    const invoice: Invoice = {
      orderId,
      userId: order.userId,
      items: invoiceItems,
      subtotal,
      tax,
      total,
      currency: order.currency || 'USD',
      status: 'draft',
      invoiceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const invoiceRef = await db.collection('invoices').add(invoice);
    const invoiceDoc = await invoiceRef.get();

    res.status(201).json({ id: invoiceDoc.id, ...invoiceDoc.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Issue invoice
app.post('/:invoiceId/issue', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const user = (req as any).user;

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = invoiceDoc.data()!;
    if (invoice.status !== 'draft') {
      res.status(400).json({ error: 'Invoice is not in draft status' });
      return;
    }

    await db.collection('invoices').doc(invoiceId).update({
      status: 'issued',
      issuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updatedInvoice = await db.collection('invoices').doc(invoiceId).get();
    res.json({ id: updatedInvoice.id, ...updatedInvoice.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark invoice as paid
app.post('/:invoiceId/pay', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const user = (req as any).user;

    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = invoiceDoc.data()!;
    if (invoice.userId !== user.uid && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (invoice.status !== 'issued') {
      res.status(400).json({ error: 'Invoice must be issued before payment' });
      return;
    }

    await db.collection('invoices').doc(invoiceId).update({
      status: 'paid',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updatedInvoice = await db.collection('invoices').doc(invoiceId).get();
    res.json({ id: updatedInvoice.id, ...updatedInvoice.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
app.get('/:invoiceId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const user = (req as any).user;

    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = invoiceDoc.data()!;
    if (invoice.userId !== user.uid && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ id: invoiceDoc.id, ...invoice });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoices by user
app.get('/user/:userId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = (req as any).user;

    if (user.uid !== userId && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const invoicesSnapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const invoices = invoicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const billingService = functions.https.onRequest(app);

