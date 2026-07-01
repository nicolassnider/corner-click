import { trpc } from '@corner-click/api-client'
import type { Tournament } from '@corner-click/types'
import { Button, Card } from '@corner-click/ui'
import { getDynamicAnalyticsUrl } from '../utils/apiClient'

const _API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000'

interface Props {
  onSelect: (t: Tournament) => void
  onCreateNew: () => void
  onEdit: (t: Tournament) => void
}

export default function TournamentList({ onSelect, onCreateNew, onEdit }: Props) {
  const { data, isLoading } = trpc.tournaments.getAll.useQuery()
  const tournaments = data || []
  const utils = trpc.useUtils()

  const deleteMutation = trpc.tournaments.delete.useMutation()

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this tournament? This will erase all its categories, competitors, matches and judges.'
      )
    ) {
      return
    }
    try {
      await deleteMutation.mutateAsync({ id })
      utils.tournaments.getAll.invalidate()
    } catch (err) {
      console.error(err)
      alert('Failed to delete tournament')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    )
  }
  const inProgressTournaments = tournaments.filter((t) => t.status === 'IN_PROGRESS')
  const upcomingTournaments = tournaments.filter((t) => t.status === 'UPCOMING')
  const completedTournaments = tournaments.filter((t) => t.status === 'COMPLETED')

  const renderTournamentCard = (t: Tournament) => {
    let statusClass = 'bg-green-100 text-green-800'
    if (t.status === 'IN_PROGRESS') {
      statusClass =
        'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
    } else if (t.status === 'UPCOMING') {
      statusClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
    } else {
      statusClass = 'bg-slate-100 text-slate-500 border border-slate-200'
    }

    return (
      <Card
        key={t.id}
        onClick={() => onSelect(t)}
        padding="md"
        className={`hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between h-full ${
          t.status === 'COMPLETED'
            ? 'bg-slate-50/50 border-slate-200 opacity-85 hover:opacity-100'
            : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-extrabold text-gray-800 leading-tight">{t.name}</h2>
            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ml-2 ${statusClass}`}
            >
              {t.status === 'IN_PROGRESS'
                ? 'LIVE / EN CURSO'
                : t.status === 'UPCOMING'
                  ? 'PRÓXIMO'
                  : 'FINALIZADO'}
            </span>
          </div>
          <p className="text-gray-650 mb-2 flex items-center text-sm font-semibold">
            <svg
              aria-hidden="true"
              className="w-5 h-5 mr-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
            {t.location}
          </p>
          <p className="text-gray-600 mb-4 flex items-center text-sm">
            <svg
              aria-hidden="true"
              className="w-5 h-5 mr-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            {new Date(t.date).toLocaleDateString()}
          </p>
        </div>
        <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center">
          <p className="text-sm font-bold text-gray-500">{t.areas || 1} Áreas</p>
          <div className="flex space-x-2">
            <a
              href={`${getDynamicAnalyticsUrl(import.meta.env.PUBLIC_ANALYTICS_URL || 'http://localhost:4323')}/?tournament=${encodeURIComponent(t.id as string)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-xs transition-colors cursor-pointer border border-indigo-200 flex items-center justify-center shadow-sm"
            >
              Stats ↗
            </a>
            {t.status !== 'COMPLETED' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(t)
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded text-xs transition-colors cursor-pointer border border-gray-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(t.id as string)
                  }}
                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded text-xs transition-colors cursor-pointer border border-red-200"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="p-8 max-w-[95vw] 2xl:max-w-[1700px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Tournaments
        </h1>
        <Button
          onClick={onCreateNew}
          variant="primary"
          className="shadow-lg hover:-translate-y-1 transition-transform"
        >
          + New Tournament
        </Button>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-500 text-xl">No tournaments found.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Live / In Progress */}
          {inProgressTournaments.length > 0 && (
            <div>
              <h2 className="text-xl font-extrabold text-emerald-600 mb-4 uppercase tracking-wider flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></span>
                En Curso / Activos ({inProgressTournaments.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressTournaments.map(renderTournamentCard)}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingTournaments.length > 0 && (
            <div>
              <h2 className="text-xl font-extrabold text-blue-600 mb-4 uppercase tracking-wider flex items-center gap-2">
                <span>📅</span> Próximos Torneos ({upcomingTournaments.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingTournaments.map(renderTournamentCard)}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedTournaments.length > 0 && (
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <span>✓</span> Finalizados / Historial ({completedTournaments.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedTournaments.map(renderTournamentCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
