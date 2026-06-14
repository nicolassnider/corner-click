import express, { Request, Response } from 'express';
import { db } from '../services/firebase';

const router = express.Router();

const generatePin = (): string => Math.floor(1000 + Math.random() * 9000).toString();

router.post('/:id/pins/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }
    const tournamentId = req.params.id;

    const tDoc = await db.collection('tournaments').doc(tournamentId).get();
    if (!tDoc.exists) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    const tournament = tDoc.data();
    const ringCount = tournament?.rings || 1;

    const corners = ['red', 'blue', 'corner1', 'corner2'];
    const generatedPins: Array<{ pin: string, ringId: string, cornerId: string }> = [];
    
    const batch = db.batch();

    for (let r = 1; r <= ringCount; r++) {
      const ringId = `ring_${r}`;
      
      for (const cornerId of corners) {
        let pin = '';
        let isUnique = false;
        
        while (!isUnique) {
          pin = generatePin();
          const existing = await db.collection('pins').doc(pin).get();
          if (!existing.exists) isUnique = true;
        }

        const pinData = {
          tournamentId,
          ringId,
          cornerId,
          createdAt: new Date().toISOString(),
          isUsed: false
        };

        const pinRef = db.collection('pins').doc(pin);
        batch.set(pinRef, pinData);

        generatedPins.push({ pin, ringId, cornerId });
      }
    }

    await batch.commit();

    res.status(201).json({
      message: `Generated ${generatedPins.length} PINs successfully`,
      pins: generatedPins
    });

  } catch (error) {
    console.error('Error generating PINs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
