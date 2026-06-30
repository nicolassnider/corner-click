import type { Match } from '@corner-click/types'
import { get, ref } from 'firebase/database'
import { database } from '../lib/firebase'

export const getMatches = async (tournamentId: string, categoryId?: string): Promise<Match[]> => {
  const matchesRef = ref(database, `tournaments/${tournamentId}/matches`)
  const snapshot = await get(matchesRef)

  if (!snapshot.exists()) {
    return []
  }

  const data = snapshot.val()
  const matches: Match[] = Object.keys(data).map((key) => ({
    id: key,
    ...data[key],
  }))

  if (categoryId) {
    return matches.filter((m) => m.categoryId === categoryId)
  }

  return matches
}
