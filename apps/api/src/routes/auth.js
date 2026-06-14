const express = require('express');
const { db, auth } = require('../services/firebase');
const router = express.Router();

/**
 * POST /api/auth/pin
 * Authenticates a judge using a temporary PIN.
 */
router.post('/pin', async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    if (!db || !auth) {
      return res.status(503).json({ error: 'Firebase Admin not configured' });
    }

    // 1. Verify PIN in Firestore
    // We assume there's a 'pins' collection where document ID is the PIN
    const pinRef = db.collection('pins').doc(pin);
    const pinDoc = await pinRef.get();

    if (!pinDoc.exists) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const pinData = pinDoc.data();
    
    // 2. Check if PIN is expired (optional, depending on business logic)
    if (pinData.expiresAt && pinData.expiresAt.toDate() < new Date()) {
      return res.status(401).json({ error: 'PIN has expired' });
    }

    // 3. Generate a unique UID for this anonymous judge session
    // We can use the PIN itself or a combination of tournament-ring-corner
    const uid = `judge_${pinData.tournamentId}_${pinData.ringId}_${pinData.cornerId}`;

    // 4. Create Custom Token with Custom Claims
    const customClaims = {
      role: 'judge',
      tournamentId: pinData.tournamentId,
      ringId: pinData.ringId,
      cornerId: pinData.cornerId
    };

    const customToken = await auth.createCustomToken(uid, customClaims);

    res.json({ 
      token: customToken,
      assigned: {
        tournamentId: pinData.tournamentId,
        ringId: pinData.ringId,
        cornerId: pinData.cornerId
      }
    });

  } catch (error) {
    console.error('Error in /auth/pin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
