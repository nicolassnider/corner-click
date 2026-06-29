import express, { Request, Response } from "express";
import { createLogger, toErr } from "@corner-click/logger";

const log = createLogger("judges");
import { db } from "../services/firebase.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";
import { FirebaseJudgeRepository } from "../data/repositories/FirebaseJudgeRepository.js";

const router = express.Router();
const judgeRepo = new FirebaseJudgeRepository();

const generatePin = (): string =>
  Math.floor(1000 + Math.random() * 9000).toString();

/**
 * @swagger
 * /tournaments/{id}/judges:
 *   post:
 *     tags: [Judges]
 *     summary: Register a new judge
 *     description: Registers a judge and automatically generates their personal 4-digit PIN.
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       '201':
 *         description: Judge created successfully
 */
router.post(
  "/:id/judges",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Database not initialized" });
        return;
      }
      const tournamentId = req.params.id as string;
      const { name } = req.body;

      if (!name) {
        res.status(400).json({ error: "Name is required" });
        return;
      }

      const tDoc = await db.collection("tournaments").doc(tournamentId).get();
      if (!tDoc.exists) {
        res.status(404).json({ error: "Tournament not found" });
        return;
      }

      let pin = "";
      let isUnique = false;

      while (!isUnique) {
        pin = generatePin();
        const existing = await judgeRepo.findByPin(pin);
        if (!existing) isUnique = true;
      }

      const judgeData = {
        name,
        pin,
        tournamentId,
        status: "OFFLINE" as any,
        currentAssignment: null,
        createdAt: new Date().toISOString(),
      };

      const createdJudge = await judgeRepo.create(tournamentId, judgeData);
      res.status(201).json(createdJudge);
    } catch (error) {
      log.error({ err: toErr(error) }, "Error creating judge");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /tournaments/{id}/judges:
 *   get:
 *     tags: [Judges]
 *     summary: List judges
 *     description: Lists all judges registered for a given tournament.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: List of judges
 */
const cleanupExpiredJudges = async (tournamentId: string): Promise<void> => {
  await judgeRepo.cleanupExpiredJudges(tournamentId);
};


/**
 * @swagger
 * /tournaments/{id}/judges:
 *   get:
 *     tags: [Judges]
 *     summary: List judges
 *     description: Lists all judges registered for a given tournament.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: List of judges
 */
router.get(
  "/:id/judges",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Database not initialized" });
        return;
      }
      const tournamentId = req.params.id as string;

      // Run cleanup for expired judges before returning the list
      await cleanupExpiredJudges(tournamentId);

      const judges = await judgeRepo.findByTournament(tournamentId);

      res.json(judges);
    } catch (error) {
      log.error({ err: toErr(error) }, "Error fetching judges");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /tournaments/{id}/judges/stream:
 *   get:
 *     tags: [Judges]
 *     summary: Stream judges real-time
 *     description: Server-Sent Events endpoint that streams judges.
 */
router.get("/:id/judges/stream", (req: Request, res: Response) => {
  if (!db) {
    res.status(503).json({ error: "Database not initialized" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const tournamentId = req.params.id as string;

  // Run cleanup in background when stream starts
  cleanupExpiredJudges(tournamentId).catch((err) =>
    log.error({ err }, "Error cleaning up judges in stream"),
  );

  const judgesRef = db.collection("tournaments").doc(tournamentId).collection("judges");
  const unsubscribe = judgesRef.onSnapshot(
    (snapshot) => {
      const judges = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.write(`data: ${JSON.stringify(judges)}\n\n`);
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
 * /tournaments/{id}/judges/{judgeId}/assign:
 *   put:
 *     tags: [Judges]
 *     summary: Assign a judge to an area and corner
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: judgeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               areaId:
 *                 type: string
 *               cornerId:
 *                 type: string
 *               matchId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Judge assigned successfully
 */
router.put(
  "/:id/judges/:judgeId/assign",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Database not initialized" });
        return;
      }
      const tournamentId = req.params.id as string;
      const judgeId = req.params.judgeId as string;
      const { areaId, cornerId, matchId } = req.body;

      if (!areaId || !cornerId) {
        res.status(400).json({ error: "areaId and cornerId are required" });
        return;
      }

      // We still use db for the duplicate check since it's a specific query not in the generic repo
      // Ideally this duplicate logic is inside a usecase or the repo itself. Let's keep it here for now
      // using the generic findByTournament
      const allJudges = await judgeRepo.findByTournament(tournamentId);
      const existingAssignment = allJudges.find(
        (j) => j.id !== judgeId && j.currentAssignment?.areaId === areaId && j.currentAssignment?.cornerId === cornerId
      );

      if (existingAssignment) {
        const existingName = existingAssignment.name || "Another judge";
        res.status(409).json({
          error: `${existingName} is already assigned to Area ${areaId} as ${cornerId}.`,
        });
        return;
      }

      const judgeDoc = allJudges.find(j => j.id === judgeId);

      if (!judgeDoc) {
        res.status(404).json({ error: "Judge not found" });
        return;
      }

      const currentAssignment = {
        tournamentId,
        areaId,
        cornerId,
        matchId,
      };

      await judgeRepo.updateAssignment(tournamentId, judgeId, currentAssignment);

      res.json({ message: "Judge assigned successfully", currentAssignment });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error assigning judge");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /tournaments/{id}/judges/{judgeId}/disconnect:
 *   put:
 *     tags: [Judges]
 *     summary: Force disconnect a judge
 *     description: Unassigns the judge and sets their status to OFFLINE.
 */
router.put(
  "/:id/judges/:judgeId/disconnect",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Firestore not initialized" });
        return;
      }
      const id = req.params.id as string;
      const judgeId = req.params.judgeId as string;

      await judgeRepo.updateStatus(id, judgeId, "OFFLINE");
      await judgeRepo.updateAssignment(id, judgeId, null);

      res.json({ message: "Judge disconnected successfully" });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error disconnecting judge");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /tournaments/{id}/judges/{judgeId}:
 *   delete:
 *     tags: [Judges]
 *     summary: Delete a judge
 */
router.delete(
  "/:id/judges/:judgeId",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Firestore not initialized" });
        return;
      }
      const id = req.params.id as string;
      const judgeId = req.params.judgeId as string;

      await judgeRepo.delete(id, judgeId);

      res.json({ message: "Judge deleted successfully" });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error deleting judge");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
