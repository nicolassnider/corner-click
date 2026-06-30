import type { IJudgeRepository } from '@corner-click/core-domain'
import { createLogger, toErr } from '@corner-click/logger'
import type { Judge } from '@corner-click/types'
import { db } from '../../services/firebase.js'

const log = createLogger('judge-repo')

export class FirebaseJudgeRepository implements IJudgeRepository {
  async create(tournamentId: string, judge: Omit<Judge, 'id'>): Promise<Judge> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const docRef = await db
      .collection('tournaments')
      .doc(tournamentId)
      .collection('judges')
      .add(judge)
    return { id: docRef.id, ...judge } as Judge
  }

  async findByPin(pin: string): Promise<{ id: string; data: Judge } | null> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const snapshot = await db.collectionGroup('judges').where('pin', '==', pin).get()
    if (snapshot.empty) {
      return null
    }
    const doc = snapshot.docs[0]
    return { id: doc.id, data: doc.data() as Judge }
  }

  async findByTournament(tournamentId: string): Promise<Judge[]> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const snapshot = await db.collection('tournaments').doc(tournamentId).collection('judges').get()
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Judge[]
  }

  async updateStatus(
    tournamentId: string,
    judgeId: string,
    status: string,
    lastActiveAt?: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const updateData: any = { status }
    if (lastActiveAt) {
      updateData.lastActiveAt = lastActiveAt
    }
    await db
      .collection('tournaments')
      .doc(tournamentId)
      .collection('judges')
      .doc(judgeId)
      .update(updateData)
  }

  async updateAssignment(tournamentId: string, judgeId: string, assignment: any): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    await db
      .collection('tournaments')
      .doc(tournamentId)
      .collection('judges')
      .doc(judgeId)
      .update({ currentAssignment: assignment })
  }

  async delete(tournamentId: string, judgeId: string): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    await db.collection('tournaments').doc(tournamentId).collection('judges').doc(judgeId).delete()
  }

  async cleanupExpiredJudges(tournamentId: string): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    try {
      const snapshot = await db
        .collection('tournaments')
        .doc(tournamentId)
        .collection('judges')
        .get()
      const now = new Date()
      const batch = db.batch()

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        if (data.status === 'ONLINE') {
          const lastActive = data.lastActiveAt
            ? new Date(data.lastActiveAt)
            : data.createdAt
              ? new Date(data.createdAt)
              : new Date(0)
          const diffMs = now.getTime() - lastActive.getTime()
          const diffHours = diffMs / (1000 * 60 * 60)

          if (diffHours >= 24) {
            batch.update(doc.ref, {
              status: 'OFFLINE',
              currentAssignment: null,
            })
          }
        }
      })
      await batch.commit()
    } catch (error) {
      log.error({ err: toErr(error) }, 'Error cleaning up judges')
    }
  }
}
