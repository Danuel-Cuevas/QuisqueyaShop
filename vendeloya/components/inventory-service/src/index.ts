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

export interface InventoryItem {
  productId: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
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

// Get inventory for product
app.get('/product/:productId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const doc = await db.collection('inventory').doc(productId).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Inventory not found' });
      return;
    }

    const data = doc.data()!;
    res.json({ productId: doc.id, ...data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all inventory
app.get('/products', async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('inventory').get();
    const items = snapshot.docs.map(doc => ({
      productId: doc.id,
      ...doc.data(),
    }));

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory (admin only)
app.put('/product/:productId', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { quantity, lowStockThreshold } = req.body;

    const updateData: any = {
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
      const currentData = doc.data()!;
      updateData.reserved = currentData.reserved || 0;
      updateData.available = (updateData.quantity || currentData.quantity) - updateData.reserved;
      await docRef.update(updateData);
    } else {
      // Create new inventory entry
      const newInventory: InventoryItem = {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reserve inventory
app.post('/reserve', async (req: Request, res: Response): Promise<void> => {
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

    const inventory = doc.data()! as InventoryItem;
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Release reserved inventory
app.post('/release', async (req: Request, res: Response): Promise<void> => {
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

    const inventory = doc.data()! as InventoryItem;

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Consume inventory (reduce quantity and reserved)
app.post('/consume', async (req: Request, res: Response): Promise<void> => {
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

    const inventory = doc.data()! as InventoryItem;

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
    const updatedData = updatedDoc.data()!;
    updatedData.available = updatedData.quantity - updatedData.reserved;

    await docRef.update({ available: updatedData.available });

    const finalDoc = await docRef.get();
    res.json({ productId: finalDoc.id, ...finalDoc.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock items
app.get('/low-stock', async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('inventory').get();
    const items = snapshot.docs
      .map(doc => ({ productId: doc.id, ...doc.data() } as InventoryItem))
      .filter(item => item.available <= item.lowStockThreshold);

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const inventoryService = functions.https.onRequest(app);

