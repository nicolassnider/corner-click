import { trpc } from '@corner-click/api-client'
import { AudioService } from '@corner-click/audio'
import {
  CornerRole,
  calculateNetScore,
  MatchStatus,
  ScoreUpdateType,
  SocketEvent,
  SocketRole,
} from '@corner-click/types'
import { onValue, ref, set } from 'firebase/database'
import type React from 'react'
import { useEffect, useState } from 'react'
import { database } from '../lib/firebase'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socketClient'
import '../styles/global.css'

interface ScorePadProps {
  matchId: string
  cornerId: string
  areaId?: string
  judgeId?: string
  judgeName?: string
  onLogout?: () => void
  isOffline?: boolean
}

export default function ScorePad({
  matchId,
  cornerId,
  areaId = '1',
  judgeId = 'offline-judge-id',
  judgeName = 'Juez Offline',
  onLogout,
  isOffline = false,
}: ScorePadProps) {
  const submitScoresMutation = trpc.matches.submitScores.useMutation()
  const [redScore, setRedScore] = useState(0)
  const [blueScore, setBlueScore] = useState(0)

  const [redWarnings, setRedWarnings] = useState(0)
  const [blueWarnings, setBlueWarnings] = useState(0)

  const [redDeductions, setRedDeductions] = useState(0)
  const [blueDeductions, setBlueDeductions] = useState(0)

  const [touchHandled, setTouchHandled] = useState(false)
  const [pressedButton, setPressedButton] = useState<string | null>(null)

  const [matchStatus, setMatchStatus] = useState<MatchStatus>(
    isOffline ? MatchStatus.ACTIVE : MatchStatus.PENDING
  )

  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
    }
  }, [])

  const [firebaseConnected, setFirebaseConnected] = useState(true)
  const useLocal = isOffline || !firebaseConnected

  useEffect(() => {
    if (isOffline) {
      setFirebaseConnected(false)
      return
    }
    const connectedRef = ref(database, '.info/connected')
    const unsubscribe = onValue(connectedRef, (snap) => {
      setFirebaseConnected(snap.val() === true)
    })
    return () => unsubscribe()
  }, [isOffline])

  useEffect(() => {
    if (!useLocal) {
      return
    }
    const socket = connectSocket(areaId, SocketRole.JUDGE, judgeId, judgeName, cornerId)
    socket.on(SocketEvent.MATCH_STATE, (state: any) => {
      if (state?.match && state.match.id === matchId) {
        setMatchStatus(state.match.status)
      }
    })
    return () => disconnectSocket()
  }, [useLocal, matchId, areaId, judgeId, judgeName, cornerId])

  useEffect(() => {
    if (useLocal) {
      return
    }
    const statusRef = ref(database, `live_matches/${matchId}/status`)
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setMatchStatus(snapshot.val())
      }
    })
    return () => unsubscribe()
  }, [matchId, useLocal])

  const displayRedScore = calculateNetScore(redScore, redWarnings, redDeductions)
  const displayBlueScore = calculateNetScore(blueScore, blueWarnings, blueDeductions)

  useEffect(() => {
    if (matchStatus === MatchStatus.ENDED) {
      submitScoresMutation.mutate({
        matchId,
        cornerId,
        redScore,
        blueScore,
        redWarnings,
        blueWarnings,
        redDeductions,
        blueDeductions,
      })
    }
  }, [
    matchStatus,
    matchId,
    cornerId,
    redScore,
    blueScore,
    redWarnings,
    blueWarnings,
    redDeductions,
    blueDeductions,
    submitScoresMutation.mutate,
  ])

  useEffect(() => {
    if (useLocal) {
      return
    }
    if (matchStatus === MatchStatus.ACTIVE || matchStatus === MatchStatus.GOLDEN_POINT) {
      const scoreRef = ref(database, `live_matches/${matchId}/scores/${cornerId}`)
      set(scoreRef, {
        redScore,
        blueScore,
        redWarnings,
        blueWarnings,
        redDeductions,
        blueDeductions,
      }).catch((err) => console.error('Failed to sync live scores:', err))
    }
  }, [
    redScore,
    blueScore,
    redWarnings,
    blueWarnings,
    redDeductions,
    blueDeductions,
    matchStatus,
    useLocal,
    matchId,
    cornerId,
  ])

  const handleScore = (
    color: CornerRole,
    points: number,
    _e?: React.TouchEvent | React.MouseEvent
  ) => {
    console.log('handleScore called', {
      color,
      points,
      matchStatus,
      isOffline,
    })

    if (matchStatus !== MatchStatus.ACTIVE && matchStatus !== MatchStatus.GOLDEN_POINT) {
      console.log('handleScore blocked by matchStatus:', matchStatus)
      return
    }

    AudioService.playClick()
    if (color === CornerRole.RED) {
      setRedScore((prev) => prev + points)
    }
    if (color === CornerRole.BLUE) {
      setBlueScore((prev) => prev + points)
    }

    // Only emit to socket if using local network mode (not offline mode)
    if (useLocal && !isOffline) {
      const socket = getSocket()
      socket.emit(SocketEvent.JUDGE_SCORE_UPDATE, {
        areaId,
        matchId,
        judgeId,
        corner: color === CornerRole.RED ? 'red' : 'blue',
        type: ScoreUpdateType.POINT,
        value: points,
      })
    }
  }

  const handleScoreTouchStart = (color: CornerRole, points: number, _e: React.TouchEvent) => {
    // e.preventDefault(); // Passive event warning fix
    const buttonId = `${color}-${points}`
    setPressedButton(buttonId)
  }

  const handleScoreTouch = (color: CornerRole, points: number, e: React.TouchEvent) => {
    setTouchHandled(true)
    handleScore(color, points, e)
    setTimeout(() => setPressedButton(null), 150)
  }

  const handleScoreClick = (color: CornerRole, points: number) => {
    if (touchHandled) {
      setTouchHandled(false)
      return
    }
    handleScore(color, points)
  }

  const handleWarning = (color: CornerRole, _e?: React.TouchEvent | React.MouseEvent) => {
    if (matchStatus !== MatchStatus.ACTIVE && matchStatus !== MatchStatus.GOLDEN_POINT) {
      return
    }

    AudioService.playClick()
    if (color === CornerRole.RED) {
      setRedWarnings((prev) => prev + 1)
    }
    if (color === CornerRole.BLUE) {
      setBlueWarnings((prev) => prev + 1)
    }

    // Only emit to socket if using local network mode (not offline mode)
    if (useLocal && !isOffline) {
      const socket = getSocket()
      socket.emit(SocketEvent.JUDGE_SCORE_UPDATE, {
        areaId,
        matchId,
        judgeId,
        corner: color === CornerRole.RED ? 'red' : 'blue',
        type: ScoreUpdateType.WARNING,
        value: 1,
      })
    }
  }

  const handleWarningTouchStart = (color: CornerRole, _e: React.TouchEvent) => {
    // e.preventDefault();
    const buttonId = `${color}-warn`
    setPressedButton(buttonId)
  }

  const handleWarningTouch = (color: CornerRole, e: React.TouchEvent) => {
    setTouchHandled(true)
    handleWarning(color, e)
    setTimeout(() => setPressedButton(null), 150)
  }

  const handleWarningClick = (color: CornerRole) => {
    if (touchHandled) {
      setTouchHandled(false)
      return
    }
    handleWarning(color)
  }

  const handleDeduction = (color: CornerRole, _e?: React.TouchEvent | React.MouseEvent) => {
    if (matchStatus !== MatchStatus.ACTIVE && matchStatus !== MatchStatus.GOLDEN_POINT) {
      return
    }

    AudioService.playClick()
    if (color === CornerRole.RED) {
      setRedDeductions((prev) => prev + 1)
    }
    if (color === CornerRole.BLUE) {
      setBlueDeductions((prev) => prev + 1)
    }

    // Only emit to socket if using local network mode (not offline mode)
    if (useLocal && !isOffline) {
      const socket = getSocket()
      socket.emit(SocketEvent.JUDGE_SCORE_UPDATE, {
        areaId,
        matchId,
        judgeId,
        corner: color === CornerRole.RED ? 'red' : 'blue',
        type: ScoreUpdateType.DEDUCTION,
        value: 1,
      })
    }
  }

  const handleDeductionTouchStart = (color: CornerRole, _e: React.TouchEvent) => {
    // e.preventDefault();
    const buttonId = `${color}-deduct`
    setPressedButton(buttonId)
  }

  const handleDeductionTouch = (color: CornerRole, e: React.TouchEvent) => {
    setTouchHandled(true)
    handleDeduction(color, e)
    setTimeout(() => setPressedButton(null), 150)
  }

  const handleDeductionClick = (color: CornerRole) => {
    if (touchHandled) {
      setTouchHandled(false)
      return
    }
    handleDeduction(color)
  }

  return (
    <div
      className="flex flex-col h-[100dvh] w-screen bg-slate-950 overflow-hidden text-slate-100 font-sans touch-manipulation select-none relative"
      onTouchStart={() => {}}
    >
      {/* Top Bar Glassmorphism */}
      <div className="flex justify-between items-center px-4 py-3 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 z-30">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-black tracking-[0.2em] uppercase text-[10px]">
            CORNER CLICK
          </span>
          {useLocal && (
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              LOCAL
            </span>
          )}
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-white text-[10px] font-black uppercase tracking-widest bg-rose-600/90 hover:bg-rose-500 px-4 py-1.5 rounded-lg shadow-lg active:scale-95 transition-all border border-rose-500/50"
          >
            Salir
          </button>
        )}
      </div>

      {/* Scoreboard Header */}
      <div className="flex-none bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl z-20 pb-4 relative pt-2">
        <div className="flex items-center justify-between px-6 py-2">
          {/* Red Score */}
          <div className="flex flex-col items-center w-[40%]">
            <span className="text-rose-500 font-black tracking-widest text-xs mb-1">ROJO</span>
            <span className="text-6xl font-black tabular-nums text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              {displayRedScore}
            </span>
            <div className="flex gap-2 text-[10px] uppercase text-rose-300 font-bold mt-2 bg-rose-950/40 border border-rose-900/50 px-3 py-1 rounded-full shadow-inner">
              <span>W:{redWarnings}</span>
              <span>D:{redDeductions}</span>
            </div>
          </div>

          <div className="text-slate-700 font-black text-2xl tracking-[0.3em] opacity-40 w-[20%] text-center">
            VS
          </div>

          {/* Blue Score */}
          <div className="flex flex-col items-center w-[40%]">
            <span className="text-blue-500 font-black tracking-widest text-xs mb-1">AZUL</span>
            <span className="text-6xl font-black tabular-nums text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              {displayBlueScore}
            </span>
            <div className="flex gap-2 text-[10px] uppercase text-blue-300 font-bold mt-2 bg-blue-950/40 border border-blue-900/50 px-3 py-1 rounded-full shadow-inner">
              <span>W:{blueWarnings}</span>
              <span>D:{blueDeductions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Area (Side by Side) */}
      <div className="flex-1 flex w-full relative z-10 p-2 gap-2">
        {/* Overlay when scoring is disabled */}
        {matchStatus !== MatchStatus.ACTIVE && matchStatus !== MatchStatus.GOLDEN_POINT && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md">
            <div className="bg-amber-500 text-slate-950 px-8 py-6 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center border-4 border-amber-400 animate-pulse-slow">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                ></path>
              </svg>
              <h2 className="text-3xl font-black uppercase tracking-widest text-center">Espera</h2>
              <p className="text-sm font-bold uppercase opacity-70 mt-2 tracking-wider">
                Status: {matchStatus}
              </p>
            </div>
          </div>
        )}

        {/* RED CONTROLS (LEFT HALF) */}
        <div className="flex-1 flex flex-col gap-2 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-rose-600/10 to-transparent rounded-3xl pointer-events-none" />

          <button
            onTouchStart={(e) => handleScoreTouchStart(CornerRole.RED, 1, e)}
            onTouchEnd={(e) => handleScoreTouch(CornerRole.RED, 1, e)}
            onClick={() => handleScoreClick(CornerRole.RED, 1)}
            className={`flex-[3] bg-rose-600 hover:bg-rose-500 text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(225,29,72,0.3)] border-t border-rose-400/30 active:scale-95 transition-all cursor-pointer relative overflow-hidden group ${pressedButton === 'RED-1' ? 'scale-95' : ''}`}
          >
            <div
              className={`absolute inset-0 bg-white/10 transition-opacity ${pressedButton === 'RED-1' ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className="text-7xl font-black drop-shadow-md">+1</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-90 mt-2">
              Mano
            </span>
          </button>

          <button
            onTouchStart={(e) => handleScoreTouchStart(CornerRole.RED, 2, e)}
            onTouchEnd={(e) => handleScoreTouch(CornerRole.RED, 2, e)}
            onClick={() => handleScoreClick(CornerRole.RED, 2)}
            className={`flex-[3] bg-rose-600 hover:bg-rose-500 text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(225,29,72,0.3)] border-t border-rose-400/30 active:scale-95 transition-all cursor-pointer relative overflow-hidden group ${pressedButton === 'RED-2' ? 'scale-95' : ''}`}
          >
            <div
              className={`absolute inset-0 bg-white/10 transition-opacity ${pressedButton === 'RED-2' ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className="text-7xl font-black drop-shadow-md">+2</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-90 mt-2">
              Patada M
            </span>
          </button>

          <button
            onTouchStart={(e) => handleScoreTouchStart(CornerRole.RED, 3, e)}
            onTouchEnd={(e) => handleScoreTouch(CornerRole.RED, 3, e)}
            onClick={() => handleScoreClick(CornerRole.RED, 3)}
            className={`flex-[3] bg-rose-600 hover:bg-rose-500 text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(225,29,72,0.3)] border-t border-rose-400/30 active:scale-95 transition-all cursor-pointer relative overflow-hidden group ${pressedButton === 'RED-3' ? 'scale-95' : ''}`}
          >
            <div
              className={`absolute inset-0 bg-white/10 transition-opacity ${pressedButton === 'RED-3' ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className="text-7xl font-black drop-shadow-md">+3</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-90 mt-2">
              Patada A
            </span>
          </button>

          <div className="flex gap-2 mt-1 flex-[1.5]">
            <button
              onTouchStart={(e) => handleWarningTouchStart(CornerRole.RED, e)}
              onTouchEnd={(e) => handleWarningTouch(CornerRole.RED, e)}
              onClick={() => handleWarningClick(CornerRole.RED)}
              className={`flex-1 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center text-xs cursor-pointer border-t border-amber-300/50 ${pressedButton === 'RED-warn' ? 'scale-95' : ''}`}
            >
              Warn
            </button>
            <button
              onTouchStart={(e) => handleDeductionTouchStart(CornerRole.RED, e)}
              onTouchEnd={(e) => handleDeductionTouch(CornerRole.RED, e)}
              onClick={() => handleDeductionClick(CornerRole.RED)}
              className={`flex-1 bg-slate-900 border-2 border-rose-900/50 hover:border-rose-700 hover:bg-slate-800 text-rose-500 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center text-xs cursor-pointer ${pressedButton === 'RED-deduct' ? 'scale-95' : ''}`}
            >
              Dedct
            </button>
          </div>
        </div>

        {/* BLUE CONTROLS (RIGHT HALF) */}
        <div className="flex-1 flex flex-col gap-2 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent rounded-3xl pointer-events-none" />

          <button
            onTouchStart={(e) => handleScoreTouchStart(CornerRole.BLUE, 1, e)}
            onTouchEnd={(e) => handleScoreTouch(CornerRole.BLUE, 1, e)}
            onClick={() => handleScoreClick(CornerRole.BLUE, 1)}
            className={`flex-[3] bg-blue-600 hover:bg-blue-500 text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(37,99,235,0.3)] border-t border-blue-400/30 active:scale-95 transition-all cursor-pointer relative overflow-hidden group ${pressedButton === 'BLUE-1' ? 'scale-95' : ''}`}
          >
            <div
              className={`absolute inset-0 bg-white/10 transition-opacity ${pressedButton === 'BLUE-1' ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className="text-7xl font-black drop-shadow-md">+1</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-90 mt-2">
              Mano
            </span>
          </button>

          <button
            onTouchStart={(e) => handleScoreTouchStart(CornerRole.BLUE, 2, e)}
            onTouchEnd={(e) => handleScoreTouch(CornerRole.BLUE, 2, e)}
            onClick={() => handleScoreClick(CornerRole.BLUE, 2)}
            className={`flex-[3] bg-blue-600 hover:bg-blue-500 text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(37,99,235,0.3)] border-t border-blue-400/30 active:scale-95 transition-all cursor-pointer relative overflow-hidden group ${pressedButton === 'BLUE-2' ? 'scale-95' : ''}`}
          >
            <div
              className={`absolute inset-0 bg-white/10 transition-opacity ${pressedButton === 'BLUE-2' ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className="text-7xl font-black drop-shadow-md">+2</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-90 mt-2">
              Patada M
            </span>
          </button>

          <button
            onTouchStart={(e) => handleScoreTouchStart(CornerRole.BLUE, 3, e)}
            onTouchEnd={(e) => handleScoreTouch(CornerRole.BLUE, 3, e)}
            onClick={() => handleScoreClick(CornerRole.BLUE, 3)}
            className={`flex-[3] bg-blue-600 hover:bg-blue-500 text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(37,99,235,0.3)] border-t border-blue-400/30 active:scale-95 transition-all cursor-pointer relative overflow-hidden group ${pressedButton === 'BLUE-3' ? 'scale-95' : ''}`}
          >
            <div
              className={`absolute inset-0 bg-white/10 transition-opacity ${pressedButton === 'BLUE-3' ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className="text-7xl font-black drop-shadow-md">+3</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-90 mt-2">
              Patada A
            </span>
          </button>

          <div className="flex gap-2 mt-1 flex-[1.5]">
            <button
              onTouchStart={(e) => handleWarningTouchStart(CornerRole.BLUE, e)}
              onTouchEnd={(e) => handleWarningTouch(CornerRole.BLUE, e)}
              onClick={() => handleWarningClick(CornerRole.BLUE)}
              className={`flex-1 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center text-xs cursor-pointer border-t border-amber-300/50 ${pressedButton === 'BLUE-warn' ? 'scale-95' : ''}`}
            >
              Warn
            </button>
            <button
              onTouchStart={(e) => handleDeductionTouchStart(CornerRole.BLUE, e)}
              onTouchEnd={(e) => handleDeductionTouch(CornerRole.BLUE, e)}
              onClick={() => handleDeductionClick(CornerRole.BLUE)}
              className={`flex-1 bg-slate-900 border-2 border-blue-900/50 hover:border-blue-700 hover:bg-slate-800 text-blue-500 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center text-xs cursor-pointer ${pressedButton === 'BLUE-deduct' ? 'scale-95' : ''}`}
            >
              Dedct
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
