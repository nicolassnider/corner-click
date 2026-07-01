import { trpc } from '@corner-click/api-client'
import { AudioService } from '@corner-click/audio'
import type { Competitor, Match } from '@corner-click/types'
import { MatchControlAction, MatchStatus, SocketEvent, SocketRole } from '@corner-click/types'
import { useEffect, useState } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socketClient'
import { getMatches } from '../services/bracketService'

interface ScoreData {
  redScore: number
  blueScore: number
  redWarnings: number
  blueWarnings: number
  redDeductions: number
  blueDeductions: number
}

export const useActiveMatch = (
  selectedMatch: Match | null,
  selectedTournamentId: string,
  selectedCategoryId: string,
  onMatchesRefreshed: (matches: Match[], currentMatch: Match) => void,
  competitors?: Record<string, Competitor>,
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
) => {
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.PENDING)
  const [timeRemaining, setTimeRemaining] = useState(120) // 2 minutes in seconds
  const [judgesData, setJudgesData] = useState<Record<string, ScoreData>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExtraTime, setIsExtraTime] = useState(false)
  const [wasGoldenPoint, setWasGoldenPoint] = useState(false)
  const [firebaseConnected, setFirebaseConnected] = useState(true)

  const updateStatusMutation = trpc.matches.updateStatus.useMutation()
  const declareWinnerMutation = trpc.matches.declareWinner.useMutation()

  // Consolidate Judge votes (calculated on every render from state)
  let redVotes = 0
  let blueVotes = 0
  let tieVotes = 0
  let totalRed = 0
  let totalBlue = 0

  Object.values(judgesData).forEach((curr: ScoreData) => {
    const r =
      (curr.redScore || 0) - Math.floor((curr.redWarnings || 0) / 3) - (curr.redDeductions || 0)
    const b =
      (curr.blueScore || 0) - Math.floor((curr.blueWarnings || 0) / 3) - (curr.blueDeductions || 0)
    totalRed += r
    totalBlue += b
    if (r > b) {
      redVotes++
    } else if (b > r) {
      blueVotes++
    } else {
      tieVotes++
    }
  })

  const isMatchStartable = !!(
    selectedMatch?.redCompetitorId &&
    selectedMatch.redCompetitorId !== 'BYE' &&
    selectedMatch.blueCompetitorId &&
    selectedMatch.blueCompetitorId !== 'BYE'
  )

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const updateMatchStatus = async (newStatus: MatchStatus, extraTimeOverride?: boolean) => {
    if (!selectedMatch) {
      return
    }
    AudioService.playBeep()
    const nextExtraTime = extraTimeOverride !== undefined ? extraTimeOverride : isExtraTime

    if (extraTimeOverride !== undefined) {
      setIsExtraTime(extraTimeOverride)
    }

    if (newStatus === MatchStatus.GOLDEN_POINT) {
      setWasGoldenPoint(true)
    } else if (newStatus === MatchStatus.ENDED || newStatus === MatchStatus.PENDING) {
      setWasGoldenPoint(false)
    }

    // Always use WebSockets for real-time state sync
    setStatus(newStatus)
    const socket = getSocket()
    socket.emit(SocketEvent.MATCH_CONTROL, {
      areaId: selectedMatch.areaId,
      matchId: selectedMatch.id,
      action:
        newStatus === MatchStatus.ACTIVE
          ? MatchControlAction.START
          : newStatus === MatchStatus.PAUSED
            ? MatchControlAction.PAUSE
            : newStatus === MatchStatus.GOLDEN_POINT
              ? MatchControlAction.GOLDEN_POINT
              : MatchControlAction.END,
      matchData: { status: newStatus, isExtraTime: nextExtraTime },
    })

    // Also persist critical state changes via TRPC (e.g. ENDED or COMPLETED)
    if (newStatus === MatchStatus.ENDED || newStatus === MatchStatus.COMPLETED) {
      try {
        await updateStatusMutation.mutateAsync({
          matchId: selectedMatch.id,
          status: newStatus,
          isExtraTime: nextExtraTime,
        })
      } catch (err) {
        console.error('Failed to update status in DB', err)
      }
    }
  }

  const handleStart = () =>
    updateMatchStatus(wasGoldenPoint ? MatchStatus.GOLDEN_POINT : MatchStatus.ACTIVE)
  const handlePause = () => updateMatchStatus(MatchStatus.PAUSED)
  const handleEnd = () => updateMatchStatus(MatchStatus.ENDED, false)
  const handleExtraTime = () => {
    setTimeRemaining(60)
    updateMatchStatus(MatchStatus.ACTIVE, true)
    showToast?.('Tiempo extra iniciado (1 Minuto)', 'warning')
  }
  const handleGoldenPoint = () => {
    updateMatchStatus(MatchStatus.GOLDEN_POINT, false)
    showToast?.('¡Punto de Oro iniciado! Muerte súbita activa.', 'warning')
  }

  const handleDeclareWinner = async (winnerId: string) => {
    if (!selectedMatch) {
      return
    }
    AudioService.playBeep()

    try {
      await declareWinnerMutation.mutateAsync({
        matchId: selectedMatch.id,
        winnerId,
        tournamentId: selectedTournamentId,
        nextMatchId: selectedMatch.nextMatchId || undefined,
      })
      const updatedMatches = await getMatches(selectedTournamentId, selectedCategoryId)

      const updatedSelectedMatch = updatedMatches.find((m) => m.id === selectedMatch.id)
      if (updatedSelectedMatch) {
        onMatchesRefreshed(updatedMatches, updatedSelectedMatch)
        setStatus(MatchStatus.COMPLETED)
      }

      // Notify via socket to end match for everyone
      const socket = getSocket()
      socket.emit(SocketEvent.MATCH_CONTROL, {
        areaId: selectedMatch.areaId,
        matchId: selectedMatch.id,
        action: MatchControlAction.END,
        matchData: {
          winnerId,
          status: MatchStatus.COMPLETED,
          isExtraTime: false,
        },
      })

      showToast?.('¡Ganador declarado y llave actualizada!', 'success')
    } catch (err) {
      console.error(err)
      showToast?.('Error al declarar el ganador y avanzar llave.', 'error')
    }
  }

  // Socket Connection and Setup
  useEffect(() => {
    if (!selectedMatch) {
      return
    }

    const socket = connectSocket(selectedMatch.areaId, SocketRole.ADMIN)
    
    const redComp = competitors?.[selectedMatch.redCompetitorId]
    const blueComp = competitors?.[selectedMatch.blueCompetitorId]

    // Announce active match to socket server
    socket.emit(SocketEvent.MATCH_CONTROL, {
      areaId: selectedMatch.areaId,
      matchId: selectedMatch.id,
      action: MatchControlAction.SET_MATCH,
      matchData: {
        ...selectedMatch,
        redCompetitorName: redComp ? `${redComp.firstName} ${redComp.lastName}` : 'TBD',
        redCompetitorClub: redComp ? redComp.club : '',
        blueCompetitorName: blueComp ? `${blueComp.firstName} ${blueComp.lastName}` : 'TBD',
        blueCompetitorClub: blueComp ? blueComp.club : '',
      },
      timerValue: timeRemaining,
    })

    const onMatchState = (state: any) => {
      if (state?.match && state.match.id === selectedMatch.id) {
        setStatus(state.match.status)
        setTimeRemaining(state.timer)
        setIsExtraTime(state.match.isExtraTime || false)
        if (state.scores) {
          setJudgesData(state.scores)
        }
      }
    }

    socket.on(SocketEvent.MATCH_STATE, onMatchState)
    setIsLoaded(true)

    return () => {
      socket.off(SocketEvent.MATCH_STATE, onMatchState)
      disconnectSocket()
    }
  }, [selectedMatch?.id, selectedMatch?.areaId])

  // Auto-declare winner during Golden Point when consensus is reached
  useEffect(() => {
    if (status !== MatchStatus.GOLDEN_POINT || !selectedMatch) {
      return
    }

    const numJudges = Object.keys(judgesData).length
    const consensusThreshold = numJudges > 0 ? Math.ceil((numJudges + 1) / 2) : 3

    if (redVotes >= consensusThreshold) {
      handleDeclareWinner(selectedMatch.redCompetitorId)
    } else if (blueVotes >= consensusThreshold) {
      handleDeclareWinner(selectedMatch.blueCompetitorId)
    }
  }, [redVotes, blueVotes, status, judgesData, selectedMatch, handleDeclareWinner])

  // Countdown timer interval
  useEffect(() => {
    let interval: any = null
    if (status === MatchStatus.ACTIVE && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const next = prev - 1
          if (selectedMatch) {
            const socket = getSocket()
            socket.emit(SocketEvent.MATCH_CONTROL, {
              areaId: selectedMatch.areaId,
              matchId: selectedMatch.id,
              action: MatchControlAction.TIMER_TICK,
              timerValue: next,
            })
          }
          return next
        })
      }, 1000)
    } else if (timeRemaining === 0 && status === MatchStatus.ACTIVE) {
      updateMatchStatus(MatchStatus.ENDED)
    }
    return () => clearInterval(interval)
  }, [status, timeRemaining, selectedMatch?.id, updateMatchStatus, selectedMatch])

  return {
    status,
    setStatus,
    timeRemaining,
    setTimeRemaining,
    judgesData,
    isLoaded,
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
    isExtraTime,
  }
}
