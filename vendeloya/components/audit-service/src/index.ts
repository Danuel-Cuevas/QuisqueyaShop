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

export interface AuditLog {
  id?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
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

// Create audit log
app.post('/log', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, action, resource, resourceId, details, ipAddress, userAgent } = req.body;

    if (!action || !resource) {
      res.status(400).json({ error: 'Action and resource are required' });
      return;
    }

    const auditLog: AuditLog = {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs (admin only)
app.get('/logs', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, resource, action, startDate, endDate, limit } = req.query;

    let query: admin.firestore.Query = db.collection('audit_logs');

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
      query = query.limit(parseInt(limit as string));
    } else {
      query = query.limit(100);
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit log by ID (admin only)
app.get('/logs/:logId', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { logId } = req.params;
    const logDoc = await db.collection('audit_logs').doc(logId).get();

    if (!logDoc.exists) {
      res.status(404).json({ error: 'Audit log not found' });
      return;
    }

    res.json({ id: logDoc.id, ...logDoc.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs for a specific resource
app.get('/resource/:resource/:resourceId', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const auditService = functions.https.onRequest(app);

