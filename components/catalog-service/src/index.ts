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

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  stock: number;
  sku: string;
  createdAt: string;
  updatedAt: string;
}

// Middleware to verify admin
async function verifyAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}

// Get all products
app.get('/products', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, limit, offset } = req.query;
    let query: admin.firestore.Query = db.collection('products');

    if (category) {
      query = query.where('category', '==', category);
    }

    if (limit) {
      query = query.limit(parseInt(limit as string));
    }

    if (offset) {
      query = query.offset(parseInt(offset as string));
    }

    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
app.get('/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (admin only)
app.post('/products', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, category, imageUrl, stock, sku } = req.body;

    if (!name || !description || !price || !category || !sku) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const product: Product = {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (admin only)
app.put('/products/:id', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: any = {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (admin only)
app.delete('/products/:id', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.collection('products').doc(id).delete();
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get products by category
app.get('/categories/:category/products', async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const catalogService = functions.https.onRequest(app);

