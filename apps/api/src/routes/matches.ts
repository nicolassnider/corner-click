import express, { Request, Response } from "express";
import { createLogger, toErr } from "@corner-click/logger";
import { db, rtdb } from "../services/firebase.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";
import { FirebaseMatchRepository } from "../data/repositories/FirebaseMatchRepository.js";

const log = createLogger("matches");

const matchRepo = new FirebaseMatchRepository();
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
router.post(
  "/:id/status",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!rtdb) {
        res.status(503).json({ error: "Firebase RTDB not initialized" });
        return;
      }

      const matchId = req.params.id as string;
      const { status } = req.body;

      if (!["PENDING", "ACTIVE", "PAUSED", "ENDED"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }

      await matchRepo.updateStatus(matchId, status);

      res.json({ success: true, status });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error updating match status");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

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
router.post(
  "/:id/scores",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Firestore not initialized" });
        return;
      }

      const matchId = req.params.id as string;
      const {
        cornerId,
        redScore,
        blueScore,
        redWarnings,
        blueWarnings,
        redDeductions,
        blueDeductions,
      } = req.body;

      if (!cornerId) {
        res.status(400).json({ error: "Corner ID is required" });
        return;
      }

      const scores = {
        redScore: redScore || 0,
        blueScore: blueScore || 0,
        redWarnings: redWarnings || 0,
        blueWarnings: blueWarnings || 0,
        redDeductions: redDeductions || 0,
        blueDeductions: blueDeductions || 0,
      };

      await matchRepo.submitScores(matchId, cornerId, scores);

      res.json({ success: true, message: "Scores submitted successfully" });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error submitting scores");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

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
router.get(
  "/:id/scores",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Firestore not initialized" });
        return;
      }

      const matchId = req.params.id as string;
      const scores = await matchRepo.getScores(matchId);
      res.json({ scores });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error fetching scores");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /matches/{id}/stream-scores:
 *   get:
 *     tags: [Matches]
 *     summary: Stream match scores real-time
 *     description: Server-Sent Events endpoint that streams match scores.
 */
router.get("/:id/stream-scores", (req: Request, res: Response) => {
  if (!db) {
    res.status(503).json({ error: "Firestore not initialized" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const matchId = req.params.id as string;
  
  const unsubscribe = matchRepo.streamScores(
    matchId,
    (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    (error) => {
      log.error({ err: toErr(error) }, "SSE Error");
    }
  );

  req.on("close", () => {
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
router.post(
  "/:id/winner",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!rtdb) {
        res.status(503).json({ error: "Firebase RTDB not initialized" });
        return;
      }

      const matchId = req.params.id as string;
      const { winnerId, tournamentId, nextMatchId, losersMatchId, loserId } =
        req.body;

      if (!winnerId || !tournamentId) {
        res
          .status(400)
          .json({ error: "winnerId and tournamentId are required" });
        return;
      }

      // Sanitize IDs before using as RTDB path keys (prevent path traversal)
      if (
        !isSafeId(matchId) ||
        !isSafeId(tournamentId) ||
        !isSafeId(winnerId)
      ) {
        res.status(400).json({ error: "Invalid characters in ID fields" });
        return;
      }
      if (nextMatchId && !isSafeId(nextMatchId)) {
        res.status(400).json({ error: "Invalid nextMatchId" });
        return;
      }
      if (losersMatchId && !isSafeId(losersMatchId)) {
        res.status(400).json({ error: "Invalid losersMatchId" });
        return;
      }
      if (loserId && !isSafeId(loserId)) {
        res.status(400).json({ error: "Invalid loserId" });
        return;
      }

      await matchRepo.declareWinner(matchId, {
        winnerId,
        tournamentId,
        nextMatchId,
        losersMatchId,
        loserId
      });

      res.json({ success: true });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error declaring winner");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
