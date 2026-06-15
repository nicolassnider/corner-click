import express, { Request, Response } from 'express';
import { db, auth } from '../services/firebase';

const router = express.Router();

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

    const customToken = await auth.createCustomToken(judgeId, customClaims);

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

export default router;
