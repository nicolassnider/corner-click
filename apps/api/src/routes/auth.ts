import express, { Request, Response } from "express";
import { createLogger, toErr } from "@corner-click/logger";

const log = createLogger("auth");
import { db, auth } from "../services/firebase.js";
import { authenticateToken } from "../middlewares/auth.js";
import settings from "../config/settings.js";

import { FirebaseAuthService } from "../data/repositories/FirebaseAuthService.js";
import { FirebaseJudgeRepository } from "../data/repositories/FirebaseJudgeRepository.js";

const router = express.Router();
const authService = new FirebaseAuthService();
const judgeRepo = new FirebaseJudgeRepository();

/**
 * @swagger
 * /auth/pin:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate Judge with PIN
 *     description: Verifies a 4-digit temporary PIN against Firestore and returns a Firebase Custom Token for the Judge.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *                 description: The 4-digit PIN assigned to the corner judge
 *                 example: "4829"
 *     responses:
 *       '200':
 *         description: Successfully authenticated. Returns Firebase custom token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 judge:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     tournamentId:
 *                       type: string
 *       '400':
 *         description: Bad Request (Missing PIN)
 *       '401':
 *         description: Unauthorized (Invalid or expired PIN)
 *       '503':
 *         description: Service Unavailable (Firebase Admin not configured)
 */
router.post("/pin", async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;

    if (!pin) {
      res.status(400).json({ error: "PIN is required" });
      return;
    }

    if (!db || !auth) {
      res.status(503).json({ error: "Firebase Admin not configured" });
      return;
    }

    // 1. Verify PIN in Firestore across all judges (Collection Group)
    const judgeRecord = await judgeRepo.findByPin(pin);

    if (!judgeRecord) {
      res.status(401).json({ error: "Invalid PIN" });
      return;
    }

    const { id: judgeId, data: judgeData } = judgeRecord;

    // Update status to ONLINE and set lastActiveAt timestamp
    await judgeRepo.updateStatus(
      judgeData.tournamentId,
      judgeId,
      "ONLINE",
      new Date().toISOString()
    );

    // 2. Create Custom Token with Custom Claims
    const customClaims = {
      role: "judge",
      tournamentId: judgeData.tournamentId,
      judgeId: judgeId,
      judgeName: judgeData.name,
    };

    log.debug({ judgeId }, "Creating custom token for judge");
    const customToken = await authService.createJudgeToken(judgeId, customClaims);
    log.debug({ judgeId }, "Custom token created successfully");

    res.json({
      token: customToken,
      judge: {
        id: judgeId,
        name: judgeData.name,
        tournamentId: judgeData.tournamentId,
      },
    });
  } catch (error) {
    log.error({ err: toErr(error) }, "Error in /auth/pin");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate Admin with email and password
 *     description: Verifies admin credentials via Firebase, checks the 'admins' Firestore collection, and returns a Firebase Custom Token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin@cornerclick.com"
 *               password:
 *                 type: string
 *                 example: "securePassword!"
 *     responses:
 *       '200':
 *         description: Successfully authenticated. Returns Firebase custom token.
 *       '400':
 *         description: Bad Request (Missing email or password)
 *       '401':
 *         description: Unauthorized (Invalid credentials or not an admin)
 *       '503':
 *         description: Service Unavailable (Firebase not configured)
 */
router.post(
  "/admin/login",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (!db || !auth) {
        res.status(503).json({ error: "Firebase Admin not configured" });
        return;
      }

      const adminData = await authService.loginAdmin(email, password);
      res.json({
        token: adminData.token,
        admin: {
          uid: adminData.uid,
          email: adminData.email,
          displayName: adminData.displayName,
        },
      });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error in /auth/admin/login");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /auth/admin/guest-login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate as Guest
 *     description: Returns a Firebase Custom Token for a demo guest user without requiring a password.
 *     responses:
 *       '200':
 *         description: Successfully authenticated. Returns Firebase custom token.
 *       '503':
 *         description: Service Unavailable (Firebase not configured)
 */
router.post(
  "/admin/guest-login",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!auth) {
        res.status(503).json({ error: "Firebase Admin not configured" });
        return;
      }

      const guestData = await authService.createGuestToken();
      res.json({
        token: guestData.token,
        admin: {
          uid: guestData.uid,
          email: "demo@cornerclick.com",
          displayName: "Invitado (Demo)",
        },
      });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error in /auth/admin/guest-login");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out a judge and set their status to offline
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post(
  "/logout",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!db) {
        res.status(503).json({ error: "Firestore not initialized" });
        return;
      }

      const { tournamentId, judgeId } = req.user as any;

      if (tournamentId && judgeId) {
        await judgeRepo.updateStatus(tournamentId, judgeId, "OFFLINE");
      }

      res.json({ success: true });
    } catch (error) {
      log.error({ err: toErr(error) }, "Error in /auth/logout");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
