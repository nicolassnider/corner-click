import express, { Request, Response } from 'express';
import { db } from '../services/firebase';

const router = express.Router();

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

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }

    const doc = await db.collection('tournaments').doc(req.params.id).get();
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

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }

    const { name, date, location, rings } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const newTournament = {
      name,
      date: date || new Date().toISOString(),
      location: location || '',
      rings: rings || 1,
      status: 'UPCOMING',
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
