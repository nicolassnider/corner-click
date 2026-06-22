import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, get } from "firebase/database";
import { database } from "../lib/firebase";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../lib/socketClient";
import {
  MatchStatus,
  AUTHOR_NAME,
  APP_MOTTO,
  calculateNetScore,
  SocketEvent,
  SocketRole,
  APP_NAME,
  SYSTEM_OFFICIAL_TITLE,
} from "@corner-click/types";
import { AudioService } from "@corner-click/audio";
import { API_URL } from "../utils/apiClient";
import "../styles/global.css";

interface PublicScoreboardProps {
  areaId: string;
}

interface AreaMatchData {
  matchId: string;
  tournamentId: string;
  categoryId: string;
  redCompetitorId: string;
  blueCompetitorId: string;
  round: number;
  nextMatchId?: string | null;
}

interface ScoreData {
  redScore: number;
  blueScore: number;
  redWarnings: number;
  blueWarnings: number;
  redDeductions: number;
  blueDeductions: number;
}

// UI Spanish Translation Constants to eliminate magic strings
const LABELS = {
  WAITING_MATCH:
    "Esperando inicio de combate. La pantalla se actualizará automáticamente.",
  RED_CORNER: "CORNER ROJO",
  BLUE_CORNER: "CORNER AZUL",
  JUDGE_VOTES: "VOTOS DE JUECES",
  CLOSED_SCOREBOARD: "MARCADOR CERRADO",
  WAITING_JURY: "ESPERANDO CONFIRMACIÓN DEL JURY",
  LOADING_CATEGORY: "CARGANDO CATEGORÍA...",
  ROUND: "Ronda",
  GOLDEN_POINT: "PUNTO DE ORO",
  EXTRA_TIME: "TIEMPO EXTRA",
  MATCH_TIME: "TIEMPO DE COMBATE",
  BYE_DIRECT: "BYE (Pase Directo)",
  LOADING: "Cargando...",
  TBD: "TBD",
  CHAMPIONSHIP_TITLE: "ITF TAEKWONDO CHAMPIONSHIP",
};

const STATUS_LABELS: Record<MatchStatus, string> = {
  [MatchStatus.PENDING]: "PREPARADOS",
  [MatchStatus.ACTIVE]: "EN COMBATE",
  [MatchStatus.PAUSED]: "PAUSA",
  [MatchStatus.ENDED]: "FINALIZADO",
  [MatchStatus.GOLDEN_POINT]: "PUNTO DE ORO",
  [MatchStatus.COMPLETED]: "COMPLETADO",
};

