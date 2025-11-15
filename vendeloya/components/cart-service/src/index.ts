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

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  id?: string;
  userId: string;
  items: CartItem[];
  total: number;
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

// Get user cart
app.get('/user/:userId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = (req as any).user;

    if (user.uid !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const cartSnapshot = await db.collection('carts')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (cartSnapshot.empty) {
      // Create empty cart
      const newCart: Cart = {
        userId,
        items: [],
        total: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await db.collection('carts').add(newCart);
      const doc = await docRef.get();
      res.json({ id: doc.id, ...doc.data() });
      return;
    }

    const cartDoc = cartSnapshot.docs[0];
    res.json({ id: cartDoc.id, ...cartDoc.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add item to cart
app.post('/user/:userId/items', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = (req as any).user;
    const { productId, quantity } = req.body;

    if (user.uid !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (!productId || !quantity || quantity <= 0) {
      res.status(400).json({ error: 'Invalid productId or quantity' });
      return;
    }

    // Get product to get price
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = productDoc.data()!;
    const price = product.price as number;

    // Get or create cart
    const cartSnapshot = await db.collection('carts')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    let cartId: string;
    let cart: Cart;

    if (cartSnapshot.empty) {
      cart = {
        userId,
        items: [],
        total: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await db.collection('carts').add(cart);
      cartId = docRef.id;
    } else {
      const cartDoc = cartSnapshot.docs[0];
      cartId = cartDoc.id;
      cart = { id: cartDoc.id, ...cartDoc.data() } as Cart;
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, price });
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date().toISOString();

    await db.collection('carts').doc(cartId).update(cart as admin.firestore.UpdateData<Cart>);

    const updatedCart = await db.collection('carts').doc(cartId).get();
    res.json({ id: updatedCart.id, ...updatedCart.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update item quantity
app.put('/user/:userId/items/:productId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, productId } = req.params;
    const user = (req as any).user;
    const { quantity } = req.body;

    if (user.uid !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (!quantity || quantity <= 0) {
      res.status(400).json({ error: 'Invalid quantity' });
      return;
    }

    const cartSnapshot = await db.collection('carts')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (cartSnapshot.empty) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }

    const cartDoc = cartSnapshot.docs[0];
    const cart = { id: cartDoc.id, ...cartDoc.data() } as Cart;

    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex < 0) {
      res.status(404).json({ error: 'Item not found in cart' });
      return;
    }

    cart.items[itemIndex].quantity = quantity;
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date().toISOString();

    await db.collection('carts').doc(cartDoc.id).update(cart as admin.firestore.UpdateData<Cart>);

    const updatedCart = await db.collection('carts').doc(cartDoc.id).get();
    res.json({ id: updatedCart.id, ...updatedCart.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove item from cart
app.delete('/user/:userId/items/:productId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, productId } = req.params;
    const user = (req as any).user;

    if (user.uid !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const cartSnapshot = await db.collection('carts')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (cartSnapshot.empty) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }

    const cartDoc = cartSnapshot.docs[0];
    const cart = { id: cartDoc.id, ...cartDoc.data() } as Cart;

    cart.items = cart.items.filter(item => item.productId !== productId);
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date().toISOString();

    await db.collection('carts').doc(cartDoc.id).update(cart as admin.firestore.UpdateData<Cart>);

    const updatedCart = await db.collection('carts').doc(cartDoc.id).get();
    res.json({ id: updatedCart.id, ...updatedCart.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear cart
app.delete('/user/:userId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = (req as any).user;

    if (user.uid !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const cartSnapshot = await db.collection('carts')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (cartSnapshot.empty) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }

    const cartDoc = cartSnapshot.docs[0];
    await db.collection('carts').doc(cartDoc.id).update({
      items: [],
      total: 0,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Cart cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const cartService = functions.https.onRequest(app);

