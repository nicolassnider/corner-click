import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import React, { useEffect, useState } from 'react'
import '../styles/global.css'
import { trpc } from '@corner-click/api-client'
import type { Competitor, Match } from '@corner-click/types'
import { calculateNetScore, MatchStatus } from '@corner-click/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { AnimatePresence, motion } from 'framer-motion'
import { useActiveMatch } from '../hooks/useActiveMatch'
import { auth } from '../lib/firebase'
import { API_URL } from '../utils/apiClient'
import { getCompetitorFullName } from '../utils/competitorUtils'
import Footer from './Footer'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      async headers() {
        const user = auth.currentUser
        const token = user ? await user.getIdToken() : ''
        return {
          authorization: token ? `Bearer ${token}` : '',
        }
      },
    }),
  ],
})

export default function JuryDashboardApp() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <JuryDashboard />
      </QueryClientProvider>
    </trpc.Provider>
  )
}

function JuryDashboard() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  const { data: rawTournaments = [] } = trpc.tournaments.getAll.useQuery()
  const tournaments = React.useMemo(() => {
    return Array.isArray(rawTournaments)
      ? rawTournaments.filter((t: any) => t.status !== 'COMPLETED')
      : []
  }, [rawTournaments])

  const { data: categories = [] } = trpc.categories.getAll.useQuery(
    { tournamentId: selectedTournamentId },
    { enabled: !!selectedTournamentId }
  )

  const { data: competitorsList = [] } = trpc.competitors.getAll.useQuery(
    { tournamentId: selectedTournamentId },
    { enabled: !!selectedTournamentId }
  )

  const competitors: Record<string, Competitor> = React.useMemo(() => {
    const map: Record<string, Competitor> = {}
    competitorsList.forEach((c) => {
      map[c.id] = c
    })
    return map
  }, [competitorsList])

  // Custom Toast state
  const [toasts, setToasts] = useState<Toast[]>([])
  const [authChecked, setAuthChecked] = useState(false)
  const [_user, setUser] = useState<User | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  // Load URL params and fetch tournaments on mount after auth resolves
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = '/login'
        return
      }
      setUser(u)
      setAuthChecked(true)

      const params = new URLSearchParams(window.location.search)
      const tId = params.get('tournament')
      const cId = params.get('category')
      if (tId) {
        setSelectedTournamentId(tId)
      }
      if (cId) {
        setSelectedCategoryId(cId)
      }
    })

    return () => unsub()
  }, [])

  // Update URL params when selection changes
  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedTournamentId) {
      url.searchParams.set('tournament', selectedTournamentId)
    } else {
      url.searchParams.delete('tournament')
    }

    if (selectedCategoryId) {
      url.searchParams.set('category', selectedCategoryId)
    } else {
      url.searchParams.delete('category')
    }

    window.history.replaceState({}, '', url.toString())
  }, [selectedTournamentId, selectedCategoryId])

  const { data: allMatches = [], refetch: refetchMatches } = trpc.matches.getByTournament.useQuery(
    { tournamentId: selectedTournamentId },
    { enabled: !!selectedTournamentId }
  )

  const activeCategoryIds = React.useMemo(() => {
    return new Set(allMatches.map((m) => m.categoryId))
  }, [allMatches])

  const _activeCategories = React.useMemo(() => {
    return categories.filter((c) => activeCategoryIds.has(c.id))
  }, [categories, activeCategoryIds])

  const matches = React.useMemo(() => {
    if (!selectedCategoryId) {
      return []
    }
    return allMatches.filter((m) => m.categoryId === selectedCategoryId)
  }, [allMatches, selectedCategoryId])

  // When selectedCategoryId changes, update selectedMatch
  useEffect(() => {
    if (matches.length > 0 && !selectedMatch) {
      setSelectedMatch(matches[0])
    } else if (matches.length === 0) {
      setSelectedMatch(null)
    }
  }, [matches, selectedMatch])

  const handleMatchesRefreshed = (_updatedMatches: Match[], currentMatch: Match) => {
    refetchMatches().then(() => {
      setSelectedMatch(currentMatch)
    })
  }

  // Initialize active match controller hook
  const {
    status,
    timeRemaining,
    judgesData,
    formatTime,
    handleStart,
    handlePause,
    handleEnd,
    handleExtraTime,
    handleGoldenPoint,
    handleDeclareWinner,
    redVotes,
    blueVotes,
    tieVotes,
    totalRed,
    totalBlue,
    isMatchStartable,
    firebaseConnected,
  } = useActiveMatch(
    selectedMatch,
    selectedTournamentId,
    selectedCategoryId,
    handleMatchesRefreshed,
    competitors,
    showToast
  )

  // Derive final vote percentage for the visual bar comparison
  const totalVotes = redVotes + blueVotes + tieVotes
  const redPct = totalVotes > 0 ? (redVotes / totalVotes) * 100 : 0
  const bluePct = totalVotes > 0 ? (blueVotes / totalVotes) * 100 : 0
  const tiePct = totalVotes > 0 ? (tieVotes / totalVotes) * 100 : 0

  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-blue-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-xl border shadow-xl flex items-center gap-3 animate-slide-in backdrop-blur-md transition-all duration-300 ${
              t.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                : t.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/30 text-rose-300'
                  : t.type === 'warning'
                    ? 'bg-amber-950/80 border-amber-500/30 text-amber-300'
                    : 'bg-slate-900/90 border-slate-700/50 text-slate-200'
            }`}
          >
            <span className="text-xl">
              {t.type === 'success'
                ? '✨'
                : t.type === 'error'
                  ? '⚠️'
                  : t.type === 'warning'
                    ? '🔥'
                    : 'ℹ️'}
            </span>
            <div className="flex-1 text-sm font-semibold">{t.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-200 font-bold ml-auto"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Top Navbar */}
      <nav className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800 text-white shadow-xl py-4 px-8 sticky top-0 z-50">
        <div className="max-w-[95vw] 2xl:max-w-[1700px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <a
            href="/"
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            title="Volver al inicio"
          >
            <svg
              className="w-8 h-8 text-blue-500 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              ></path>
            </svg>
            <span className="text-2xl font-black tracking-tight uppercase">
              CORNER<span className="text-blue-500">CLICK</span>
            </span>
            <span className="ml-4 pl-4 border-l border-slate-800 text-slate-400 font-semibold tracking-widest text-xs hidden sm:inline">
              JURY CONTROL ROOM
            </span>
          </a>
          <div className="flex flex-wrap gap-3 items-center justify-center">
            <select
              aria-label="Select Tournament"
              title="Select Tournament"
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all w-full sm:w-52 min-w-[200px]"
            >
              <option value="">Select Tournament...</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Select Category"
              title="Select Category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all w-full sm:w-52 min-w-[200px] disabled:opacity-50 disabled:bg-slate-900 disabled:text-slate-500 disabled:border-slate-850 disabled:cursor-not-allowed"
              disabled={!selectedTournamentId || categories.length === 0}
            >
              {selectedTournamentId && categories.length === 0 ? (
                <option value="">No categories available</option>
              ) : (
                <option value="">Select Category...</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <span className="bg-slate-800/80 border border-slate-700 text-slate-300 py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider">
              Area 1 - Jury
            </span>
            {firebaseConnected ? (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> OFFLINE FALLBACK
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[95vw] 2xl:max-w-[1700px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar: Match Queue */}
        <aside className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          <div className="bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-slate-800/80 shadow-2xl h-full flex flex-col">
            <h2 className="text-lg font-extrabold text-slate-200 mb-4 tracking-tight flex items-center gap-2">
              <span>📅</span> Matches Queue
            </h2>
            {!selectedTournamentId ? (
              <p className="text-slate-500 text-sm italic">Select a tournament to load matches.</p>
            ) : categories.length === 0 ? (
              <p className="text-slate-500 text-sm italic">
                No categories found for this tournament.
              </p>
            ) : !selectedCategoryId ? (
              <p className="text-slate-500 text-sm italic">Select a category to load matches.</p>
            ) : matches.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No matches found for this category.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <AnimatePresence>
                  {matches.map((match) => {
                    const isCurrent = selectedMatch?.id === match.id
                    const displayStatus = isCurrent ? status : match.status
                    const displayWinnerId = isCurrent ? selectedMatch?.winnerId : match.winnerId

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        key={match.id}
                        className={`p-3 rounded-xl cursor-pointer transition-all border-2 ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] transform scale-[1.02]'
                            : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700'
                        }`}
                        onClick={() => setSelectedMatch(match)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span
                            className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded ${isCurrent ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}
                          >
                            Round {match.round} {displayWinnerId ? '✓' : ''}
                          </span>
                          <span
                            className="text-[10px] text-slate-600 font-mono tracking-tighter"
                            title="Match ID"
                          >
                            #{match.id.substring(0, 8)}
                          </span>
                        </div>
                        <div className="font-semibold text-sm flex items-center justify-between gap-2">
                          <span
                            className={`text-rose-400 truncate max-w-[45%] ${displayWinnerId === match.redCompetitorId ? 'font-black underline decoration-2' : ''}`}
                          >
                            {getCompetitorFullName(match.redCompetitorId, competitors)}
                          </span>
                          <span className="text-slate-600 text-[10px] uppercase font-bold tracking-widest shrink-0">
                            vs
                          </span>
                          <span
                            className={`text-blue-400 truncate max-w-[45%] text-right ${displayWinnerId === match.blueCompetitorId ? 'font-black underline decoration-2' : ''}`}
                          >
                            {getCompetitorFullName(match.blueCompetitorId, competitors)}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase ${
                              displayStatus === MatchStatus.COMPLETED
                                ? 'bg-slate-800 text-slate-400'
                                : displayStatus === MatchStatus.ACTIVE
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : displayStatus === MatchStatus.GOLDEN_POINT
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}
                          >
                            {displayStatus}
                          </span>
                          {displayWinnerId && (
                            <span className="text-[10px] font-bold text-slate-500">
                              Winner Declared
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Area: Timer & Controls */}
        <section className="lg:col-span-2 order-1 lg:order-2 flex flex-col">
          <AnimatePresence mode="wait">
            {!selectedMatch ? (
              <motion.div
                key="no-match"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900/20 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center justify-center p-12 min-h-[450px] flex-grow text-center"
              >
                <span className="text-6xl mb-4 animate-bounce">⚡</span>
                <p className="text-slate-400 text-lg font-bold">
                  Select a match from the queue to start control operations.
                </p>
                <p className="text-slate-600 text-sm mt-1">
                  Make sure you have selected a tournament and active category first.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedMatch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col h-full flex-grow relative"
              >
                {/* Match Header */}
                <div className="bg-slate-900/80 border-b border-slate-800 p-4 md:p-6 text-center relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

                  {/* Header Status Bar */}
                  <div className="flex justify-between items-center mb-4">
                    {/* Status Badge */}
                    <div>
                      <span
                        className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                          status === MatchStatus.ACTIVE
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse'
                            : status === MatchStatus.GOLDEN_POINT
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse'
                              : status === MatchStatus.PAUSED
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40'
                                : status === MatchStatus.ENDED ||
                                    selectedMatch.status === MatchStatus.COMPLETED
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                        }`}
                      >
                        {selectedMatch.status === MatchStatus.COMPLETED ? 'COMPLETED' : status}
                      </span>
                    </div>

                    {/* TV Projector View link */}
                    <button
                      onClick={() => window.open(`/area/${selectedMatch.areaId}/tv`, '_blank')}
                      className="flex items-center gap-2 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-slate-100 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all shadow-md active:scale-95"
                      title="Open Spectator screen for TV display/projectors"
                    >
                      <span>📺</span> Spectator View (TV)
                    </button>
                  </div>

                  <div className="relative z-10 flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mt-2">
                    <div className="text-center md:text-right flex-1 min-w-0">
                      <h3 className="text-2xl md:text-3xl font-black text-rose-500 tracking-tight truncate uppercase">
                        {getCompetitorFullName(selectedMatch.redCompetitorId, competitors)}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-rose-700 tracking-widest block mt-0.5">
                        RED CORNER
                      </span>
                    </div>
                    <div className="text-slate-600 font-black italic flex flex-col items-center mx-2 shrink-0">
                      <span className="text-lg bg-slate-850 border border-slate-800 text-slate-500 px-3 py-0.5 rounded-full not-italic tracking-wider text-xs uppercase">
                        VS
                      </span>
                      <span className="text-[9px] font-mono mt-1 text-slate-500">
                        ID: {selectedMatch.id.substring(0, 12)}
                      </span>
                    </div>
                    <div className="text-center md:text-left flex-1 min-w-0">
                      <h3 className="text-2xl md:text-3xl font-black text-blue-500 tracking-tight truncate uppercase">
                        {getCompetitorFullName(selectedMatch.blueCompetitorId, competitors)}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-blue-700 tracking-widest block mt-0.5">
                        BLUE CORNER
                      </span>
                    </div>
                  </div>

                  {/* Digital Timer Panel */}
                  <div className="mt-4 mb-1 flex justify-center">
                    <div className="bg-slate-950/60 border border-slate-850 px-6 py-2 rounded-xl shadow-inner inline-flex items-center">
                      <div
                        className={`font-mono text-5xl md:text-6xl font-black tracking-tighter transition-all duration-300 ${
                          status === MatchStatus.ACTIVE
                            ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)] animate-pulse'
                            : status === MatchStatus.GOLDEN_POINT
                              ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                              : 'text-slate-500'
                        }`}
                      >
                        {formatTime(timeRemaining)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Scores & Judge Breakdown */}
                {status === MatchStatus.ENDED && Object.keys(judgesData).length > 0 ? (
                  <div className="bg-slate-950/60 border-y border-slate-800/80 p-6 flex-1 flex flex-col justify-center">
                    <h4 className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs mb-5">
                      🏁 FINAL JUDGES CONSENSUS BREAKDOWN
                    </h4>

                    {/* Detailed Judge Scorecards */}
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 ${Object.keys(judgesData).length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 mb-6 max-w-4xl mx-auto w-full`}
                    >
                      {Object.entries(judgesData).map(([cornerId, data]: [string, any]) => {
                        const r = calculateNetScore(
                          data.redScore || 0,
                          data.redWarnings || 0,
                          data.redDeductions || 0
                        )
                        const b = calculateNetScore(
                          data.blueScore || 0,
                          data.blueWarnings || 0,
                          data.blueDeductions || 0
                        )
                        const winnerClass =
                          r > b
                            ? 'border-rose-900/60 bg-rose-950/20 shadow-[inset_0_0_15px_rgba(244,63,94,0.05)]'
                            : b > r
                              ? 'border-blue-900/60 bg-blue-950/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.05)]'
                              : 'border-slate-850 bg-slate-900/20'
                        return (
                          <div
                            key={cornerId}
                            className={`border rounded-xl p-4 text-center transition-all ${winnerClass}`}
                          >
                            <div className="font-bold text-slate-400 mb-2 uppercase text-[10px] tracking-widest">
                              {cornerId}
                            </div>
                            <div className="flex justify-between items-center px-2">
                              <div className="flex flex-col items-center">
                                <span className="text-2xl font-black text-rose-500">{r}</span>
                                <span className="text-[8px] text-slate-500">
                                  ({data.redScore || 0} / {data.redWarnings || 0}W /{' '}
                                  {data.redDeductions || 0}D)
                                </span>
                              </div>
                              <span className="text-slate-700 font-bold px-2">vs</span>
                              <div className="flex flex-col items-center">
                                <span className="text-2xl font-black text-blue-500">{b}</span>
                                <span className="text-[8px] text-slate-500">
                                  ({data.blueScore || 0} / {data.blueWarnings || 0}W /{' '}
                                  {data.blueDeductions || 0}D)
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Visual Vote Comparison Bars */}
                    <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl max-w-2xl mx-auto w-full">
                      <div className="flex justify-between items-center mb-3 text-xs font-bold uppercase tracking-wider">
                        <span className="text-rose-500">Red Corner ({redVotes})</span>
                        <span className="text-slate-500">Ties ({tieVotes})</span>
                        <span className="text-blue-500">Blue Corner ({blueVotes})</span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                        {totalVotes === 0 ? (
                          <div className="w-full bg-slate-850 text-[10px] text-slate-500 flex items-center justify-center uppercase font-bold tracking-widest">
                            No votes recorded
                          </div>
                        ) : (
                          <>
                            <style>{`
                            .dynamic-red-bar { width: ${redPct}% !important; }
                            .dynamic-tie-bar { width: ${tiePct}% !important; }
                            .dynamic-blue-bar { width: ${bluePct}% !important; }
                          `}</style>
                            <div
                              className="dynamic-red-bar bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                              title={`Red Corner: ${redVotes} votes (${redPct.toFixed(1)}%)`}
                            />
                            <div
                              className="dynamic-tie-bar bg-slate-700 transition-all duration-500"
                              title={`Ties: ${tieVotes} votes (${tiePct.toFixed(1)}%)`}
                            />
                            <div
                              className="dynamic-blue-bar bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                              title={`Blue Corner: ${blueVotes} votes (${bluePct.toFixed(1)}%)`}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-px bg-slate-800 border-y border-slate-800 flex-grow shrink-0">
                    <div className="bg-rose-950/5 p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-rose-500/2 blur-[80px] pointer-events-none" />
                      <span className="text-rose-500/80 font-black uppercase tracking-widest text-[10px] mb-1 text-center">
                        Red Votes
                      </span>
                      <span className="text-5xl md:text-6xl font-black text-rose-500 tracking-tight drop-shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                        {redVotes}
                      </span>
                    </div>
                    <div className="bg-slate-900/40 p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
                      <span className="text-slate-500/80 font-black uppercase tracking-widest text-[10px] mb-1 text-center">
                        Ties
                      </span>
                      <span className="text-5xl md:text-6xl font-black text-slate-500 tracking-tight drop-shadow-[0_0_15px_rgba(100,116,139,0.15)]">
                        {tieVotes}
                      </span>
                    </div>
                    <div className="bg-blue-950/5 p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-500/2 blur-[80px] pointer-events-none" />
                      <span className="text-blue-500/80 font-black uppercase tracking-widest text-[10px] mb-1 text-center">
                        Blue Votes
                      </span>
                      <span className="text-5xl md:text-6xl font-black text-blue-500 tracking-tight drop-shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        {blueVotes}
                      </span>
                    </div>
                  </div>
                )}

                {/* Match Complete / Tie Breaker Controls */}
                {status === MatchStatus.ENDED && selectedMatch.status !== MatchStatus.COMPLETED && (
                  <div className="p-6 bg-slate-900 border-t border-slate-800 shrink-0 flex flex-col items-center">
                    <h4 className="text-xs font-black text-amber-500/90 mb-4 uppercase tracking-widest flex items-center gap-1.5">
                      <span>⚡</span> DECIDE TO DECLARE WINNER OR START EXTRA TIME
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-3xl">
                      <button
                        onClick={() => handleDeclareWinner(selectedMatch.redCompetitorId)}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer text-sm ${redVotes > blueVotes ? 'bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] scale-[1.02] border-2 border-rose-400' : 'bg-rose-850 hover:bg-rose-750 text-rose-300 border border-rose-800/40'}`}
                        disabled={
                          !selectedMatch.redCompetitorId || selectedMatch.redCompetitorId === 'BYE'
                        }
                      >
                        Red Corner Wins
                      </button>
                      <div className="flex flex-row sm:flex-col gap-2 flex-1 justify-center">
                        <button
                          onClick={handleExtraTime}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 active:scale-95 cursor-pointer`}
                        >
                          ⏱️ Extra Time (1m)
                        </button>
                        <button
                          onClick={handleGoldenPoint}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border border-yellow-500/40 hover:border-yellow-500/70 active:scale-95 cursor-pointer`}
                        >
                          ⚡ Golden Point
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeclareWinner(selectedMatch.blueCompetitorId)}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer text-sm ${blueVotes > redVotes ? 'bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-[1.02] border-2 border-blue-400' : 'bg-blue-850 hover:bg-blue-750 text-blue-300 border border-blue-800/40'}`}
                        disabled={
                          !selectedMatch.blueCompetitorId ||
                          selectedMatch.blueCompetitorId === 'BYE'
                        }
                      >
                        Blue Corner Wins
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-4 md:p-6 bg-slate-900/60 border-t border-slate-800 flex flex-wrap justify-center gap-4 mt-auto shrink-0">
                  <button
                    className={`px-6 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all shadow-lg flex-1 max-w-xs cursor-pointer ${
                      status === MatchStatus.ACTIVE ||
                      status === MatchStatus.GOLDEN_POINT ||
                      status === MatchStatus.ENDED ||
                      selectedMatch.status === MatchStatus.COMPLETED ||
                      !isMatchStartable
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed shadow-none border border-slate-850'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:-translate-y-0.5 hover:shadow-emerald-500/20 active:scale-95 border border-emerald-500/30'
                    }`}
                    onClick={handleStart}
                    disabled={
                      status === MatchStatus.ACTIVE ||
                      status === MatchStatus.GOLDEN_POINT ||
                      status === MatchStatus.ENDED ||
                      selectedMatch.status === MatchStatus.COMPLETED ||
                      !isMatchStartable
                    }
                    title={!isMatchStartable ? 'Cannot start a match with TBD or BYE' : ''}
                  >
                    {status === MatchStatus.PAUSED ? '▶️ Resume' : '🏁 Start Combat'}
                  </button>

                  <button
                    className={`px-6 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all shadow-lg flex-1 max-w-xs cursor-pointer ${
                      !(status === MatchStatus.ACTIVE || status === MatchStatus.GOLDEN_POINT) ||
                      selectedMatch.status === MatchStatus.COMPLETED ||
                      !isMatchStartable
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed shadow-none border border-slate-850'
                        : 'bg-yellow-600 hover:bg-yellow-500 text-white hover:-translate-y-0.5 hover:shadow-yellow-500/20 active:scale-95 border border-yellow-500/30'
                    }`}
                    onClick={handlePause}
                    disabled={
                      !(status === MatchStatus.ACTIVE || status === MatchStatus.GOLDEN_POINT) ||
                      selectedMatch.status === MatchStatus.COMPLETED ||
                      !isMatchStartable
                    }
                  >
                    ⏸️ Pause
                  </button>

                  <button
                    className={`px-6 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all shadow-lg flex-1 max-w-xs cursor-pointer ${
                      status === MatchStatus.ENDED ||
                      selectedMatch.status === MatchStatus.COMPLETED ||
                      !isMatchStartable
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed shadow-none border border-slate-850'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-100 hover:-translate-y-0.5 hover:shadow-slate-800/20 active:scale-95 border border-slate-750'
                    }`}
                    onClick={handleEnd}
                    disabled={
                      status === MatchStatus.ENDED ||
                      selectedMatch.status === MatchStatus.COMPLETED ||
                      !isMatchStartable
                    }
                  >
                    🛑 Stop Match
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <Footer />
    </div>
  )
}
