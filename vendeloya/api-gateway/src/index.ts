import * as functions from 'firebase-functions/v2';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Configure emulator settings if not in production
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
}

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Service URLs (in production, use environment variables)
const SERVICES = {
  users: process.env.USERS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/usersService',
  catalog: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/catalogService',
  cart: process.env.CART_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/cartService',
  orders: process.env.ORDERS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/ordersService',
  payments: process.env.PAYMENTS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/paymentsService',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/inventoryService',
  billing: process.env.BILLING_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/billingService',
  notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/notificationsService',
  audit: process.env.AUDIT_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/auditService',
  reports: process.env.REPORTS_SERVICE_URL || 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/reportsService',
};

// Middleware to verify Firebase ID token
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

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy routes
app.use('/users', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.users}${req.path}`,
      data: req.body,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/catalog', async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.catalog}${req.path}`,
      data: req.body,
      params: req.query,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/cart', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.cart}${req.path}`,
      data: req.body,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/orders', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.orders}${req.path}`,
      data: req.body,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/payments', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.payments}${req.path}`,
      data: req.body,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/inventory', async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.inventory}${req.path}`,
      data: req.body,
      params: req.query,
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/billing', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.billing}${req.path}`,
      data: req.body,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/notifications', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.notifications}${req.path}`,
      data: req.body,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/audit', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.audit}${req.path}`,
      data: req.body,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.use('/reports', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get service path (remove /reports prefix if present)
    const servicePath = req.path.startsWith('/') ? req.path : `/${req.path}`;
    
    // Only send body for POST, PUT, PATCH requests
    const requestConfig: any = {
      method: req.method,
      url: `${SERVICES.reports}${servicePath}`,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    };
    
    // Only include data for methods that support body
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      requestConfig.data = req.body;
    }
    
    // Include query parameters
    if (Object.keys(req.query).length > 0) {
      requestConfig.params = req.query;
    }
    
    const response = await axios(requestConfig);
    res.json(response.data);
  } catch (error: any) {
    console.error('Reports service error:', error.message, error.response?.status, error.response?.data);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message 
    });
  }
});

export const apiGateway = functions.https.onRequest(app);

