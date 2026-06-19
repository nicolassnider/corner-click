import express, { Request, Response } from 'express';
import { createLogger, toErr } from '@corner-click/logger';

const log = createLogger('tournaments');
import { db, rtdb } from '../services/firebase';
import type { Tournament } from '@corner-click/types';
import { TournamentStatus } from '@corner-click/types';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

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
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }

    const snapshot = await db.collection('tournaments').get();
    const tournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tournaments);
  } catch (error) {
    log.error({ err: toErr(error) }, 'Error fetching tournaments');
    res.status(500).json({ error: 'Internal Server Error' });
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
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }

    const doc = await db.collection('tournaments').doc(req.params.id as string).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    log.error({ err: toErr(error) }, 'Error fetching tournament');
    res.status(500).json({ error: 'Internal Server Error' });
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
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }

    const { name, date, location, rings } = req.body;
    // We accept rings or areas for backward compatibility temporarily, but map to areas
    const areas = req.body.areas || rings || 1;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const newTournament: Omit<Tournament, 'id'> = {
      name,
      date: date || new Date().toISOString(),
      location: location || '',
      areas: areas,
      status: TournamentStatus.UPCOMING,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('tournaments').add(newTournament);
    res.status(201).json({ id: docRef.id, ...newTournament });
  } catch (error) {
    log.error({ err: toErr(error) }, 'Error creating tournament');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }

    const id = req.params.id as string;
    const docRef = db.collection('tournaments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Tournament not found' });
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
    log.error({ err: toErr(error) }, 'Error updating tournament');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }

    const id = req.params.id as string;
    const docRef = db.collection('tournaments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // 1. Delete Firestore judges subcollection
    const judgesSnapshot = await docRef.collection('judges').get();
    const batch = db.batch();
    judgesSnapshot.docs.forEach(judgeDoc => {
      batch.delete(judgeDoc.ref);
    });
    // Delete main tournament document
    batch.delete(docRef);
    await batch.commit();

    // 2. Delete RTDB data if RTDB is initialized
    if (rtdb) {
      await rtdb.ref(`tournaments/${id}`).remove();
    }

    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    log.error({ err: toErr(error) }, 'Error deleting tournament');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