export default function PublicScoreboard({ areaId }: PublicScoreboardProps) {
  const [activeMatch, setActiveMatch] = useState<AreaMatchData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>(
    MatchStatus.PENDING,
  );

  const [competitors, setCompetitors] = useState<
    Record<string, { name: string; club: string }>
  >({});
  const [categoryName, setCategoryName] = useState<string>("");
  const [judgesData, setJudgesData] = useState<Record<string, ScoreData>>({});
  const [isExtraTime, setIsExtraTime] = useState<boolean>(false);

  const [firebaseConnected, setFirebaseConnected] = useState(true);
  const useLocal = !firebaseConnected;

  // Track Firebase connection state
  useEffect(() => {
    const connectedRef = ref(database, ".info/connected");
    const unsubscribe = onValue(connectedRef, (snap) => {
      setFirebaseConnected(snap.val() === true);
    });
    return () => unsubscribe();
  }, []);

  const prevStatusRef = useRef<MatchStatus | null>(null);
  const prevTimeRef = useRef<number | null>(null);

  // Play start gong when status changes to ACTIVE
  useEffect(() => {
    if (
      prevStatusRef.current !== null &&
      prevStatusRef.current !== MatchStatus.ACTIVE &&
      matchStatus === MatchStatus.ACTIVE
    ) {
      AudioService.playGong();
    }
    prevStatusRef.current = matchStatus;
  }, [matchStatus]);

  // Play buzzer when time reaches 00:00 while the match is active
  useEffect(() => {
    if (
      timeRemaining === 0 &&
      prevTimeRef.current !== 0 &&
      prevTimeRef.current !== null &&
      (matchStatus === MatchStatus.ACTIVE ||
        matchStatus === MatchStatus.GOLDEN_POINT)
    ) {
      AudioService.playBuzzer();
    }
    prevTimeRef.current = timeRemaining;
  }, [timeRemaining, matchStatus]);

  // Connect to local WebSocket fallback if offline
  useEffect(() => {
    if (!useLocal) return;

    const socket = connectSocket(areaId, SocketRole.SPECTATOR);

    socket.on(SocketEvent.MATCH_STATE, (state: any) => {
      if (state && state.match) {
        setActiveMatch({
          matchId: state.match.id,
          tournamentId: state.match.tournamentId,
          categoryId: state.match.categoryId,
          redCompetitorId: state.match.redCompetitorId,
          blueCompetitorId: state.match.blueCompetitorId,
          round: state.match.round || 1,
          nextMatchId: state.match.nextMatchId || null,
        });
        setTimeRemaining(state.timer);
        setMatchStatus(state.match.status);
        setIsExtraTime(state.match.isExtraTime || false);
        if (state.scores) {
          setJudgesData(state.scores);
        }

        // Map competitor names from socket payload for offline layout mapping
        if (state.match.redCompetitorName) {
          setCompetitors((prev) => ({
            ...prev,
            [state.match.redCompetitorId]: {
              name: state.match.redCompetitorName,
              club: state.match.redCompetitorClub || "",
            },
          }));
        }
        if (state.match.blueCompetitorName) {
          setCompetitors((prev) => ({
            ...prev,
            [state.match.blueCompetitorId]: {
              name: state.match.blueCompetitorName,
              club: state.match.blueCompetitorClub || "",
            },
          }));
        }
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [useLocal, areaId]);

  // 1. Listen to active match of the Area (Online only)
  useEffect(() => {
    if (useLocal) return;
    const areaMatchRef = ref(database, `live_matches_by_area/${areaId}`);

    const unsubscribe = onValue(areaMatchRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as AreaMatchData;
        setActiveMatch(data);

        // Fetch category details
        const categoryRef = ref(
          database,
          `tournaments/${data.tournamentId}/categories/${data.categoryId}`,
        );
        const catSnap = await get(categoryRef);
        if (catSnap.exists()) {
          setCategoryName(catSnap.val().name || "");
        }

        // Fetch all competitors of the tournament for mapping
        const competitorsRef = ref(
          database,
          `tournaments/${data.tournamentId}/competitors`,
        );
        const compsSnap = await get(competitorsRef);
        if (compsSnap.exists()) {
          const compsData = compsSnap.val();
          const mapped: Record<string, { name: string; club: string }> = {};
          Object.keys(compsData).forEach((key) => {
            const c = compsData[key];
            mapped[key] = {
              name: `${c.firstName} ${c.lastName}`,
              club: c.club || "",
            };
          });
          setCompetitors(mapped);
        }
      } else {
        setActiveMatch(null);
      }
    });

    return () => unsubscribe();
  }, [areaId, useLocal]);

  // 2. Listen to live match status, timer and scores from Firebase RTDB in real-time (Online only)
  useEffect(() => {
    if (useLocal || !activeMatch) return;

    const liveMatchRef = ref(database, `live_matches/${activeMatch.matchId}`);

    const unsubscribe = onValue(liveMatchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTimeRemaining(
          data.timeRemaining !== undefined ? data.timeRemaining : 120,
        );
        setMatchStatus(data.status || MatchStatus.PENDING);
        setIsExtraTime(data.isExtraTime || false);
        if (data.scores) {
          setJudgesData(data.scores);
        } else {
          setJudgesData({});
        }
      }
    });

    return () => unsubscribe();
  }, [activeMatch?.matchId, useLocal]);

  // 3. Listen to score streams when match ends (Online only)
  useEffect(() => {
    if (useLocal) return;
    let eventSource: EventSource | null = null;
    setJudgesData({});

    if (
      activeMatch &&
      (matchStatus === MatchStatus.ENDED ||
        matchStatus === MatchStatus.COMPLETED)
    ) {
      eventSource = new EventSource(
        `${API_URL}/api/matches/${activeMatch.matchId}/stream-scores`,
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.scores) {
            setJudgesData(data.scores);
          }
        } catch (err) {
          console.error("Failed to parse SSE scores:", err);
        }
      };
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [activeMatch?.matchId, matchStatus, useLocal]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Consolidate Judge votes and scores
  let redVotes = 0;
  let blueVotes = 0;
  let tieVotes = 0;
  let totalRed = 0;
  let totalBlue = 0;

  Object.values(judgesData).forEach((curr) => {
    const r = calculateNetScore(
      curr.redScore || 0,
      curr.redWarnings || 0,
      curr.redDeductions || 0,
    );
    const b = calculateNetScore(
      curr.blueScore || 0,
      curr.blueWarnings || 0,
      curr.blueDeductions || 0,
    );
    totalRed += r;
    totalBlue += b;
    if (r > b) redVotes++;
    else if (b > r) blueVotes++;
    else tieVotes++;
  });

  const getCompName = (id: string) => {
    if (!id || id === "" || id.toUpperCase().includes("TBD")) return LABELS.TBD;
    if (id === "BYE") return LABELS.BYE_DIRECT;
    return competitors[id]?.name || LABELS.LOADING;
  };

  const getCompClub = (id: string) => {
    if (!id || id === "" || id.toUpperCase().includes("TBD") || id === "BYE")
      return "";
    return competitors[id]?.club || "";
  };

  if (!activeMatch) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="text-center p-8 bg-gray-900/60 rounded-3xl border border-gray-800 backdrop-blur max-w-lg shadow-2xl">
          <svg
            className="w-16 h-16 text-blue-500 mx-auto mb-6 opacity-80"
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
          </svg>
          <h2 className="text-3xl font-black uppercase tracking-wider mb-2">
            ÁREA {areaId}
          </h2>
          <p className="text-gray-400 text-lg">{LABELS.WAITING_MATCH}</p>
        </div>
      </div>
    );
  }

  // Helper to map technical MatchStatus to friendly Spanish labels for spectator view
  const getStatusLabel = (status: MatchStatus) => {
    if (isExtraTime && status === MatchStatus.ACTIVE) {
      return LABELS.EXTRA_TIME;
    }
    return STATUS_LABELS[status] || status;
  };

  const showFinalScores =
    matchStatus === MatchStatus.ENDED || matchStatus === MatchStatus.COMPLETED;

  return (
    <div className="h-screen w-screen bg-slate-950 text-white font-sans flex flex-col justify-between p-[4vh] px-[4vw] relative overflow-hidden select-none tv-root">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
      <div className="absolute -top-60 -left-60 w-[500px] h-[500px] bg-rose-600/10 rounded-full filter blur-[180px] pointer-events-none"></div>
      <div className="absolute -bottom-60 -right-60 w-[500px] h-[500px] bg-indigo-600/10 rounded-full filter blur-[180px] pointer-events-none"></div>

      {/* Top Header - TV Optimized */}
      <header className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 px-12 py-6 rounded-3xl backdrop-blur-md z-10 tv-header">
        <div>
          <span className="text-emerald-400 font-black tracking-widest text-sm uppercase">
            {LABELS.CHAMPIONSHIP_TITLE}
          </span>
          <h1 className="text-4xl font-black uppercase tracking-tight mt-1 text-slate-100">
            {categoryName || LABELS.LOADING_CATEGORY}
          </h1>
        </div>
        <div className="text-right">
          <span className="bg-slate-800 text-slate-200 font-black px-4 sm:px-10 py-2 sm:py-4 rounded-full border border-slate-700 uppercase tracking-widest text-sm sm:text-lg md:text-xl lg:text-2xl shadow-lg whitespace-nowrap">
            ÁREA{" "}
            {areaId.toLowerCase().startsWith("area-")
              ? areaId.replace(/area-/i, "")
              : areaId}
          </span>
          <div className="text-sm sm:text-lg mt-2.5 font-bold tracking-wider">
            {!activeMatch.nextMatchId ? (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-1.5 rounded-full text-xs uppercase animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                🏆 Por el Campeonato
              </span>
            ) : (
              <span className="text-slate-400">
                {LABELS.ROUND} {activeMatch.round}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Scoreboard Layout - TV Optimized */}
      <main className="flex-1 my-8 grid grid-cols-12 gap-10 items-center z-10 h-full overflow-hidden tv-main">
        {/* Red Corner Panel */}
        <div className="col-span-4 bg-gradient-to-br from-rose-950/60 via-slate-900/40 to-slate-900/40 border-2 border-rose-500/30 p-10 rounded-3xl backdrop-blur-md text-center flex flex-col justify-between h-full shadow-[0_0_50px_rgba(239,68,68,0.05)] tv-panel">
          <div className="pt-4">
            <span className="bg-rose-600 text-white font-black text-base px-8 py-2.5 rounded-full tracking-widest uppercase shadow-md whitespace-nowrap">
              {LABELS.RED_CORNER}
            </span>
            <h2 className="text-6xl lg:text-7xl font-black text-rose-500 mt-10 tracking-tight uppercase line-clamp-2 leading-none tv-panel-title">
              {getCompName(activeMatch.redCompetitorId)}
            </h2>
            <p className="text-slate-400 text-2xl font-bold uppercase tracking-wider mt-4 tv-panel-subtitle">
              {getCompClub(activeMatch.redCompetitorId)}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-6">
            <div
              className={`text-[14rem] font-black leading-none font-mono transition-all duration-500 tv-score ${
                showFinalScores
                  ? "text-rose-500 drop-shadow-[0_0_35px_rgba(244,63,94,0.6)]"
                  : "text-slate-800"
              }`}
            >
              {showFinalScores ? redVotes : 0}
            </div>
            <div className="text-rose-400 font-black uppercase tracking-widest text-xs mt-4 bg-rose-950/40 border border-rose-900/50 px-6 py-2 rounded-full">
              {showFinalScores ? LABELS.JUDGE_VOTES : LABELS.CLOSED_SCOREBOARD}
            </div>
          </div>

          {/* Bottom spacer to align with Blue Corner Panel */}
          <div className="h-2"></div>
        </div>

        {/* Center: TV Timer and Status */}
        <div className="col-span-4 flex flex-col items-center justify-center text-center p-4 h-full my-auto">
          <div className="text-slate-500 font-black tracking-widest text-xl uppercase">
            {matchStatus === MatchStatus.GOLDEN_POINT
              ? LABELS.GOLDEN_POINT
              : isExtraTime
                ? LABELS.EXTRA_TIME
                : LABELS.MATCH_TIME}
          </div>

          <div
            className={`font-mono text-[8vw] lg:text-[10rem] xl:text-[11rem] 2xl:text-[13rem] font-black tracking-tighter leading-none my-6 tv-timer ${
              isExtraTime && matchStatus === MatchStatus.ACTIVE
                ? "text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]"
                : matchStatus === MatchStatus.ACTIVE
                  ? "text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.5)]"
                  : matchStatus === MatchStatus.GOLDEN_POINT
                    ? "text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]"
                    : "text-slate-600"
            }`}
          >
            {formatTime(timeRemaining)}
          </div>

          <div className="mt-2">
            <span
              className={`px-4 sm:px-10 py-2.5 sm:py-4 rounded-full text-xs sm:text-sm md:text-base font-black uppercase tracking-widest border-2 shadow-lg ${
                matchStatus === MatchStatus.GOLDEN_POINT
                  ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse"
                  : isExtraTime && matchStatus === MatchStatus.ACTIVE
                    ? "bg-amber-500/10 border-amber-500 text-amber-400 animate-pulse"
                    : matchStatus === MatchStatus.ACTIVE
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 animate-pulse"
                      : matchStatus === MatchStatus.PAUSED
                        ? "bg-yellow-500/10 border-yellow-500 text-yellow-400"
                        : matchStatus === MatchStatus.ENDED
                          ? "bg-rose-500/10 border-rose-500 text-rose-400"
                          : matchStatus === MatchStatus.PENDING
                            ? "bg-slate-800/80 border-slate-700 text-slate-300"
                            : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {getStatusLabel(matchStatus)}
            </span>
          </div>

          {matchStatus === MatchStatus.ENDED && (
            <div className="mt-12 text-slate-400 text-base font-black uppercase tracking-widest bg-slate-900/60 border border-slate-800 px-8 py-4 rounded-2xl animate-pulse">
              {LABELS.WAITING_JURY}
            </div>
          )}
        </div>

        {/* Blue Corner Panel */}
        <div className="col-span-4 bg-gradient-to-br from-indigo-950/60 via-slate-900/40 to-slate-900/40 border-2 border-indigo-500/30 p-10 rounded-3xl backdrop-blur-md text-center flex flex-col justify-between h-full shadow-[0_0_50px_rgba(59,130,246,0.05)] tv-panel">
          <div className="pt-4">
            <span className="bg-indigo-600 text-white font-black text-base px-8 py-2.5 rounded-full tracking-widest uppercase shadow-md whitespace-nowrap">
              {LABELS.BLUE_CORNER}
            </span>
            <h2 className="text-6xl lg:text-7xl font-black text-indigo-400 mt-10 tracking-tight uppercase line-clamp-2 leading-none tv-panel-title">
              {getCompName(activeMatch.blueCompetitorId)}
            </h2>
            <p className="text-slate-400 text-2xl font-bold uppercase tracking-wider mt-4 tv-panel-subtitle">
              {getCompClub(activeMatch.blueCompetitorId)}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-6">
            <div
              className={`text-[14rem] font-black leading-none font-mono transition-all duration-500 tv-score ${
                showFinalScores
                  ? "text-indigo-400 drop-shadow-[0_0_35px_rgba(96,165,250,0.6)]"
                  : "text-slate-800"
              }`}
            >
              {showFinalScores ? blueVotes : 0}
            </div>
            <div className="text-indigo-400 font-black uppercase tracking-widest text-sm mt-4 bg-indigo-950/40 border border-indigo-900/50 px-6 py-2 rounded-full">
              {showFinalScores ? LABELS.JUDGE_VOTES : LABELS.CLOSED_SCOREBOARD}
            </div>
          </div>

          {/* Bottom spacer to align with Red Corner Panel */}
          <div className="h-2"></div>
        </div>
      </main>

      {/* Footer / Status Log - TV Optimized */}
      <footer className="text-center bg-slate-900/40 border border-slate-800/60 py-5 rounded-2xl z-10 text-slate-400 text-sm font-black tracking-widest flex justify-between px-12 gap-2 tv-footer">
        <span>
          {APP_NAME.toUpperCase()} &copy; {new Date().getFullYear()}
        </span>
        <span className="italic text-slate-300">&ldquo;{APP_MOTTO}&rdquo;</span>
        <span>{SYSTEM_OFFICIAL_TITLE}</span>
      </footer>
    </div>
  );
}
