import express, { Request, Response } from "express";
import { createLogger, toErr } from "@corner-click/logger";

const log = createLogger("tournaments");
import { db, rtdb } from "../services/firebase.js";
import type { Tournament } from "@corner-click/types";
import { TournamentStatus } from "@corner-click/types";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoDataPath = path.join(__dirname, "../data/demo-data.json");
let cachedDemoData: any | null = null;

const getDemoData = () => {
  if (!cachedDemoData) {
    const fileContents = fs.readFileSync(demoDataPath, "utf-8");
    cachedDemoData = JSON.parse(fileContents);
  }
  return cachedDemoData;
};

const router = express.Router();

/**
 * @swagger
 * /tournaments:
 *   get:
 *     tags: [Tournaments]
 *     summary: List all tournaments
 *     responses:
 *       '200':
 *         description: OK
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: "Database not initialized" });
      return;
    }

    // Intercept Guest Requests
    const user = req.user as any;
    if (user?.role === "guest") {
      res.json(getDemoData());
      return;
    }

    const snapshot = await db.collection("tournaments").get();
    const tournaments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(tournaments);
  } catch (error) {
    log.error({ err: toErr(error) }, "Error fetching tournaments");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /tournaments/{id}:
 *   get:
 *     tags: [Tournaments]
 *     summary: Get tournament by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Tournament details
 *       '404':
 *         description: Tournament not found
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: "Database not initialized" });
      return;
    }

    // Intercept Guest Requests
    const user = req.user as any;
    if (user?.role === "guest") {
      const demoData = getDemoData();
      const tournament = demoData.find((t: any) => t.id === req.params.id);
      if (tournament) {
        res.json(tournament);
      } else {
        res.status(404).json({ error: "Tournament not found" });
      }
      return;
    }

    const doc = await db
      .collection("tournaments")
      .doc(req.params.id as string)
      .get();
    if (!doc.exists) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    log.error({ err: toErr(error) }, "Error fetching tournament");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /tournaments:
 *   post:
 *     tags: [Tournaments]
 *     summary: Create a new tournament
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
 *                 example: "Copa America ITF 2026"
 *               date:
 *                 type: string
 *               location:
 *                 type: string
 *               rings:
 *                 type: integer
 *                 example: 4
 *     responses:
 *       '201':
 *         description: Created
 */
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Database not initialized" });
        return;
      }

      // Intercept Guest Requests
      const user = req.user as any;
      if (user?.role === "guest") {
        res.status(403).json({ error: "Modo Solo Lectura: No se pueden crear datos en la Demo" });
        return;
      }

      const { name, date, location, areas, rings } = req.body;
      // We accept rings or areas for backward compatibility temporarily, but map to areas
      const finalAreas = areas || rings || 1;

      if (!name) {
        res.status(400).json({ error: "Name is required" });
        return;
      }

      const newTournament: Omit<Tournament, "id"> = {
        name,
        date: date || new Date().toISOString(),
        location: location || "",
        areas: finalAreas,
        status: TournamentStatus.UPCOMING,
        createdAt: new Date().toISOString(),
      };

      const docRef = await db.collection("tournaments").add(newTournament);
      res.status(201).json({ id: docRef.id, ...newTournament });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error creating tournament");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /tournaments/{id}:
 *   put:
 *     tags: [Tournaments]
 *     summary: Update tournament
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
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *               location:
 *                 type: string
 *               areas:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [UPCOMING, IN_PROGRESS, COMPLETED]
 *     responses:
 *       '200':
 *         description: Tournament updated successfully
 *       '404':
 *         description: Tournament not found
 */
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Database not initialized" });
        return;
      }

      // Intercept Guest Requests
      const user = req.user as any;
      if (user?.role === "guest") {
        res.status(403).json({ error: "Modo Solo Lectura: No se pueden editar datos en la Demo" });
        return;
      }

      const id = req.params.id as string;
      const docRef = db.collection("tournaments").doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({ error: "Tournament not found" });
        return;
      }

      const { name, date, location, areas, status } = req.body;
      const updates: Partial<Tournament> = {};

      if (name !== undefined) updates.name = name;
      if (date !== undefined) updates.date = date;
      if (location !== undefined) updates.location = location;
      if (areas !== undefined) updates.areas = areas;
      if (status !== undefined) updates.status = status;

      await docRef.update(updates);
      res.json({ id, ...doc.data(), ...updates });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error updating tournament");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /tournaments/{id}:
 *   delete:
 *     tags: [Tournaments]
 *     summary: Delete a tournament
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Tournament deleted successfully
 *       '404':
 *         description: Tournament not found
 */
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Database not initialized" });
        return;
      }

      // Intercept Guest Requests
      const user = req.user as any;
      if (user?.role === "guest") {
        res.status(403).json({ error: "Modo Solo Lectura: No se pueden borrar datos en la Demo" });
        return;
      }

      const firestoreDb = db;
      const id = req.params.id as string;
      const docRef = firestoreDb.collection("tournaments").doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({ error: "Tournament not found" });
        return;
      }

      // 1. Get the list of match IDs from RTDB to delete associated Firestore match documents
      const matchIds: string[] = [];
      if (rtdb) {
        const matchesSnap = await rtdb
          .ref(`tournaments/${id}/matches`)
          .once("value");
        const matchesData = matchesSnap.val();
        if (matchesData) {
          matchIds.push(...Object.keys(matchesData));
        }
      }

      // Helper to chunk arrays for Firestore batch operations (500 limit)
      const chunk = <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      // 2. Delete Firestore judges subcollection in chunks of 450
      const judgesSnapshot = await docRef.collection("judges").get();
      const judgeChunks = chunk(judgesSnapshot.docs, 450);
      for (const chunkDocs of judgeChunks) {
        const batch = firestoreDb.batch();
        chunkDocs.forEach((judgeDoc) => {
          batch.delete(judgeDoc.ref);
        });
        await batch.commit();
      }

      // 3. Delete Firestore match records in chunks of 450
      if (matchIds.length > 0) {
        const matchChunks = chunk(matchIds, 450);
        for (const chunkIds of matchChunks) {
          const batch = firestoreDb.batch();
          chunkIds.forEach((mId) => {
            batch.delete(firestoreDb.collection("matches").doc(mId));
          });
          await batch.commit();
        }
      }

      // 4. Delete the main tournament document in Firestore
      await docRef.delete();

      // 5. Delete RTDB data if RTDB is initialized
      if (rtdb) {
        await rtdb.ref(`tournaments/${id}`).remove();
      }

      res.json({
        message: "Tournament and all associated data deleted successfully",
      });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error deleting tournament");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
