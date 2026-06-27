import { db, rtdb } from "../../services/firebase.js";
import type { IMatchRepository } from "@corner-click/core-domain";
import type { Match } from "@corner-click/types";
import { createLogger, toErr } from "@corner-click/logger";

const log = createLogger("match-repo");

export class FirebaseMatchRepository implements IMatchRepository {
  async findByTournament(tournamentId: string): Promise<Match[]> {
    if (!db) throw new Error("Database not initialized");
    const snapshot = await db
      .collection("matches")
      .where("tournamentId", "==", tournamentId)
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Match[];
  }

  async findById(id: string): Promise<Match | null> {
    if (!db) throw new Error("Database not initialized");
    const doc = await db.collection("matches").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Match;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    if (!rtdb) throw new Error("Firebase RTDB not initialized");

    // Update status in Realtime Database to broadcast to judges
    await rtdb.ref(`live_matches/${id}`).update({ status });

    // Auto-advance tournament status: UPCOMING → IN_PROGRESS on first ACTIVE match
    if (status === "ACTIVE" && db) {
      const matchSnap = await rtdb.ref(`tournaments`).once("value");
      const allTournaments = matchSnap.val() as Record<
        string,
        { matches?: Record<string, any> }
      > | null;

      // Find which tournament owns this match
      let tournamentId: string | null = null;
      if (allTournaments) {
        for (const [tId, tData] of Object.entries(allTournaments)) {
          if (tData.matches && tData.matches[id]) {
            tournamentId = tId;
            break;
          }
        }
      }

      if (tournamentId) {
        const tournamentRef = db.collection("tournaments").doc(tournamentId);
        const tournamentDoc = await tournamentRef.get();
        if (
          tournamentDoc.exists &&
          tournamentDoc.data()?.status === "UPCOMING"
        ) {
          await tournamentRef.update({ status: "IN_PROGRESS" });
          log.info(`[Tournament] ${tournamentId} → IN_PROGRESS`);
        }
      }
    }
  }
}
