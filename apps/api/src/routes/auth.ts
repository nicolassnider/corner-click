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

    const pinRef = db.collection('pins').doc(pin);
    const pinDoc = await pinRef.get();

    if (!pinDoc.exists) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }

    const pinData = pinDoc.data();
    
    if (pinData?.expiresAt && pinData.expiresAt.toDate() < new Date()) {
      res.status(401).json({ error: 'PIN has expired' });
      return;
    }

    const uid = `judge_${pinData?.tournamentId}_${pinData?.ringId}_${pinData?.cornerId}`;

    const customClaims = {
      role: 'judge',
      tournamentId: pinData?.tournamentId,
      ringId: pinData?.ringId,
      cornerId: pinData?.cornerId
    };

    const customToken = await auth.createCustomToken(uid, customClaims);

    res.json({ 
      token: customToken,
      assigned: {
        tournamentId: pinData?.tournamentId,
        ringId: pinData?.ringId,
        cornerId: pinData?.cornerId
      }
    });

  } catch (error) {
    console.error('Error in /auth/pin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
