import { AudioService } from '@corner-click/audio'
import {
  APP_MOTTO,
  APP_NAME,
  calculateNetScore,
  MatchStatus,
  SocketEvent,
  SocketRole,
  SYSTEM_OFFICIAL_TITLE,
} from '@corner-click/types'
import { get, onValue, ref } from 'firebase/database'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { database } from '../lib/firebase'
import { connectSocket, disconnectSocket } from '../lib/socketClient'
import { API_URL } from '../utils/apiClient'
import '../styles/global.css'

interface PublicScoreboardProps {
  areaId: string
}

interface AreaMatchData {
  matchId: string
  tournamentId: string
  categoryId: string
  redCompetitorId: string
  blueCompetitorId: string
  round: number
  nextMatchId?: string | null
}

interface ScoreData {
  redScore: number
  blueScore: number
  redWarnings: number
  blueWarnings: number
  redDeductions: number
  blueDeductions: number
}

const LABELS = {
  WAITING_MATCH: 'Esperando inicio de combate. La pantalla se actualizará automáticamente.',
  RED_CORNER: 'CORNER ROJO',
  BLUE_CORNER: 'CORNER AZUL',
  JUDGE_VOTES: 'VOTOS DE JUECES',
  CLOSED_SCOREBOARD: 'MARCADOR CERRADO',
  WAITING_JURY: 'ESPERANDO CONFIRMACIÓN DEL JURY',
  LOADING_CATEGORY: 'CARGANDO CATEGORÍA...',
  ROUND: 'Ronda',
  GOLDEN_POINT: 'PUNTO DE ORO',
  EXTRA_TIME: 'TIEMPO EXTRA',
  MATCH_TIME: 'TIEMPO DE COMBATE',
  BYE_DIRECT: 'BYE (Pase Directo)',
  LOADING: 'Cargando...',
  TBD: 'TBD',
  CHAMPIONSHIP_TITLE: 'ITF TAEKWONDO CHAMPIONSHIP',
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  [MatchStatus.PENDING]: 'PREPARADOS',
  [MatchStatus.ACTIVE]: 'EN COMBATE',
  [MatchStatus.PAUSED]: 'PAUSA',
  [MatchStatus.ENDED]: 'FINALIZADO',
  [MatchStatus.GOLDEN_POINT]: 'PUNTO DE ORO',
  [MatchStatus.COMPLETED]: 'COMPLETADO',
}

