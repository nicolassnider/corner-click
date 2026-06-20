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
}

export const BracketManager: React.FC<BracketManagerProps> = ({
  tournamentId,
  categoryId,
  areaId,
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

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Tournament Bracket</h2>
        <button
          onClick={handleGenerateBracket}
          disabled={generating}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Bracket"}
        </button>
      </div>

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
                          m.redCompetitorId !== "BYE" && (
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
                          m.blueCompetitorId !== "BYE" && (
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
