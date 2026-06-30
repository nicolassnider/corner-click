import type { ITournamentRepository } from '@corner-click/core-domain'
import type { Tournament } from '@corner-click/types'
import { db, rtdb } from '../../services/firebase.js'

export class FirebaseTournamentRepository implements ITournamentRepository {
  private collection = 'tournaments'

  async findAll(): Promise<Tournament[]> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const snapshot = await db.collection(this.collection).get()
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Tournament[]
  }

  async findById(id: string): Promise<Tournament | null> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const doc = await db.collection(this.collection).doc(id).get()
    if (!doc.exists) {
      return null
    }
    return { id: doc.id, ...doc.data() } as Tournament
  }

  async create(tournament: Omit<Tournament, 'id'>): Promise<Tournament> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const docRef = await db.collection(this.collection).add(tournament)
    return { id: docRef.id, ...tournament } as Tournament
  }

  async update(id: string, data: Partial<Tournament>): Promise<Tournament | null> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    await db.collection(this.collection).doc(id).update(data)
    return this.findById(id)
  }

  async delete(id: string): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const docRef = db.collection(this.collection).doc(id)
    const doc = await docRef.get()
    if (!doc.exists) {
      return // or throw depending on design
    }

    // 1. Get the list of match IDs from RTDB to delete associated Firestore match documents
    const matchIds: string[] = []
    if (rtdb) {
      const matchesSnap = await rtdb.ref(`tournaments/${id}/matches`).once('value')
      const matchesData = matchesSnap.val()
      if (matchesData) {
        matchIds.push(...Object.keys(matchesData))
      }
    }

    // Helper to chunk arrays for Firestore batch operations (500 limit)
    const chunk = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = []
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size))
      }
      return chunks
    }

    // 2. Delete Firestore judges subcollection in chunks of 450
    const judgesSnapshot = await docRef.collection('judges').get()
    const judgeChunks = chunk(judgesSnapshot.docs, 450)
    for (const chunkDocs of judgeChunks) {
      const batch = db.batch()
      chunkDocs.forEach((judgeDoc) => {
        batch.delete(judgeDoc.ref)
      })
      await batch.commit()
    }

    // 3. Delete Firestore match records in chunks of 450
    if (matchIds.length > 0) {
      const matchChunks = chunk(matchIds, 450)
      for (const chunkIds of matchChunks) {
        const batch = db.batch()
        chunkIds.forEach((mId) => {
          batch.delete(db?.collection('matches').doc(mId))
        })
        await batch.commit()
      }
    }

    // 4. Delete the main tournament document in Firestore
    await docRef.delete()

    // 5. Delete RTDB data if RTDB is initialized
    if (rtdb) {
      await rtdb.ref(`tournaments/${id}`).remove()
    }
  }
}
