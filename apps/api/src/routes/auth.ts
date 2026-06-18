import express, { Request, Response } from 'express';
import { db, auth } from '../services/firebase';
import { authenticateToken } from '../middlewares/auth';
import settings from '../config/settings';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const router = express.Router();

/**
 * @swagger
 * /auth/pin:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate Judge with PIN
 *     description: Verifies a 4-digit temporary PIN against Firestore and returns a Firebase Custom Token for the Judge.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *                 description: The 4-digit PIN assigned to the corner judge
 *                 example: "4829"
 *     responses:
 *       '200':
 *         description: Successfully authenticated. Returns Firebase custom token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 judge:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     tournamentId:
 *                       type: string
 *       '400':
 *         description: Bad Request (Missing PIN)
 *       '401':
 *         description: Unauthorized (Invalid or expired PIN)
 *       '503':
 *         description: Service Unavailable (Firebase Admin not configured)
 */
router.post('/pin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;

    if (!pin) {
      res.status(400).json({ error: 'PIN is required' });
      return;
    }

    if (!db || !auth) {
      res.status(503).json({ error: 'Firebase Admin not configured' });
      return;
    }

    // 1. Verify PIN in Firestore across all judges (Collection Group)
    const snapshot = await db.collectionGroup('judges').where('pin', '==', pin).get();

    if (snapshot.empty) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }

    // Assuming PINs are globally unique
    const judgeDoc = snapshot.docs[0];
    const judgeData = judgeDoc.data();
    const judgeId = judgeDoc.id;

    // Optional: Update status to ONLINE
    await judgeDoc.ref.update({ status: 'ONLINE' });

    // 2. Create Custom Token with Custom Claims
    const customClaims = {
      role: 'judge',
      tournamentId: judgeData.tournamentId,
      judgeId: judgeId,
      judgeName: judgeData.name
    };

    console.log(`[DEBUG] Attempting to create custom token for judge: ${judgeId}`);
    const customToken = await auth.createCustomToken(judgeId, customClaims);
    console.log(`[DEBUG] Custom token created successfully. Length: ${customToken.length}`);

    res.json({ 
      token: customToken,
      judge: {
        id: judgeId,
        name: judgeData.name,
        tournamentId: judgeData.tournamentId
      }
    });

  } catch (error) {
    console.error('Error in /auth/pin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate Admin with email and password
 *     description: Verifies admin credentials via Firebase, checks the 'admins' Firestore collection, and returns a Firebase Custom Token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin@cornerclick.com"
 *               password:
 *                 type: string
 *                 example: "securePassword!"
 *     responses:
 *       '200':
 *         description: Successfully authenticated. Returns Firebase custom token.
 *       '400':
 *         description: Bad Request (Missing email or password)
 *       '401':
 *         description: Unauthorized (Invalid credentials or not an admin)
 *       '503':
 *         description: Service Unavailable (Firebase not configured)
 */
router.post('/admin/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (!db || !auth) {
      res.status(503).json({ error: 'Firebase Admin not configured' });
      return;
    }

    if (!FIREBASE_API_KEY) {
      res.status(503).json({ error: 'Firebase API Key not configured' });
      return;
    }

    // 1. Verify credentials via Firebase Identity Toolkit REST API (server-side)
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      }
    );

    if (!firebaseRes.ok) {
      const errorData = await firebaseRes.json() as any;
      const errorCode = errorData?.error?.message || 'INVALID_CREDENTIALS';
      console.error(`[Auth] Firebase login failed for ${email}: ${errorCode}`);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const firebaseData = await firebaseRes.json() as any;
    const uid = firebaseData.localId;

    // 2. Verify the user is an admin in Firestore
    const adminDoc = await db.collection('admins').doc(uid).get();
    if (!adminDoc.exists) {
      console.warn(`[Auth] Non-admin user attempted admin login: ${uid}`);
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // 3. Create a Custom Token with admin role claim
    const customToken = await auth.createCustomToken(uid, { role: 'admin' });

    res.json({
      token: customToken,
      admin: {
        uid,
        email: firebaseData.email,
        displayName: firebaseData.displayName || null
      }
    });

  } catch (error) {
    console.error('Error in /auth/admin/login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out a judge and set their status to offline
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Firestore not initialized' });
      return;
    }

    const { tournamentId, judgeId } = req.user as any;

    if (tournamentId && judgeId) {
      await db.collection('tournaments').doc(tournamentId).collection('judges').doc(judgeId).update({
        status: 'OFFLINE'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in /auth/logout:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
