import express, { Request, Response } from 'express';
import { db, rtdb } from '../services/firebase';

const router = express.Router();

/**
 * @swagger
 * /matches/{id}/status:
 *   post:
 *     tags: [Matches]
 *     summary: Update match status
 *     description: Updates the status of a live match (PENDING, ACTIVE, PAUSED, ENDED) in Firebase RTDB
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, ACTIVE, PAUSED, ENDED]
 *     responses:
 *       '200':
 *         description: Status updated successfully
 */
router.post('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!rtdb) {
      res.status(503).json({ error: 'Firebase RTDB not initialized' });
      return;
    }

    const matchId = req.params.id as string;
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

/**
 * @swagger
 * /matches/{id}/scores:
 *   post:
 *     tags: [Matches]
 *     summary: Submit match scores
 *     description: Submits scores, warnings, and deductions from a specific corner judge
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cornerId
 *             properties:
 *               cornerId:
 *                 type: string
 *               redScore:
 *                 type: integer
 *               blueScore:
 *                 type: integer
 *               redWarnings:
 *                 type: integer
 *               blueWarnings:
 *                 type: integer
 *               redDeductions:
 *                 type: integer
 *               blueDeductions:
 *                 type: integer
 *     responses:
 *       '200':
 *         description: Scores submitted successfully
 */
router.post('/:id/scores', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Firestore not initialized' });
      return;
    }

    const matchId = req.params.id as string;
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

/**
 * @swagger
 * /matches/{id}/scores:
 *   get:
 *     tags: [Matches]
 *     summary: Get match scores
 *     description: Retrieves final submitted scores for a match
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Match scores
 */
router.get('/:id/scores', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Firestore not initialized' });
      return;
    }

    const matchId = req.params.id as string;
    const doc = await db.collection('matches').doc(matchId).get();

    if (!doc.exists) {
      res.json({ scores: {} });
      return;
    }

    res.json({ scores: data?.scores || {} });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /matches/{id}/stream-scores:
 *   get:
 *     tags: [Matches]
 *     summary: Stream match scores real-time
 *     description: Server-Sent Events endpoint that streams match scores.
 */
router.get('/:id/stream-scores', (req: Request, res: Response) => {
  if (!db) {
    res.status(503).json({ error: 'Firestore not initialized' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const matchId = req.params.id as string;
  const matchRef = db.collection('matches').doc(matchId);

  const unsubscribe = matchRef.onSnapshot(doc => {
    const data = doc.data();
    res.write(`data: ${JSON.stringify({ scores: data?.scores || {} })}\n\n`);
  }, error => {
    console.error('SSE Error:', error);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

export default router;
