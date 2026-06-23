import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import type { Match, Competitor } from "@corner-click/types";
import { BracketType, MatchStatus } from "@corner-click/types";
import {
  getMatches,
  generateBracket,
  advanceWinner,
} from "../services/bracketService";
import { getCompetitors } from "../services/competitorService";
import { ref, get } from "firebase/database";
import { database } from "../lib/firebase";

interface BracketManagerProps {
  tournamentId: string;
  categoryId: string;
  areaId: string;
  isReadOnly?: boolean;
}

interface Standing {
  competitorId: string;
  name: string;
  club: string;
  played: number;
  won: number;
  scorePoints: number;
  warnings: number;
  deductions: number;
  points: number;
}

export const BracketManager: React.FC<BracketManagerProps> = ({
  tournamentId,
  categoryId,
  areaId,
  isReadOnly = false,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [bracketType, setBracketType] = useState<BracketType>(
    BracketType.SINGLE_ELIMINATION,
  );
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

      // Fetch category data for bracketType
      const catSnap = await get(
        ref(database, `tournaments/${tournamentId}/categories/${categoryId}`),
      );
      if (catSnap.exists()) {
        setBracketType(
          catSnap.val().bracketType || BracketType.SINGLE_ELIMINATION,
        );
      }
    } catch (error) {
      console.error("Failed to load bracket data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (competitors.length < 2) {
      toast.error("Se necesitan al menos 2 competidores para generar llaves.");
      return;
    }

    if (matches.length > 0) {
      if (
        !confirm(
          "Esto sobrescribirá las llaves actuales de esta categoría. ¿Estás seguro?",
        )
      ) {
        return;
      }
    }

    setGenerating(true);
    const toastId = toast.loading("Generando llaves...");
    try {
      await generateBracket(tournamentId, categoryId, areaId, competitors);
      await loadData();
      toast.success("Llaves generadas con éxito.", { id: toastId });
    } catch (error) {
      console.error("Failed to generate bracket:", error);
      toast.error("Error al generar las llaves.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleAdvanceWinner = async (
    matchId: string,
    winnerId: string,
    nextMatchId?: string,
  ) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    if (confirm("Are you sure you want to advance this competitor?")) {
      try {
        const loserId =
          winnerId === match.redCompetitorId
            ? match.blueCompetitorId
            : match.redCompetitorId;
        await advanceWinner(
          tournamentId,
          matchId,
          winnerId,
          nextMatchId,
          match.losersMatchId,
          loserId,
        );
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

  const getCompetitorClub = (id: string | null) => {
    if (!id || id === "BYE") return "";
    const comp = competitors.find((c) => c.id === id);
    return comp ? comp.club : "";
  };

  // Standings calculation for Round Robin
  const calculateStandings = (): Standing[] => {
    const standingsMap: Record<string, Standing> = {};

    competitors.forEach((c) => {
      standingsMap[c.id] = {
        competitorId: c.id,
        name: `${c.firstName} ${c.lastName}`,
        club: c.club || "",
        played: 0,
        won: 0,
        scorePoints: 0,
        warnings: 0,
        deductions: 0,
        points: 0,
      };
    });

    matches.forEach((m) => {
      if (m.status === "COMPLETED" && m.winnerId) {
        const redStanding = standingsMap[m.redCompetitorId];
        const blueStanding = standingsMap[m.blueCompetitorId];

        if (redStanding) {
          redStanding.played += 1;
          redStanding.scorePoints += m.score?.red || 0;
          redStanding.warnings += m.warnings?.red || 0;
          redStanding.deductions += m.deductions?.red || 0;
          if (m.winnerId === m.redCompetitorId) {
            redStanding.won += 1;
            redStanding.points += 2;
          }
        }

        if (blueStanding) {
          blueStanding.played += 1;
          blueStanding.scorePoints += m.score?.blue || 0;
          blueStanding.warnings += m.warnings?.blue || 0;
          blueStanding.deductions += m.deductions?.blue || 0;
          if (m.winnerId === m.blueCompetitorId) {
            blueStanding.won += 1;
            blueStanding.points += 2;
          }
        }
      }
    });

    return Object.values(standingsMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.scorePoints !== a.scorePoints) return b.scorePoints - a.scorePoints;
      return a.warnings - b.warnings;
    });
  };

  if (loading) return <p>Loading bracket...</p>;

  // Group matches by round
  const filterMatches = (losersOnly: boolean) => {
    return matches.filter((m) =>
      losersOnly ? m.isLosersBracket : !m.isLosersBracket,
    );
  };

  const getRounds = (matchesList: Match[]) => {
    const roundsMap: Record<number, Match[]> = {};
    matchesList.forEach((m) => {
      const r = m.round || 1;
      if (!roundsMap[r]) roundsMap[r] = [];
      roundsMap[r].push(m);
    });
    return roundsMap;
  };

  const renderTree = (title: string, matchesList: Match[]) => {
    const roundsMap = getRounds(matchesList);
    const maxRounds = Math.max(...Object.keys(roundsMap).map(Number), 0);

    if (matchesList.length === 0) return null;

    return (
      <div className="mb-10">
        <h3 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">
          {title}
        </h3>
        <div className="overflow-x-auto pb-8">
          <div className="flex space-x-8 min-w-max">
            {Array.from({ length: maxRounds }).map((_, i) => {
              const r = i + 1;
              const roundMatches = roundsMap[r] || [];

              return (
                <div
                  key={r}
                  className="flex flex-col space-y-4 w-64 justify-around"
                >
                  <h4 className="text-center font-semibold text-gray-700 mb-2 border-b pb-2">
                    Ronda {r}
                  </h4>

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
      </div>
    );
  };

  // Podiums calculation for brackets
  const finalMatch = matches.find((m) => !m.nextMatchId && !m.isLosersBracket);
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

    // In double elimination, the loser of the grand final is 2nd place,
    // the loser of losers final is 3rd place.
    // For single elimination, the two semi-finalists who lost are sharing 3rd.
    if (bracketType === BracketType.DOUBLE_ELIMINATION) {
      const losersFinal = matches.find(
        (m) => m.nextMatchId === finalMatch.id && m.isLosersBracket,
      );
      if (losersFinal && losersFinal.status === "COMPLETED") {
        const loserId =
          losersFinal.winnerId === losersFinal.redCompetitorId
            ? losersFinal.blueCompetitorId
            : losersFinal.redCompetitorId;
        if (loserId && loserId !== "BYE") {
          thirdPlaces.push(loserId);
        }
      }
    } else {
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
  }

  const renderRoundRobin = () => {
    const standings = calculateStandings();

    return (
      <div className="space-y-8">
        {/* Positions Table */}
        <div className="bg-slate-900/10 border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">
            Tabla de Posiciones
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">
                    Puesto
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">
                    Competidor
                  </th>
                  <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">
                    Club
                  </th>
                  <th className="px-6 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">
                    Jugados
                  </th>
                  <th className="px-6 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">
                    Ganados
                  </th>
                  <th className="px-6 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">
                    Puntos Marcados
                  </th>
                  <th className="px-6 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">
                    Warnings
                  </th>
                  <th className="px-6 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">
                    Puntos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {standings.map((std, idx) => (
                  <tr
                    key={std.competitorId}
                    className={idx === 0 ? "bg-yellow-50/50" : ""}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                      {idx + 1}º {idx === 0 && "🏆"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      {std.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {std.club}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900 font-semibold">
                      {std.played}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900 font-semibold">
                      {std.won}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                      {std.scorePoints}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-red-500 font-semibold">
                      {std.warnings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-blue-600 font-black">
                      {std.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matches List */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">
            Lista de Combates (Round Robin)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((m) => (
              <div
                key={m.id}
                className={`border rounded-xl shadow-sm p-4 bg-slate-50/50 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all ${m.status === "COMPLETED" ? "opacity-75 bg-slate-100/50" : ""}`}
                onClick={() => {
                  window.location.href = `/live?tournament=${tournamentId}&category=${categoryId}`;
                }}
              >
                <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                  <span className="font-bold">
                    Match {m.id.substring(m.id.length - 4)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.status === "COMPLETED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    {m.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div
                    className={`flex justify-between items-center p-2 rounded ${m.winnerId === m.redCompetitorId ? "bg-red-50 border border-red-200 font-bold" : ""}`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-red-600 rounded-full shrink-0"></span>
                      {getCompetitorName(m.redCompetitorId)}
                    </span>
                    {m.status !== "COMPLETED" && !isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdvanceWinner(m.id, m.redCompetitorId);
                        }}
                        className="text-xs bg-white hover:bg-slate-100 border border-slate-200 shadow-sm px-2.5 py-1 rounded font-bold"
                      >
                        Ganador
                      </button>
                    )}
                  </div>

                  <div
                    className={`flex justify-between items-center p-2 rounded ${m.winnerId === m.blueCompetitorId ? "bg-blue-50 border border-blue-200 font-bold" : ""}`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0"></span>
                      {getCompetitorName(m.blueCompetitorId)}
                    </span>
                    {m.status !== "COMPLETED" && !isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdvanceWinner(m.id, m.blueCompetitorId);
                        }}
                        className="text-xs bg-white hover:bg-slate-100 border border-slate-200 shadow-sm px-2.5 py-1 rounded font-bold"
                      >
                        Ganador
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Detalle de Llave</h2>
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">
            Modalidad: {bracketType.replace("_", " ")}
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleGenerateBracket}
            disabled={generating}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold transition-all shadow-sm"
          >
            {generating ? "Generando..." : "Generar Cruces / Llave [DEV]"}
          </button>
        )}
      </div>

      {bracketType !== BracketType.ROUND_ROBIN && isFinalCompleted && (
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
                {secondPlace && getCompetitorClub(secondPlace)}
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
                {firstPlace && getCompetitorClub(firstPlace)}
              </span>
            </div>

            {/* 3rd Place */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col items-center order-3 h-36 justify-center">
              <span className="text-2xl mb-1">🥉</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                3º Puesto
              </span>
              <div className="flex flex-col gap-1 mt-2 w-full">
                {thirdPlaces.length > 0 ? (
                  thirdPlaces.map((tpId) => (
                    <div key={tpId} className="flex flex-col items-center">
                      <span className="text-xs font-black text-slate-200 truncate w-full">
                        {getCompetitorName(tpId)}
                      </span>
                      <span className="text-[10px] text-slate-500 italic">
                        {getCompetitorClub(tpId)}
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
          Aún no se ha generado la llave de combates. Haz clic en "Generar
          Cruces / Llave" para iniciar.
        </p>
      ) : bracketType === BracketType.ROUND_ROBIN ? (
        renderRoundRobin()
      ) : (
        <div className="space-y-6">
          {renderTree(
            bracketType === BracketType.DOUBLE_ELIMINATION
              ? "Cuadro Principal (Ganadores)"
              : "Llaves de Combates",
            filterMatches(false),
          )}
          {bracketType === BracketType.DOUBLE_ELIMINATION &&
            renderTree("Cuadro de Repesca (Perdedores)", filterMatches(true))}
        </div>
      )}
    </div>
  );
};
