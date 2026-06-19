import express, { Request, Response } from 'express';
import { createLogger, toErr } from '@corner-click/logger';
import { db, rtdb } from '../services/firebase';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

const log = createLogger('matches');

const router = express.Router();

/** Validate that an ID is a safe alphanumeric Firebase key (no path traversal) */
const isSafeId = (id: string): boolean => /^[a-zA-Z0-9_-]+$/.test(id);

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

    // Auto-advance tournament status: UPCOMING → IN_PROGRESS on first ACTIVE match
    if (status === 'ACTIVE' && db) {
      const matchSnap = await rtdb.ref(`tournaments`).once('value');
      const allTournaments = matchSnap.val() as Record<string, { matches?: Record<string, any> }> | null;

      // Find which tournament owns this match
      let tournamentId: string | null = null;
      if (allTournaments) {
        for (const [tId, tData] of Object.entries(allTournaments)) {
          if (tData.matches && tData.matches[matchId]) {
            tournamentId = tId;
            break;
          }
        }
      }

      if (tournamentId) {
        const tournamentRef = db.collection('tournaments').doc(tournamentId);
        const tournamentDoc = await tournamentRef.get();
        if (tournamentDoc.exists && tournamentDoc.data()?.status === 'UPCOMING') {
          await tournamentRef.update({ status: 'IN_PROGRESS' });
          log.info(`[Tournament] ${tournamentId} → IN_PROGRESS`);
        }
      }
    }

    res.json({ success: true, status });
  } catch (error) {
    log.error({ err: toErr(error) }, 'Error updating match status');
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
    log.error({ err: toErr(error) }, 'Error submitting scores');
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
    const data = doc.data();
    res.json({ scores: data?.scores || {} });
  } catch (error) {
    log.error({ err: toErr(error) }, 'Error fetching scores');
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
    log.error({ err: toErr(error) }, 'SSE Error');
  });

  req.on('close', () => {
    unsubscribe();
  });
});

/**
 * @swagger
 * /matches/{id}/winner:
 *   post:
 *     tags: [Matches]
 *     summary: Declare match winner and advance bracket
 *     description: Sets the winner of a match, advances them to the next match, marks the match as COMPLETED, and auto-completes the tournament if all matches are done.
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
 *               - winnerId
 *               - tournamentId
 *             properties:
 *               winnerId:
 *                 type: string
 *               tournamentId:
 *                 type: string
 *               nextMatchId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Winner declared successfully
 */
router.post('/:id/winner', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!rtdb) {
      res.status(503).json({ error: 'Firebase RTDB not initialized' });
      return;
    }

    const matchId = req.params.id as string;
    const { winnerId, tournamentId, nextMatchId } = req.body;

    if (!winnerId || !tournamentId) {
      res.status(400).json({ error: 'winnerId and tournamentId are required' });
      return;
    }

    // Sanitize IDs before using as RTDB path keys (prevent path traversal)
    if (!isSafeId(matchId) || !isSafeId(tournamentId) || !isSafeId(winnerId)) {
      res.status(400).json({ error: 'Invalid characters in ID fields' });
      return;
    }
    if (nextMatchId && !isSafeId(nextMatchId)) {
      res.status(400).json({ error: 'Invalid nextMatchId' });
      return;
    }

    const updates: Record<string, string> = {};

    // Mark current match as completed with winner
    updates[`tournaments/${tournamentId}/matches/${matchId}/winnerId`] = winnerId;
    updates[`tournaments/${tournamentId}/matches/${matchId}/status`] = 'COMPLETED';

    // Advance winner to next match if applicable
    if (nextMatchId) {
      const nextMatchSnap = await rtdb.ref(`tournaments/${tournamentId}/matches/${nextMatchId}`).once('value');
      if (nextMatchSnap.exists()) {
        const nextMatch = nextMatchSnap.val();
        if (!nextMatch.redCompetitorId) {
          updates[`tournaments/${tournamentId}/matches/${nextMatchId}/redCompetitorId`] = winnerId;
        } else if (!nextMatch.blueCompetitorId) {
          updates[`tournaments/${tournamentId}/matches/${nextMatchId}/blueCompetitorId`] = winnerId;
        }
      }
    }

    await rtdb.ref().update(updates);

    // Auto-complete tournament: check if ALL matches have a winnerId
    if (db) {
      const allMatchesSnap = await rtdb.ref(`tournaments/${tournamentId}/matches`).once('value');
      const allMatches = allMatchesSnap.val() as Record<string, any> | null;

      if (allMatches) {
        const allDone = Object.values(allMatches).every(
          (m: any) => m.winnerId !== null && m.winnerId !== undefined && m.winnerId !== ''
        );

        if (allDone) {
          await db.collection('tournaments').doc(tournamentId).update({ status: 'COMPLETED' });
          log.info(`[Tournament] ${tournamentId} → COMPLETED`);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    log.error({ err: toErr(error) }, 'Error declaring winner');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
