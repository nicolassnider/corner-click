import type { IMatchRepository } from '@corner-click/core-domain'
import { createLogger } from '@corner-click/logger'
import type { Match } from '@corner-click/types'
import { db, rtdb } from '../../services/firebase.js'

const log = createLogger('match-repo')

export class FirebaseMatchRepository implements IMatchRepository {
  async findByTournament(tournamentId: string): Promise<Match[]> {
    if (!rtdb) {
      throw new Error('Firebase RTDB not initialized')
    }
    const snapshot = await rtdb.ref(`tournaments/${tournamentId}/matches`).once('value')
    if (!snapshot.exists()) {
      return []
    }
    const data = snapshot.val()
    return Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    })) as Match[]
  }

  async findById(id: string): Promise<Match | null> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const doc = await db.collection('matches').doc(id).get()
    if (!doc.exists) {
      return null
    }
    return { id: doc.id, ...doc.data() } as Match
  }

  async updateStatus(id: string, status: string): Promise<void> {
    if (!rtdb) {
      throw new Error('Firebase RTDB not initialized')
    }

    // Update status in Realtime Database to broadcast to judges
    await rtdb.ref(`live_matches/${id}`).update({ status })

    // Auto-advance tournament status: UPCOMING → IN_PROGRESS on first ACTIVE match
    if (status === 'ACTIVE' && db) {
      const matchSnap = await rtdb.ref(`tournaments`).once('value')
      const allTournaments = matchSnap.val() as Record<
        string,
        { matches?: Record<string, any> }
      > | null

      // Find which tournament owns this match
      let tournamentId: string | null = null
      if (allTournaments) {
        for (const [tId, tData] of Object.entries(allTournaments)) {
          if (tData.matches?.[id]) {
            tournamentId = tId
            break
          }
        }
      }

      if (tournamentId) {
        const tournamentRef = db.collection('tournaments').doc(tournamentId)
        const tournamentDoc = await tournamentRef.get()
        if (tournamentDoc.exists && tournamentDoc.data()?.status === 'UPCOMING') {
          await tournamentRef.update({ status: 'IN_PROGRESS' })
          log.info(`[Tournament] ${tournamentId} → IN_PROGRESS`)
        }
      }
    }
  }
  async submitScores(id: string, cornerId: string, scores: any): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const matchRef = db.collection('matches').doc(id)
    await matchRef.set(
      {
        scores: {
          [cornerId]: {
            ...scores,
            submittedAt: new Date().toISOString(),
          },
        },
      },
      { merge: true }
    )
  }

  async getScores(id: string): Promise<any> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const doc = await db.collection('matches').doc(id).get()
    if (!doc.exists) {
      return {}
    }
    const data = doc.data()
    return data?.scores || {}
  }

  streamScores(
    id: string,
    onUpdate: (data: any) => void,
    onError: (error: any) => void
  ): () => void {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const matchRef = db.collection('matches').doc(id)
    return matchRef.onSnapshot(
      (doc) => {
        const data = doc.data()
        onUpdate({ scores: data?.scores || {} })
      },
      (error) => onError(error)
    )
  }

  async declareWinner(
    matchId: string,
    params: {
      winnerId: string
      tournamentId: string
      nextMatchId?: string
      losersMatchId?: string
      loserId?: string
    }
  ): Promise<void> {
    if (!rtdb) {
      throw new Error('Firebase RTDB not initialized')
    }
    const { winnerId, tournamentId, nextMatchId, losersMatchId, loserId } = params
    const updates: Record<string, string> = {}

    // Mark current match as completed with winner
    updates[`tournaments/${tournamentId}/matches/${matchId}/winnerId`] = winnerId
    updates[`tournaments/${tournamentId}/matches/${matchId}/status`] = 'COMPLETED'

    // Advance winner to next match if applicable
    if (nextMatchId) {
      const nextMatchSnap = await rtdb
        .ref(`tournaments/${tournamentId}/matches/${nextMatchId}`)
        .once('value')
      if (nextMatchSnap.exists()) {
        const nextMatch = nextMatchSnap.val()
        if (!nextMatch.redCompetitorId) {
          updates[`tournaments/${tournamentId}/matches/${nextMatchId}/redCompetitorId`] = winnerId
        } else if (!nextMatch.blueCompetitorId) {
          updates[`tournaments/${tournamentId}/matches/${nextMatchId}/blueCompetitorId`] = winnerId
        }
      }
    }

    // Advance loser to losers/repesca match if applicable
    if (losersMatchId && loserId) {
      const losersMatchSnap = await rtdb
        .ref(`tournaments/${tournamentId}/matches/${losersMatchId}`)
        .once('value')
      if (losersMatchSnap.exists()) {
        const losersMatch = losersMatchSnap.val()
        if (!losersMatch.redCompetitorId) {
          updates[`tournaments/${tournamentId}/matches/${losersMatchId}/redCompetitorId`] = loserId
        } else if (!losersMatch.blueCompetitorId) {
          updates[`tournaments/${tournamentId}/matches/${losersMatchId}/blueCompetitorId`] = loserId
        }
      }
    }

    await rtdb.ref().update(updates)

    // Auto-complete tournament: check if ALL matches have a winnerId
    if (db) {
      const allMatchesSnap = await rtdb.ref(`tournaments/${tournamentId}/matches`).once('value')
      const allMatches = allMatchesSnap.val() as Record<string, any> | null

      if (allMatches) {
        const allDone = Object.values(allMatches).every(
          (m: any) => m.winnerId !== null && m.winnerId !== undefined && m.winnerId !== ''
        )

        if (allDone) {
          await db.collection('tournaments').doc(tournamentId).update({ status: 'COMPLETED' })
          log.info(`[Tournament] ${tournamentId} → COMPLETED`)
        }
      }
    }
  }
}
