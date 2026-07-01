import type { Competitor } from '@corner-click/types'
import { get, ref } from 'firebase/database'
import { database } from '../lib/firebase'

export const getCompetitors = async (
  tournamentId: string,
  categoryId?: string
): Promise<Competitor[]> => {
  const competitorsRef = ref(database, `tournaments/${tournamentId}/competitors`)
  const snapshot = await get(competitorsRef)

  if (!snapshot.exists()) {
    return []
  }

  const data = snapshot.val()
  const competitors: Competitor[] = Object.keys(data).map((key) => ({
    id: key,
    ...data[key],
  }))

  if (categoryId) {
    return competitors.filter((c) => c.categoryId === categoryId)
  }

  return competitors
}
