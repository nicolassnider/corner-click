import { auth, db } from "../../services/firebase.js";
import type { IAuthService } from "@corner-click/core-domain";
import { createLogger, toErr } from "@corner-click/logger";
import settings from "../../config/settings.js";

const log = createLogger("auth-service");
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export class FirebaseAuthService implements IAuthService {
  async createJudgeToken(judgeId: string, claims: any): Promise<string> {
    if (!auth) throw new Error("Firebase Auth not initialized");
    return auth.createCustomToken(judgeId, claims);
  }

  async loginAdmin(
    email: string,
    password: string,
  ): Promise<{
    token: string;
    uid: string;
    email: string;
    displayName: string | null;
  }> {
    if (!auth || !db) throw new Error("Firebase Admin not configured");
    if (!FIREBASE_API_KEY) throw new Error("Firebase API Key not configured");

    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    if (!firebaseRes.ok) {
      throw new Error("Invalid credentials");
    }

    const firebaseData = (await firebaseRes.json()) as any;
    const uid = firebaseData.localId;

    const adminDoc = await db.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      throw new Error("Forbidden: Admin access required");
    }

    const token = await auth.createCustomToken(uid, { role: "admin" });

    return {
      token,
      uid,
      email: firebaseData.email,
      displayName: firebaseData.displayName || null,
    };
  }

  async createGuestToken(): Promise<{ token: string; uid: string }> {
    if (!auth) throw new Error("Firebase Auth not configured");
    const uid = "guest-demo-uid";
    const token = await auth.createCustomToken(uid, { role: "guest" });
    return { token, uid };
  }
}
