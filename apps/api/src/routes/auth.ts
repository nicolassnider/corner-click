import express, { Request, Response } from 'express';
import { db, auth } from '../services/firebase';

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
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    const decodedToken = await auth.verifyIdToken(token);
    const { tournamentId, judgeId } = decodedToken;

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
