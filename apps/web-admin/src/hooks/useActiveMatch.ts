import { useState, useEffect } from "react";
import { ref, get, set, update, onValue } from "firebase/database";
import { database } from "../lib/firebase";
import { fetchWithAuth } from "../utils/apiClient";
import { getMatches, advanceWinner } from "../services/bracketService";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../lib/socketClient";
import type { Match, Competitor } from "@corner-click/types";
import {
  MatchStatus,
  SocketEvent,
  SocketRole,
  MatchControlAction,
  ScoreUpdateType,
} from "@corner-click/types";
import { AudioService } from "@corner-click/audio";
import { trpc } from "@corner-click/api-client";

interface ScoreData {
  redScore: number;
  blueScore: number;
  redWarnings: number;
  blueWarnings: number;
  redDeductions: number;
  blueDeductions: number;
}

export const useActiveMatch = (
  selectedMatch: Match | null,
  selectedTournamentId: string,
  selectedCategoryId: string,
  onMatchesRefreshed: (matches: Match[], currentMatch: Match) => void,
  competitors?: Record<string, Competitor>,
  showToast?: (
    message: string,
    type?: "success" | "error" | "warning" | "info",
  ) => void,
) => {
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.PENDING);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const [judgesData, setJudgesData] = useState<Record<string, ScoreData>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [wasGoldenPoint, setWasGoldenPoint] = useState(false);

  const [firebaseConnected, setFirebaseConnected] = useState(true);
  // Disabled automatic fallback to avoid split-brain state between Admin and Judge
  const useLocal = false;

  const updateStatusMutation = trpc.matches.updateStatus.useMutation();
  const submitScoresMutation = trpc.matches.submitScores.useMutation();
  const declareWinnerMutation = trpc.matches.declareWinner.useMutation();

  // Track Firebase connection state
  useEffect(() => {
    const connectedRef = ref(database, ".info/connected");
    const unsubscribe = onValue(connectedRef, (snap) => {
      setFirebaseConnected(snap.val() === true);
    });
    return () => unsubscribe();
  }, []);

  // Consolidate Judge votes (calculated on every render from state)
  let redVotes = 0;
  let blueVotes = 0;
  let tieVotes = 0;
  let totalRed = 0;
  let totalBlue = 0;

  Object.values(judgesData).forEach((curr: ScoreData) => {
    const r =
      (curr.redScore || 0) -
      Math.floor((curr.redWarnings || 0) / 3) -
      (curr.redDeductions || 0);
    const b =
      (curr.blueScore || 0) -
      Math.floor((curr.blueWarnings || 0) / 3) -
      (curr.blueDeductions || 0);
    totalRed += r;
    totalBlue += b;
    if (r > b) redVotes++;
    else if (b > r) blueVotes++;
    else tieVotes++;
  });

  const isMatchStartable = !!(
    selectedMatch &&
    selectedMatch.redCompetitorId &&
    selectedMatch.redCompetitorId !== "BYE" &&
    selectedMatch.blueCompetitorId &&
    selectedMatch.blueCompetitorId !== "BYE"
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const updateMatchStatus = async (
    newStatus: MatchStatus,
    extraTimeOverride?: boolean,
  ) => {
    if (!selectedMatch) return;
    AudioService.playBeep();
    const nextExtraTime =
      extraTimeOverride !== undefined ? extraTimeOverride : isExtraTime;

    if (extraTimeOverride !== undefined) {
      setIsExtraTime(extraTimeOverride);
    }

    if (newStatus === MatchStatus.GOLDEN_POINT) {
      setWasGoldenPoint(true);
    } else if (
      newStatus === MatchStatus.ENDED ||
      newStatus === MatchStatus.PENDING
    ) {
      setWasGoldenPoint(false);
    }

    if (useLocal) {
      setStatus(newStatus);
      const socket = getSocket();
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
      });
      showToast?.(`[LOCAL] Estado del combate: ${newStatus}`, "info");
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        matchId: selectedMatch.id,
        status: newStatus,
        isExtraTime: nextExtraTime,
      });
      setStatus(newStatus);
      showToast?.(`Estado del combate actualizado a: ${newStatus}`, "info");
    } catch (err) {
      console.error("Failed to update status", err);
      showToast?.("Error al cambiar el estado del combate", "error");
    }
  };

  const handleStart = () =>
    updateMatchStatus(
      wasGoldenPoint ? MatchStatus.GOLDEN_POINT : MatchStatus.ACTIVE,
    );
  const handlePause = () => updateMatchStatus(MatchStatus.PAUSED);
  const handleEnd = () => updateMatchStatus(MatchStatus.ENDED, false);
  const handleExtraTime = () => {
    setTimeRemaining(60);
    updateMatchStatus(MatchStatus.ACTIVE, true);
    showToast?.("Tiempo extra iniciado (1 Minuto)", "warning");
  };
  const handleGoldenPoint = () => {
    updateMatchStatus(MatchStatus.GOLDEN_POINT, false);
    showToast?.("¡Punto de Oro iniciado! Muerte súbita activa.", "warning");
  };

  const handleDeclareWinner = async (winnerId: string) => {
    if (!selectedMatch) return;
    AudioService.playBeep();

    if (useLocal) {
      // Buffer the result to localStorage for later synchronization
      const buffer = JSON.parse(
        localStorage.getItem("offline_matches_buffer") || "[]",
      );
      buffer.push({
        matchId: selectedMatch.id,
        winnerId,
        nextMatchId: selectedMatch.nextMatchId,
        tournamentId: selectedTournamentId,
        categoryId: selectedCategoryId,
        scores: judgesData,
      });
      localStorage.setItem("offline_matches_buffer", JSON.stringify(buffer));
      showToast?.(
        "Combate guardado en el buffer local (Sin conexión).",
        "warning",
      );

      setStatus(MatchStatus.COMPLETED);
      setIsExtraTime(false);
      const socket = getSocket();
      socket.emit(SocketEvent.MATCH_CONTROL, {
        areaId: selectedMatch.areaId,
        matchId: selectedMatch.id,
        action: MatchControlAction.END,
        matchData: {
          winnerId,
          status: MatchStatus.COMPLETED,
          isExtraTime: false,
        },
      });
      return;
    }

    try {
      await declareWinnerMutation.mutateAsync({
        matchId: selectedMatch.id,
        winnerId,
        tournamentId: selectedTournamentId,
        nextMatchId: selectedMatch.nextMatchId || undefined,
      });
      const updatedMatches = await getMatches(
        selectedTournamentId,
        selectedCategoryId,
      );

      const updatedSelectedMatch = updatedMatches.find(
        (m) => m.id === selectedMatch.id,
      );
      if (updatedSelectedMatch) {
        onMatchesRefreshed(updatedMatches, updatedSelectedMatch);
        setStatus(MatchStatus.COMPLETED);
      }

      showToast?.("¡Ganador declarado y llave actualizada!", "success");
    } catch (err) {
      console.error(err);
      showToast?.("Error al declarar el ganador y avanzar llave.", "error");
    }
  };

  // Connect/Sync with Local Socket fallback
  useEffect(() => {
    if (!useLocal || !selectedMatch) return;

    const socket = connectSocket(selectedMatch.areaId, SocketRole.ADMIN);

    const redComp = competitors?.[selectedMatch.redCompetitorId];
    const blueComp = competitors?.[selectedMatch.blueCompetitorId];

    // Announce active match to socket server with competitor names
    socket.emit(SocketEvent.MATCH_CONTROL, {
      areaId: selectedMatch.areaId,
      matchId: selectedMatch.id,
      action: MatchControlAction.SET_MATCH,
      matchData: {
        ...selectedMatch,
        redCompetitorName: redComp
          ? `${redComp.firstName} ${redComp.lastName}`
          : "TBD",
        redCompetitorClub: redComp ? redComp.club : "",
        blueCompetitorName: blueComp
          ? `${blueComp.firstName} ${blueComp.lastName}`
          : "TBD",
        blueCompetitorClub: blueComp ? blueComp.club : "",
      },
      timerValue: timeRemaining,
    });

    socket.on(SocketEvent.MATCH_STATE, (state: any) => {
      if (state && state.match && state.match.id === selectedMatch.id) {
        setStatus(state.match.status);
        setTimeRemaining(state.timer);
        setIsExtraTime(state.match.isExtraTime || false);
        if (state.scores) {
          setJudgesData(state.scores);
        }
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [useLocal, selectedMatch?.id]);

  // Load state from Firebase when switching matches (Online only)
  useEffect(() => {
    if (!selectedMatch || useLocal) return;
    setIsLoaded(false);
    const fetchState = async () => {
      const matchRef = ref(database, `live_matches/${selectedMatch.id}`);
      const snapshot = await get(matchRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStatus(data.status || MatchStatus.PENDING);
        setTimeRemaining(
          data.timeRemaining !== undefined ? data.timeRemaining : 120,
        );
        setIsExtraTime(data.isExtraTime || false);
      } else {
        setStatus(selectedMatch.status || MatchStatus.PENDING);
        setTimeRemaining(120);
        setIsExtraTime(false);
      }
      setIsLoaded(true);
    };
    fetchState();
    setJudgesData({});
  }, [selectedMatch?.id, useLocal]);

  // Sync Timer and Extra Time to Firebase (Online only)
  useEffect(() => {
    if (!isLoaded || !selectedMatch || useLocal) return;
    const matchRef = ref(database, `live_matches/${selectedMatch.id}`);
    update(matchRef, {
      timeRemaining,
      status,
      isExtraTime: isExtraTime || false,
    });
  }, [
    timeRemaining,
    status,
    isExtraTime,
    selectedMatch?.id,
    isLoaded,
    useLocal,
  ]);

  // Sync Active Match ID for Area (Online only)
  useEffect(() => {
    if (!selectedMatch || useLocal) return;
    const areaId = selectedMatch.areaId || "1";
    const areaMatchRef = ref(database, `live_matches_by_area/${areaId}`);
    
    // Avoid undefined values for Firebase RTDB
    const payload = {
      matchId: selectedMatch.id || "",
      tournamentId: selectedMatch.tournamentId || "",
      categoryId: selectedMatch.categoryId || "",
      redCompetitorId: selectedMatch.redCompetitorId || "",
      blueCompetitorId: selectedMatch.blueCompetitorId || "",
      round: selectedMatch.round || 1,
      nextMatchId: selectedMatch.nextMatchId || null,
    };

    set(areaMatchRef, payload).catch(err => {
      console.error("Failed to sync live_matches_by_area:", err);
    });
  }, [selectedMatch?.id, useLocal]);

  // Listen to live scores in Firebase (Online only)
  useEffect(() => {
    if (!selectedMatch || useLocal) return;
    const scoresRef = ref(database, `live_matches/${selectedMatch.id}/scores`);
    const unsubscribe = onValue(scoresRef, (snapshot) => {
      if (snapshot.exists()) {
        setJudgesData(snapshot.val());
      } else {
        setJudgesData({});
      }
    });
    return () => unsubscribe();
  }, [selectedMatch?.id, useLocal]);

  // Offline deferred sync to cloud when connection is restored
  useEffect(() => {
    if (firebaseConnected && isLoaded) {
      const bufferRaw = localStorage.getItem("offline_matches_buffer");
      if (bufferRaw) {
        const buffer = JSON.parse(bufferRaw);
        if (buffer.length > 0) {
          showToast?.(
            `¡Conexión recuperada! Sincronizando ${buffer.length} combates...`,
            "info",
          );

          const syncBuffer = async () => {
            for (const item of buffer) {
              try {
                // Post all individual corner scores
                for (const [cornerId, score] of Object.entries(item.scores)) {
                  await submitScoresMutation.mutateAsync({
                    matchId: item.matchId as string,
                    cornerId,
                    ...score as any,
                  });
                }

                // Declare winner & advance bracket
                await declareWinnerMutation.mutateAsync({
                  tournamentId: item.tournamentId,
                  matchId: item.matchId,
                  winnerId: item.winnerId,
                  nextMatchId: item.nextMatchId || undefined,
                });
              } catch (e) {
                console.error("Failed to sync offline match:", e);
              }
            }

            localStorage.removeItem("offline_matches_buffer");
            showToast?.("¡Sincronización de nube completada!", "success");

            // Refresh parent matches
            getMatches(selectedTournamentId, selectedCategoryId).then(
              (updatedMatches) => {
                if (selectedMatch) {
                  const updatedSelectedMatch = updatedMatches.find(
                    (m) => m.id === selectedMatch.id,
                  );
                  if (updatedSelectedMatch) {
                    onMatchesRefreshed(updatedMatches, updatedSelectedMatch);
                  }
                }
              },
            );
          };
          syncBuffer();
        }
      }
    }
  }, [firebaseConnected, isLoaded, selectedTournamentId, selectedCategoryId]);

  // Auto-declare winner during Golden Point when consensus is reached
  useEffect(() => {
    if (status !== MatchStatus.GOLDEN_POINT || !selectedMatch) return;

    const numJudges = Object.keys(judgesData).length;
    const consensusThreshold =
      numJudges > 0 ? Math.ceil((numJudges + 1) / 2) : 3;

    if (redVotes >= consensusThreshold) {
      handleDeclareWinner(selectedMatch.redCompetitorId);
    } else if (blueVotes >= consensusThreshold) {
      handleDeclareWinner(selectedMatch.blueCompetitorId);
    }
  }, [redVotes, blueVotes, status, judgesData, selectedMatch]);

  // Countdown timer interval
  useEffect(() => {
    let interval: any = null;
    if (status === MatchStatus.ACTIVE && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const next = prev - 1;
          if (useLocal && selectedMatch) {
            const socket = getSocket();
            socket.emit(SocketEvent.MATCH_CONTROL, {
              areaId: selectedMatch.areaId,
              matchId: selectedMatch.id,
              action: MatchControlAction.TIMER_TICK,
              timerValue: next,
            });
          }
          return next;
        });
      }, 1000);
    } else if (timeRemaining === 0 && status === MatchStatus.ACTIVE) {
      updateMatchStatus(MatchStatus.ENDED);
    }
    return () => clearInterval(interval);
  }, [status, timeRemaining, useLocal, selectedMatch?.id]);

  return {
    status,
    setStatus,
    timeRemaining,
    setTimeRemaining,
    judgesData,
    isLoaded: isLoaded || useLocal,
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
  };
};
