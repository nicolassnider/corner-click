import express, { Request, Response } from "express";
import { createLogger, toErr } from "@corner-click/logger";

const log = createLogger("judges");
import { db } from "../services/firebase.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";

const router = express.Router();

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

      // Ensure the PIN is unique across the tournament (or globally, but checking the subcollection)
      while (!isUnique) {
        pin = generatePin();
        // To keep PINs truly unique globally (since login only asks for PIN, no tournament ID)
        // we must query across all judges in all tournaments (Collection Group Query)
        // Wait, let's keep it simple: we can make PIN the Document ID in a top level collection,
        // or we can just query all judges. Let's query across all tournaments for this PIN.
        const snapshot = await db
          .collectionGroup("judges")
          .where("pin", "==", pin)
          .get();
        if (snapshot.empty) isUnique = true;
      }

      const judgeData = {
        name,
        pin,
        tournamentId,
        status: "OFFLINE",
        currentAssignment: null,
        createdAt: new Date().toISOString(),
      };

      // Store the judge in the tournament's subcollection
      const docRef = await db
        .collection("tournaments")
        .doc(tournamentId)
        .collection("judges")
        .add(judgeData);

      res.status(201).json({ id: docRef.id, ...judgeData });
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
  if (!db) return;
  try {
    const snapshot = await db
      .collection("tournaments")
      .doc(tournamentId)
      .collection("judges")
      .get();
    const now = new Date();
    const batch = db.batch();
    let hasUpdates = false;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "ONLINE") {
        const lastActive = data.lastActiveAt
          ? new Date(data.lastActiveAt)
          : data.createdAt
            ? new Date(data.createdAt)
            : new Date(0);
        const diffMs = now.getTime() - lastActive.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours >= 24) {
          batch.update(doc.ref, { status: "OFFLINE", currentAssignment: null });
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      await batch.commit();
      log.info({ tournamentId }, "Cleaned up expired judges (> 24 hours)");
    }
  } catch (error) {
    log.error(
      { err: toErr(error), tournamentId },
      "Error running cleanupExpiredJudges",
    );
  }
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

      const snapshot = await db
        .collection("tournaments")
        .doc(tournamentId)
        .collection("judges")
        .get();
      const judges = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

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

  const judgesRef = db
    .collection("tournaments")
    .doc(tournamentId)
    .collection("judges");

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
    },
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
        res
          .status(400)
          .json({ error: "areaId and cornerId are required" });
        return;
      }

      const judgesRef = db
        .collection("tournaments")
        .doc(tournamentId)
        .collection("judges");

      // Check if another judge is already assigned to this area and corner
      const duplicateQuery = await judgesRef
        .where("currentAssignment.areaId", "==", areaId)
        .where("currentAssignment.cornerId", "==", cornerId)
        .get();

      const existingAssignment = duplicateQuery.docs.find(
        (doc) => doc.id !== judgeId,
      );
      if (existingAssignment) {
        const existingName = existingAssignment.data().name || "Another judge";
        res.status(409).json({
          error: `${existingName} is already assigned to Area ${areaId} as ${cornerId}.`,
        });
        return;
      }

      const judgeRef = judgesRef.doc(judgeId);
      const judgeDoc = await judgeRef.get();

      if (!judgeDoc.exists) {
        res.status(404).json({ error: "Judge not found" });
        return;
      }

      const currentAssignment = {
        tournamentId,
        areaId,
        cornerId,
        matchId,
      };

      await judgeRef.update({ currentAssignment });

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

      await db
        .collection("tournaments")
        .doc(id)
        .collection("judges")
        .doc(judgeId)
        .update({
          currentAssignment: null,
          status: "OFFLINE",
        });

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

      await db
        .collection("tournaments")
        .doc(id)
        .collection("judges")
        .doc(judgeId)
        .delete();

      res.json({ message: "Judge deleted successfully" });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error deleting judge");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
