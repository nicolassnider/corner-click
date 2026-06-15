import express, { Request, Response } from 'express';
import { db, rtdb } from '../services/firebase';

const router = express.Router();

router.post('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!rtdb) {
      res.status(503).json({ error: 'Firebase RTDB not initialized' });
      return;
    }

    const matchId = req.params.id;
    const { status } = req.body;

    if (!['PENDING', 'ACTIVE', 'PAUSED', 'ENDED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    // Update status in Realtime Database to broadcast to judges
    await rtdb.ref(`live_matches/${matchId}`).update({ status });
    
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:id/scores', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Firestore not initialized' });
      return;
    }

    const matchId = req.params.id;
    const { cornerId, redScore, blueScore, redWarnings, blueWarnings, redDeductions, blueDeductions } = req.body;

    if (!cornerId) {
      res.status(400).json({ error: 'Corner ID is required' });
      return;
    }

    // Store the judge's score submission in Firestore for permanent record
    const matchRef = db.collection('matches').doc(matchId);
    
    await matchRef.set({
      scores: {
        [cornerId]: {
          redScore: redScore || 0,
          blueScore: blueScore || 0,
          redWarnings: redWarnings || 0,
          blueWarnings: blueWarnings || 0,
          redDeductions: redDeductions || 0,
          blueDeductions: blueDeductions || 0,
          submittedAt: new Date().toISOString()
        }
      }
    }, { merge: true });

    res.json({ success: true, message: 'Scores submitted successfully' });
  } catch (error) {
    console.error('Error submitting scores:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:id/scores', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Firestore not initialized' });
      return;
    }

    const matchId = req.params.id;
    const doc = await db.collection('matches').doc(matchId).get();

    if (!doc.exists) {
      res.json({ scores: {} });
      return;
    }

    const data = doc.data();
    res.json({ scores: data?.scores || {} });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
