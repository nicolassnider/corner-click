import { trpc } from '@corner-click/api-client'
import type { Category, Competitor, Match } from '@corner-click/types'
import { MatchStatus } from '@corner-click/types'
import { get, ref } from 'firebase/database'
import React, { useEffect, useState } from 'react'
import { database } from '../lib/firebase'
import { getMatches } from '../services/bracketService'

interface AreaScheduleManagerProps {
  tournamentId: string
  tournamentAreas: number
}

export const AreaScheduleManager: React.FC<AreaScheduleManagerProps> = ({
  tournamentId,
  tournamentAreas,
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('1')
  const [matches, setMatches] = useState<Match[]>([])
  const [categories, setCategories] = useState<Record<string, Category>>({})
  const [loading, setLoading] = useState(true)

  const { data: competitorsList = [] } = trpc.competitors.getAll.useQuery({
    tournamentId,
  })

  const competitors: Record<string, Competitor> = React.useMemo(() => {
    const map: Record<string, Competitor> = {}
    competitorsList.forEach((c) => {
      map[c.id] = c
    })
    return map
  }, [competitorsList])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const matchesData = await getMatches(tournamentId)
      setMatches(matchesData)

      const catSnap = await get(ref(database, `tournaments/${tournamentId}/categories`))
      if (catSnap.exists()) {
        setCategories(catSnap.val())
      }
    } catch (error) {
      console.error('Failed to load schedule data:', error)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const areaOptions = Array.from({ length: tournamentAreas }).map((_, i) => `${i + 1}`)

  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case MatchStatus.ACTIVE:
        return (
          <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded text-xs font-bold">
            ACTIVE
          </span>
        )
      case MatchStatus.PENDING:
        return (
          <span className="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-300 px-2 py-1 rounded text-xs font-bold">
            PENDING
          </span>
        )
      case MatchStatus.COMPLETED:
        return (
          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">
            COMPLETED
          </span>
        )
      default:
        return (
          <span className="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-300 px-2 py-1 rounded text-xs font-bold">
            {status}
          </span>
        )
    }
  }

  const getCompetitorName = (id?: string) => {
    if (!id) {
      return 'TBD'
    }
    if (id === 'BYE') {
      return 'BYE (Libre)'
    }
    const c = competitors[id]
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown'
  }

  // Filter and sort matches: Active first, then Pending, then Completed
  const areaMatches = matches
    .filter((m) => m.areaId === selectedAreaId)
    .sort((a, b) => {
      const statusOrder = {
        [MatchStatus.ACTIVE]: 0,
        [MatchStatus.PENDING]: 1,
        [MatchStatus.COMPLETED]: 2,
      } as Record<string, number>

      const orderA = statusOrder[a.status] ?? 99
      const orderB = statusOrder[b.status] ?? 99

      if (orderA !== orderB) {
        return orderA - orderB
      }
      // If same status, try to sort by round if applicable (or maintain generation order)
      return (a.round || 0) - (b.round || 0)
    })

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading schedule...</div>
  }

  return (
    <div className="space-y-6">
      {/* Selector de Área */}
      <div>
        <label
          htmlFor="area-select"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Seleccionar Área para ver cronograma
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {areaOptions.map((area) => (
            <button
              type="button"
              key={area}
              onClick={() => setSelectedAreaId(area)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${
                selectedAreaId === area
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              Área {area}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Combates */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {areaMatches.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No hay combates asignados a esta área.</p>
            <p className="text-sm mt-1">
              Los combates aparecerán aquí una vez generadas las llaves.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {areaMatches.map((match, idx) => (
              <div
                key={match.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex flex-col md:flex-row items-center gap-4"
              >
                {/* Order & Status */}
                <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-gray-200 dark:border-slate-700 pr-4">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1">
                    #{idx + 1}
                  </span>
                  {getStatusBadge(match.status)}
                </div>

                {/* Match Details */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 truncate">
                    {categories[match.categoryId]?.name || 'Categoría Desconocida'}
                    {match.round ? ` • Ronda ${match.round}` : ''}
                  </div>

                  <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="flex-1 flex items-center justify-end">
                      <span className="truncate text-gray-900 dark:text-gray-200">
                        {getCompetitorName(match.redCompetitorId)}
                      </span>
                      <div className="ml-3 w-3 h-3 bg-red-500 rounded-full shrink-0"></div>
                    </div>

                    <div className="text-gray-400 dark:text-gray-500 font-bold px-2">VS</div>

                    <div className="flex-1 flex items-center justify-start">
                      <div className="mr-3 w-3 h-3 bg-blue-500 rounded-full shrink-0"></div>
                      <span className="truncate text-gray-900 dark:text-gray-200">
                        {getCompetitorName(match.blueCompetitorId)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
