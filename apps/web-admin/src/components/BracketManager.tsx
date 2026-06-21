import React, { useState, useEffect } from "react";
import type { Match, Competitor } from "@corner-click/types";
import {
  getMatches,
  generateBracket,
  advanceWinner,
} from "../services/bracketService";
import { getCompetitors } from "../services/competitorService";

interface BracketManagerProps {
  tournamentId: string;
  categoryId: string;
  areaId: string;
  isReadOnly?: boolean;
}

export const BracketManager: React.FC<BracketManagerProps> = ({
  tournamentId,
  categoryId,
  areaId,
  isReadOnly = false,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [tournamentId, categoryId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchesData, compsData] = await Promise.all([
        getMatches(tournamentId, categoryId),
        getCompetitors(tournamentId, categoryId),
      ]);
      setMatches(matchesData);
      setCompetitors(compsData);
    } catch (error) {
      console.error("Failed to load bracket data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (competitors.length < 2) {
      alert("Need at least 2 competitors to generate a bracket.");
      return;
    }

    if (matches.length > 0) {
      if (!confirm("This will overwrite the current bracket. Are you sure?")) {
        return;
      }
    }

    setGenerating(true);
    try {
      await generateBracket(tournamentId, categoryId, areaId, competitors);
      await loadData();
    } catch (error) {
      console.error("Failed to generate bracket:", error);
      alert("Error generating bracket. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  const handleAdvanceWinner = async (
    matchId: string,
    winnerId: string,
    nextMatchId?: string,
  ) => {
    if (confirm("Are you sure you want to advance this competitor?")) {
      try {
        await advanceWinner(tournamentId, matchId, winnerId, nextMatchId);
        await loadData();
      } catch (error) {
        console.error("Error advancing winner:", error);
      }
    }
  };

  const getCompetitorName = (id: string | null) => {
    if (!id) return "TBD";
    if (id === "BYE") return "BYE";
    const comp = competitors.find((c) => c.id === id);
    return comp ? `${comp.firstName} ${comp.lastName}` : "Unknown";
  };

  if (loading) return <p>Loading bracket...</p>;

  // Group matches by round
  const rounds: Record<number, Match[]> = {};
  matches.forEach((m) => {
    const r = m.round || 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });

  const maxRounds = Math.max(...Object.keys(rounds).map(Number), 0);

  // Calculate Podium (1st, 2nd, and sharing 3rd places)
  const finalMatch = matches.find((m) => !m.nextMatchId);
  const isFinalCompleted =
    finalMatch && finalMatch.status === "COMPLETED" && finalMatch.winnerId;

  let firstPlace: string | null = null;
  let secondPlace: string | null = null;
  const thirdPlaces: string[] = [];

  if (isFinalCompleted && finalMatch) {
    firstPlace = finalMatch.winnerId;
    secondPlace =
      finalMatch.winnerId === finalMatch.redCompetitorId
        ? finalMatch.blueCompetitorId
        : finalMatch.redCompetitorId;

    // The two semi-finals point to the final match's ID
    const semiFinals = matches.filter((m) => m.nextMatchId === finalMatch.id);
    semiFinals.forEach((sf) => {
      if (sf.status === "COMPLETED" && sf.winnerId) {
        const loserId =
          sf.winnerId === sf.redCompetitorId
            ? sf.blueCompetitorId
            : sf.redCompetitorId;
        if (loserId && loserId !== "BYE") {
          thirdPlaces.push(loserId);
        }
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Tournament Bracket</h2>
        {!isReadOnly && (
          <button
            onClick={handleGenerateBracket}
            disabled={generating}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Bracket"}
          </button>
        )}
      </div>

      {isFinalCompleted && (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-600/5 to-amber-500/10 border-2 border-amber-500/30 p-6 rounded-2xl mb-8 shadow-lg max-w-4xl mx-auto text-center backdrop-blur-sm">
          <h3 className="text-xl font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center justify-center gap-2">
            <span>🏆</span> Podio Final de la Categoría
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mt-4">
            {/* 2nd Place */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col items-center order-2 md:order-1 h-36 justify-center">
              <span className="text-2xl mb-1">🥈</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                2º Puesto
              </span>
              <span className="text-sm font-black text-slate-200 mt-2 truncate w-full">
                {secondPlace ? getCompetitorName(secondPlace) : "Unknown"}
              </span>
              <span className="text-xs text-slate-500 italic mt-0.5">
                {secondPlace &&
                  competitors.find((c) => c.id === secondPlace)?.club}
              </span>
            </div>

            {/* 1st Place */}
            <div className="bg-amber-950/20 border-2 border-amber-500/40 p-6 rounded-2xl flex flex-col items-center order-1 md:order-2 h-44 justify-center shadow-lg shadow-amber-500/5 transform scale-105">
              <span className="text-4xl mb-1 animate-bounce">👑</span>
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                1º Puesto - Campeón
              </span>
              <span className="text-base font-black text-amber-300 mt-2 truncate w-full">
                {firstPlace ? getCompetitorName(firstPlace) : "Unknown"}
              </span>
              <span className="text-xs text-amber-500 font-bold mt-0.5">
                {firstPlace &&
                  competitors.find((c) => c.id === firstPlace)?.club}
              </span>
            </div>

            {/* 3rd Place */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col items-center order-3 h-36 justify-center">
              <span className="text-2xl mb-1">🥉</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                3º Puesto (Compartido)
              </span>
              <div className="flex flex-col gap-1 mt-2 w-full">
                {thirdPlaces.length > 0 ? (
                  thirdPlaces.map((tpId) => (
                    <div key={tpId} className="flex flex-col items-center">
                      <span className="text-xs font-black text-slate-200 truncate w-full">
                        {getCompetitorName(tpId)}
                      </span>
                      <span className="text-[10px] text-slate-500 italic">
                        {competitors.find((c) => c.id === tpId)?.club}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No definido</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {matches.length === 0 ? (
        <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
          No bracket generated yet. Click generate to create matches from
          registered competitors.
        </p>
      ) : (
        <div className="overflow-x-auto pb-8">
          <div className="flex space-x-8 min-w-max">
            {Array.from({ length: maxRounds }).map((_, i) => {
              const r = i + 1;
              const roundMatches = rounds[r] || [];

              return (
                <div
                  key={r}
                  className="flex flex-col space-y-4 w-64 justify-around"
                >
                  <h3 className="text-center font-semibold text-gray-700 mb-2 border-b pb-2">
                    Round {r}
                  </h3>

                  {roundMatches.map((m) => (
                    <div
                      key={m.id}
                      className={`border rounded-md shadow-sm p-3 bg-white hover:border-blue-500 hover:shadow-md cursor-pointer transition-all hover:bg-slate-50/30 ${m.status === "COMPLETED" ? "opacity-70" : ""}`}
                      onClick={() => {
                        window.location.href = `/live?tournament=${tournamentId}&category=${categoryId}`;
                      }}
                      title="Click to manage this match in Live Control"
                    >
                      <div className="text-xs text-gray-500 mb-2 flex justify-between">
                        <span>Match {m.id.substring(m.id.length - 4)}</span>
                        <span>{m.status}</span>
                      </div>

                      {/* Red Competitor */}
                      <div
                        className={`flex justify-between items-center p-2 rounded mb-1 ${m.winnerId === m.redCompetitorId ? "bg-red-100 font-bold" : "bg-gray-50"}`}
                      >
                        <div className="truncate w-3/4 flex items-center">
                          <span className="w-3 h-3 bg-red-600 rounded-full mr-2"></span>
                          <span
                            className={
                              m.redCompetitorId
                                ? "text-gray-900"
                                : "text-gray-400"
                            }
                          >
                            {getCompetitorName(m.redCompetitorId)}
                          </span>
                        </div>
                        {m.status !== "COMPLETED" &&
                          m.redCompetitorId &&
                          m.redCompetitorId !== "BYE" &&
                          !isReadOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceWinner(
                                  m.id,
                                  m.redCompetitorId,
                                  m.nextMatchId,
                                );
                              }}
                              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded cursor-pointer"
                              title="Advance as winner"
                            >
                              Win
                            </button>
                          )}
                      </div>

                      {/* Blue Competitor */}
                      <div
                        className={`flex justify-between items-center p-2 rounded ${m.winnerId === m.blueCompetitorId ? "bg-blue-100 font-bold" : "bg-gray-50"}`}
                      >
                        <div className="truncate w-3/4 flex items-center">
                          <span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
                          <span
                            className={
                              m.blueCompetitorId
                                ? "text-gray-900"
                                : "text-gray-400"
                            }
                          >
                            {getCompetitorName(m.blueCompetitorId)}
                          </span>
                        </div>
                        {m.status !== "COMPLETED" &&
                          m.blueCompetitorId &&
                          m.blueCompetitorId !== "BYE" &&
                          !isReadOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceWinner(
                                  m.id,
                                  m.blueCompetitorId,
                                  m.nextMatchId,
                                );
                              }}
                              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded cursor-pointer"
                              title="Advance as winner"
                            >
                              Win
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
