import express, { Request, Response } from 'express';
import { db } from '../services/firebase';

const router = express.Router();

const generatePin = (): string => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * POST /api/tournaments/:id/judges
 * Registers a new judge and generates their personal PIN.
 */
router.post('/:id/judges', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }
    const tournamentId = req.params.id;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const tDoc = await db.collection('tournaments').doc(tournamentId).get();
    if (!tDoc.exists) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    let pin = '';
    let isUnique = false;
    
    // Ensure the PIN is unique across the tournament (or globally, but checking the subcollection)
    while (!isUnique) {
      pin = generatePin();
      // To keep PINs truly unique globally (since login only asks for PIN, no tournament ID)
      // we must query across all judges in all tournaments (Collection Group Query)
      // Wait, let's keep it simple: we can make PIN the Document ID in a top level collection, 
      // or we can just query all judges. Let's query across all tournaments for this PIN.
      const snapshot = await db.collectionGroup('judges').where('pin', '==', pin).get();
      if (snapshot.empty) isUnique = true;
    }

    const judgeData = {
      name,
      pin,
      tournamentId,
      status: 'OFFLINE',
      currentAssignment: null,
      createdAt: new Date().toISOString()
    };

    // Store the judge in the tournament's subcollection
    const docRef = await db.collection('tournaments').doc(tournamentId).collection('judges').add(judgeData);

    res.status(201).json({ id: docRef.id, ...judgeData });

  } catch (error) {
    console.error('Error creating judge:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/tournaments/:id/judges
 * List all judges for a tournament
 */
router.get('/:id/judges', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }
    const tournamentId = req.params.id;

    const snapshot = await db.collection('tournaments').doc(tournamentId).collection('judges').get();
    const judges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json(judges);
  } catch (error) {
    console.error('Error fetching judges:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT /api/tournaments/:id/judges/:judgeId/assign
 * Assigns a judge to an area and corner
 */
router.put('/:id/judges/:judgeId/assign', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }
    const { id: tournamentId, judgeId } = req.params;
    const { areaId, cornerId, matchId } = req.body;

    if (!areaId || !cornerId || !matchId) {
      res.status(400).json({ error: 'areaId, cornerId, and matchId are required' });
      return;
    }

    const judgeRef = db.collection('tournaments').doc(tournamentId).collection('judges').doc(judgeId);
    const judgeDoc = await judgeRef.get();

    if (!judgeDoc.exists) {
      res.status(404).json({ error: 'Judge not found' });
      return;
    }

    const currentAssignment = {
      tournamentId,
      areaId,
      cornerId,
      matchId
    };

    await judgeRef.update({ currentAssignment });

    res.json({ message: 'Judge assigned successfully', currentAssignment });
  } catch (error) {
    console.error('Error assigning judge:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
