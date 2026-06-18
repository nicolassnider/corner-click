import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../services/firebase';

/**
 * Middleware to authenticate requests using Firebase Auth.
 * Expects an Authorization header with a Bearer token.
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  if (!auth) {
    res.status(503).json({ error: 'Service Unavailable: Firebase Auth not configured' });
    return;
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Middleware to restrict access to Admins only.
 * Must be used AFTER authenticateToken.
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!db) {
    res.status(503).json({ error: 'Service Unavailable: Firestore not configured' });
    return;
  }

  try {
    const uid = req.user.uid;
    const adminDoc = await db.collection('admins').doc(uid).get();

    if (adminDoc.exists) {
      // User is an admin
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  } catch (error) {
    console.error('Error verifying admin status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
