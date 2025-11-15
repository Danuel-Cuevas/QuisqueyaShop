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

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// Middleware to verify token and extract user
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

// Create user profile
app.post('/register', async (req: Request, res: Response): Promise<void> => {
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
    const userProfile: UserProfile = {
      uid: userRecord.uid,
      email: userRecord.email!,
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
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user profile
app.get('/profile/:uid', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const user = (req as any).user;

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/profile/:uid', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const user = (req as any).user;
    const { displayName, photoURL } = req.body;

    if (user.uid !== uid && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updateData: any = {
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
      } else if (photoURL === null) {
        // Remove photoURL from Auth if explicitly set to null
        await admin.auth().updateUser(uid, { photoURL: null });
      }
      // If it's a data URL, we only store it in Firestore, not in Auth
    }

    await db.collection('users').doc(uid).update(updateData);

    const userDoc = await db.collection('users').doc(uid).get();
    res.json(userDoc.data());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (admin only)
app.put('/role/:uid', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all users (admin only)
app.get('/users', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => doc.data());

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/:uid', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { uid } = req.params;

    if (user.uid !== uid && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await admin.auth().deleteUser(uid);
    await db.collection('users').doc(uid).delete();

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const usersService = functions.https.onRequest(app);