export default function PublicScoreboard({ areaId }: PublicScoreboardProps) {
  const [activeMatch, setActiveMatch] = useState<AreaMatchData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(120)
  const [matchStatus, setMatchStatus] = useState<MatchStatus>(MatchStatus.PENDING)

  const [competitors, setCompetitors] = useState<Record<string, { name: string; club: string }>>({})
  const [categoryName, setCategoryName] = useState<string>('')
  const [judgesData, setJudgesData] = useState<Record<string, ScoreData>>({})
  const [isExtraTime, setIsExtraTime] = useState<boolean>(false)

  const [firebaseConnected, setFirebaseConnected] = useState(true)
  const useLocal = !firebaseConnected

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected')
    const unsubscribe = onValue(connectedRef, (snap) => {
      setFirebaseConnected(snap.val() === true)
    })
    return () => unsubscribe()
  }, [])

  const prevStatusRef = useRef<MatchStatus | null>(null)
  const prevTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (
      prevStatusRef.current !== null &&
      prevStatusRef.current !== MatchStatus.ACTIVE &&
      matchStatus === MatchStatus.ACTIVE
    ) {
      AudioService.playGong()
    }
    prevStatusRef.current = matchStatus
  }, [matchStatus])

  useEffect(() => {
    if (
      timeRemaining === 0 &&
      prevTimeRef.current !== 0 &&
      prevTimeRef.current !== null &&
      (matchStatus === MatchStatus.ACTIVE || matchStatus === MatchStatus.GOLDEN_POINT)
    ) {
      AudioService.playBuzzer()
    }
    prevTimeRef.current = timeRemaining
  }, [timeRemaining, matchStatus])

  useEffect(() => {
    if (!useLocal) {
      return
    }

    const socket = connectSocket(areaId, SocketRole.SPECTATOR)

    socket.on(SocketEvent.MATCH_STATE, (state: any) => {
      if (state?.match) {
        setActiveMatch({
          matchId: state.match.id,
          tournamentId: state.match.tournamentId,
          categoryId: state.match.categoryId,
          redCompetitorId: state.match.redCompetitorId,
          blueCompetitorId: state.match.blueCompetitorId,
          round: state.match.round || 1,
          nextMatchId: state.match.nextMatchId || null,
        })
        setTimeRemaining(state.timer)
        setMatchStatus(state.match.status)
        setIsExtraTime(state.match.isExtraTime || false)
        if (state.scores) {
          setJudgesData(state.scores)
        }

        if (state.match.redCompetitorName) {
          setCompetitors((prev) => ({
            ...prev,
            [state.match.redCompetitorId]: {
              name: state.match.redCompetitorName,
              club: state.match.redCompetitorClub || '',
            },
          }))
        }
        if (state.match.blueCompetitorName) {
          setCompetitors((prev) => ({
            ...prev,
            [state.match.blueCompetitorId]: {
              name: state.match.blueCompetitorName,
              club: state.match.blueCompetitorClub || '',
            },
          }))
        }
      }
    })

    return () => {
      disconnectSocket()
    }
  }, [useLocal, areaId])

  useEffect(() => {
    if (useLocal) {
      return
    }
    const areaMatchRef = ref(database, `live_matches_by_area/${areaId}`)

    const unsubscribe = onValue(areaMatchRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as AreaMatchData
        setActiveMatch(data)

        const categoryRef = ref(
          database,
          `tournaments/${data.tournamentId}/categories/${data.categoryId}`
        )
        const catSnap = await get(categoryRef)
        if (catSnap.exists()) {
          setCategoryName(catSnap.val().name || '')
        }

        const competitorsRef = ref(database, `tournaments/${data.tournamentId}/competitors`)
        const compsSnap = await get(competitorsRef)
        if (compsSnap.exists()) {
          const compsData = compsSnap.val()
          const mapped: Record<string, { name: string; club: string }> = {}
          Object.keys(compsData).forEach((key) => {
            const c = compsData[key]
            mapped[key] = {
              name: `${c.firstName} ${c.lastName}`,
              club: c.club || '',
            }
          })
          setCompetitors(mapped)
        }
      } else {
        setActiveMatch(null)
      }
    })

    return () => unsubscribe()
  }, [areaId, useLocal])

  useEffect(() => {
    if (useLocal || !activeMatch) {
      return
    }

    const liveMatchRef = ref(database, `live_matches/${activeMatch.matchId}`)

    const unsubscribe = onValue(liveMatchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setTimeRemaining(data.timeRemaining !== undefined ? data.timeRemaining : 120)
        setMatchStatus(data.status || MatchStatus.PENDING)
        setIsExtraTime(data.isExtraTime || false)
        if (data.scores) {
          setJudgesData(data.scores)
        } else {
          setJudgesData({})
        }
      }
    })

    return () => unsubscribe()
  }, [activeMatch?.matchId, useLocal, activeMatch])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  let redVotes = 0
  let blueVotes = 0
  let tieVotes = 0
  let _totalRed = 0
  let _totalBlue = 0

  Object.values(judgesData).forEach((curr) => {
    const r = calculateNetScore(curr.redScore || 0, curr.redWarnings || 0, curr.redDeductions || 0)
    const b = calculateNetScore(
      curr.blueScore || 0,
      curr.blueWarnings || 0,
      curr.blueDeductions || 0
    )
    _totalRed += r
    _totalBlue += b
    if (r > b) {
      redVotes++
    } else if (b > r) {
      blueVotes++
    } else {
      tieVotes++
    }
  })

  const getCompName = (id: string) => {
    if (!id || id === '' || id.toUpperCase().includes('TBD')) {
      return LABELS.TBD
    }
    if (id === 'BYE') {
      return LABELS.BYE_DIRECT
    }
    return competitors[id]?.name || LABELS.LOADING
  }

  const getCompClub = (id: string) => {
    if (!id || id === '' || id.toUpperCase().includes('TBD') || id === 'BYE') {
      return ''
    }
    return competitors[id]?.club || ''
  }

  if (!activeMatch) {
    return (
      <div className="h-[100vh] w-[100vw] bg-slate-950 flex flex-col items-center justify-center text-white font-sans overflow-hidden relative">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center p-[4vw] bg-slate-900/40 rounded-[3vw] border border-slate-800 backdrop-blur-xl w-[60vw] max-w-[1200px] shadow-[0_0_80px_rgba(59,130,246,0.1)] relative z-10"
        >
          <motion.svg
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="w-[10vw] max-w-[150px] text-blue-500 mx-auto mb-[2vw] opacity-80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </motion.svg>
          <h2 className="text-[4vw] font-black uppercase tracking-[0.2em] mb-[1vw] text-slate-100">
            ÁREA {areaId}
          </h2>
          <p className="text-slate-400 text-[1.5vw] font-semibold tracking-wider">
            {LABELS.WAITING_MATCH}
          </p>
        </motion.div>

        {/* Ambient Lights */}
        <div className="absolute top-0 left-0 w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[10vw] pointer-events-none mix-blend-screen animate-pulse-slow"></div>
        <div
          className="absolute bottom-0 right-0 w-[50vw] h-[50vw] bg-purple-600/10 rounded-full blur-[10vw] pointer-events-none mix-blend-screen animate-pulse-slow"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>
    )
  }

  const getStatusLabel = (status: MatchStatus) => {
    if (isExtraTime && status === MatchStatus.ACTIVE) {
      return LABELS.EXTRA_TIME
    }
    return STATUS_LABELS[status] || status
  }

  const showFinalScores = matchStatus === MatchStatus.ENDED || matchStatus === MatchStatus.COMPLETED

  const timerColor =
    isExtraTime && matchStatus === MatchStatus.ACTIVE
      ? 'text-amber-400 drop-shadow-[0_0_5vh_rgba(245,158,11,0.6)]'
      : matchStatus === MatchStatus.ACTIVE
        ? 'text-emerald-400 drop-shadow-[0_0_5vh_rgba(52,211,153,0.6)]'
        : matchStatus === MatchStatus.GOLDEN_POINT
          ? 'text-amber-400 drop-shadow-[0_0_5vh_rgba(245,158,11,0.6)]'
          : 'text-slate-500 drop-shadow-none'

  return (
    <div className="h-[100vh] w-[100vw] bg-slate-950 text-slate-100 font-sans flex flex-col justify-between p-[3vh] px-[3vw] relative overflow-hidden select-none">
      {/* Cinematic Background */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[20vh] -left-[10vw] w-[60vw] h-[60vw] bg-rose-600/20 rounded-full filter blur-[15vw] pointer-events-none mix-blend-screen"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
        className="absolute -bottom-[20vh] -right-[10vw] w-[60vw] h-[60vw] bg-blue-600/20 rounded-full filter blur-[15vw] pointer-events-none mix-blend-screen"
      />

      {/* Top Header - TV Optimized */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="flex justify-between items-center bg-slate-900/70 border border-slate-800/80 px-[3vw] py-[2vh] rounded-[2vw] backdrop-blur-xl z-10 shadow-[0_2vh_5vh_rgba(0,0,0,0.5)]"
      >
        <div>
          <span className="text-emerald-400 font-black tracking-[0.3em] text-[2vh] uppercase drop-shadow-[0_0_1vw_rgba(52,211,153,0.3)]">
            {LABELS.CHAMPIONSHIP_TITLE}
          </span>
          <h1 className="text-[4vh] font-black uppercase tracking-tight mt-[0.5vh] text-slate-100 leading-none">
            {categoryName || LABELS.LOADING_CATEGORY}
          </h1>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="bg-slate-950 text-slate-100 font-black px-[2vw] py-[1vh] rounded-full border-2 border-slate-700 uppercase tracking-widest text-[3vh] shadow-lg whitespace-nowrap">
            ÁREA {areaId.toLowerCase().replace('area-', '')}
          </span>
          <div className="text-[2vh] mt-[1.5vh] font-bold tracking-widest">
            {!activeMatch.nextMatchId ? (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-[1.5vw] py-[0.5vh] rounded-full uppercase shadow-[0_0_2vw_rgba(245,158,11,0.2)]"
              >
                🏆 Final
              </motion.span>
            ) : (
              <span className="text-slate-400 uppercase">
                {LABELS.ROUND} {activeMatch.round}
              </span>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main Scoreboard Layout - TV Optimized */}
      <main className="flex-1 my-[3vh] flex items-stretch gap-[3vw] z-10 h-full overflow-hidden">
        {/* Red Corner Panel */}
        <motion.div
          initial={{ x: '-20vw', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 70,
            damping: 20,
            delay: 0.1,
          }}
          className="flex-1 bg-gradient-to-br from-rose-950/80 via-slate-900/50 to-slate-950/80 border-[0.3vw] border-rose-500/40 p-[3vw] rounded-[3vw] backdrop-blur-xl text-center flex flex-col justify-between shadow-[0_0_5vw_rgba(225,29,72,0.15)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(225,29,72,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] animate-[shine_5s_linear_infinite]" />

          <div className="pt-[1vh] relative z-10 flex flex-col items-center">
            <span className="bg-rose-600 text-white font-black text-[2vh] px-[2vw] py-[1vh] rounded-full tracking-widest uppercase shadow-lg shadow-rose-900/50 inline-block">
              {LABELS.RED_CORNER}
            </span>
            <h2 className="text-[6.5vh] leading-[1.1] font-black text-rose-500 mt-[2vh] tracking-tighter uppercase drop-shadow-[0_0_1vw_rgba(244,63,94,0.3)] line-clamp-2">
              {getCompName(activeMatch.redCompetitorId)}
            </h2>
            <p className="text-slate-400 text-[2.5vh] font-bold uppercase tracking-widest mt-[1vh]">
              {getCompClub(activeMatch.redCompetitorId)}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-[2vh] relative z-10">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={showFinalScores ? redVotes : '0'}
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.5, opacity: 0, y: -50 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={`text-[25vh] font-black leading-none font-mono tracking-tighter ${
                  showFinalScores
                    ? 'text-rose-500 drop-shadow-[0_0_3vw_rgba(244,63,94,0.8)]'
                    : 'text-slate-800/80 drop-shadow-none'
                }`}
              >
                {showFinalScores ? redVotes : 0}
              </motion.div>
            </AnimatePresence>
            <div className="text-rose-400 font-black uppercase tracking-[0.2em] text-[1.8vh] mt-[2vh] bg-rose-950/60 border border-rose-900/80 px-[2vw] py-[1vh] rounded-full shadow-inner backdrop-blur-md">
              {showFinalScores ? LABELS.JUDGE_VOTES : LABELS.CLOSED_SCOREBOARD}
            </div>
          </div>
          <div className="h-[2vh]"></div>
        </motion.div>

        {/* Center: TV Timer and Status */}
        <div className="w-[30vw] flex flex-col items-center justify-center text-center px-[2vw] h-full relative z-10">
          <div className="text-slate-400 font-black tracking-[0.3em] text-[2.5vh] uppercase drop-shadow-md">
            {matchStatus === MatchStatus.GOLDEN_POINT
              ? LABELS.GOLDEN_POINT
              : isExtraTime
                ? LABELS.EXTRA_TIME
                : LABELS.MATCH_TIME}
          </div>

          <motion.div
            layout
            className={`font-mono text-[16vh] font-black tracking-tighter leading-none my-[2vh] transition-colors duration-500 ${timerColor}`}
          >
            {formatTime(timeRemaining)}
          </motion.div>

          <motion.div layout className="mt-[1vh]">
            <span
              className={`px-[3vw] py-[1.5vh] rounded-full text-[2.2vh] font-black uppercase tracking-[0.2em] border-[0.2vw] shadow-[0_1vh_3vh_rgba(0,0,0,0.5)] inline-block transition-colors duration-500 ${
                matchStatus === MatchStatus.GOLDEN_POINT
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
                  : isExtraTime && matchStatus === MatchStatus.ACTIVE
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
                    : matchStatus === MatchStatus.ACTIVE
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 animate-pulse'
                      : matchStatus === MatchStatus.PAUSED
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                        : matchStatus === MatchStatus.ENDED
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                          : matchStatus === MatchStatus.PENDING
                            ? 'bg-slate-800/80 border-slate-600 text-slate-200'
                            : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              {getStatusLabel(matchStatus)}
            </span>
          </motion.div>

          <AnimatePresence>
            {showFinalScores && tieVotes > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="mt-[2vh] flex flex-col items-center justify-center"
              >
                <div className="text-[12vh] font-black text-slate-400 drop-shadow-[0_0_2vw_rgba(148,163,184,0.5)] leading-none font-mono">
                  {tieVotes}
                </div>
                <div className="text-slate-500 font-black uppercase tracking-[0.2em] text-[1.5vh] mt-[1vh] bg-slate-900/60 border border-slate-700/80 px-[2vw] py-[1vh] rounded-full shadow-inner backdrop-blur-md">
                  {tieVotes === 1 ? 'EMPATE' : 'EMPATES'}
                </div>
              </motion.div>
            )}

            {matchStatus === MatchStatus.ENDED && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-[4vh] text-slate-300 text-[2vh] font-black uppercase tracking-widest bg-slate-900/80 border border-slate-700/80 px-[3vw] py-[2vh] rounded-2xl animate-pulse backdrop-blur-md shadow-2xl"
              >
                {LABELS.WAITING_JURY}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Blue Corner Panel */}
        <motion.div
          initial={{ x: '20vw', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 70,
            damping: 20,
            delay: 0.1,
          }}
          className="flex-1 bg-gradient-to-br from-indigo-950/80 via-slate-900/50 to-slate-950/80 border-[0.3vw] border-blue-500/40 p-[3vw] rounded-[3vw] backdrop-blur-xl text-center flex flex-col justify-between shadow-[0_0_5vw_rgba(59,130,246,0.15)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(59,130,246,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] animate-[shine_5s_linear_infinite]" />

          <div className="pt-[1vh] relative z-10 flex flex-col items-center">
            <span className="bg-blue-600 text-white font-black text-[2vh] px-[2vw] py-[1vh] rounded-full tracking-widest uppercase shadow-lg shadow-blue-900/50 inline-block">
              {LABELS.BLUE_CORNER}
            </span>
            <h2 className="text-[6.5vh] leading-[1.1] font-black text-blue-500 mt-[2vh] tracking-tighter uppercase drop-shadow-[0_0_1vw_rgba(59,130,246,0.3)] line-clamp-2">
              {getCompName(activeMatch.blueCompetitorId)}
            </h2>
            <p className="text-slate-400 text-[2.5vh] font-bold uppercase tracking-widest mt-[1vh]">
              {getCompClub(activeMatch.blueCompetitorId)}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-[2vh] relative z-10">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={showFinalScores ? blueVotes : '0'}
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.5, opacity: 0, y: -50 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={`text-[25vh] font-black leading-none font-mono tracking-tighter ${
                  showFinalScores
                    ? 'text-blue-500 drop-shadow-[0_0_3vw_rgba(59,130,246,0.8)]'
                    : 'text-slate-800/80 drop-shadow-none'
                }`}
              >
                {showFinalScores ? blueVotes : 0}
              </motion.div>
            </AnimatePresence>
            <div className="text-blue-400 font-black uppercase tracking-[0.2em] text-[1.8vh] mt-[2vh] bg-blue-950/60 border border-blue-900/80 px-[2vw] py-[1vh] rounded-full shadow-inner backdrop-blur-md">
              {showFinalScores ? LABELS.JUDGE_VOTES : LABELS.CLOSED_SCOREBOARD}
            </div>
          </div>
          <div className="h-[2vh]"></div>
        </motion.div>
      </main>

      {/* Footer / Status Log - TV Optimized */}
      <motion.footer
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center bg-slate-900/50 border border-slate-800/60 py-[1.5vh] rounded-[1.5vw] z-10 text-slate-500 text-[1.5vh] font-black tracking-widest flex justify-between px-[4vw] gap-2 backdrop-blur-md"
      >
        <span>
          {APP_NAME.toUpperCase()} &copy; {new Date().getFullYear()}
        </span>
        <span className="italic text-slate-400">&ldquo;{APP_MOTTO}&rdquo;</span>
        <span>{SYSTEM_OFFICIAL_TITLE}</span>
      </motion.footer>

      {/* Add keyframes globally for shine effect */}
      <style>{`
        @keyframes shine {
          0% { background-position: -250px -250px; }
          100% { background-position: 250px 250px; }
        }
      `}</style>
    </div>
  )
}
