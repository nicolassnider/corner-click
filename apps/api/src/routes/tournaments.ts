import express, { Request, Response } from 'express';
import { db } from '../services/firebase';
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
    console.error('Error fetching tournaments:', error);
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
    console.error('Error fetching tournament:', error);
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
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
