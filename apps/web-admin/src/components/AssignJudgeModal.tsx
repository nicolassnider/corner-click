import React, { useState, useEffect, useMemo } from "react";
import type { Judge, Match, Competitor } from "@corner-click/types";
import { CornerRole } from "@corner-click/types";
import { getMatches } from "../services/bracketService";
import { getCompetitors } from "../services/competitorService";
import { getCompetitorFullName } from "../utils/competitorUtils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  judge: Judge | null;
  judges: Judge[];
  tournamentAreas: number;
  tournamentId: string;
  onAssign: (
    judgeId: string,
    assignment: { areaId: string; cornerId: string; matchId: string },
  ) => Promise<void>;
}

export default function AssignJudgeModal({
  isOpen,
  onClose,
  judge,
  judges,
  tournamentAreas,
  tournamentId,
  onAssign,
}: Props) {
  const [areaId, setAreaId] = useState("1");
  const [cornerId, setCornerId] = useState(CornerRole.CORNER_1 as string);
  const [matchId, setMatchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [matches, setMatches] = useState<Match[]>([]);
  const [competitors, setCompetitors] = useState<Record<string, Competitor>>(
    {},
  );
  const [loadingMatches, setLoadingMatches] = useState(false);

  const filteredMatches = useMemo(
    () => matches.filter((m) => m.areaId === areaId),
    [matches, areaId],
  );

  // Reset form when opened with a new judge
  useEffect(() => {
    if (judge) {
      setAreaId(judge.currentAssignment?.areaId || "1");
      setCornerId(judge.currentAssignment?.cornerId || CornerRole.CORNER_1);
      setMatchId(judge.currentAssignment?.matchId || "");
    }
  }, [judge]);

  useEffect(() => {
    if (isOpen && tournamentId) {
      setLoadingMatches(true);
      Promise.all([getMatches(tournamentId), getCompetitors(tournamentId)])
        .then(([fetchedMatches, fetchedCompetitors]) => {
          setMatches(fetchedMatches);
          const compMap: Record<string, Competitor> = {};
          fetchedCompetitors.forEach((c) => (compMap[c.id] = c));
          setCompetitors(compMap);
        })
        .catch(console.error)
        .finally(() => setLoadingMatches(false));
    }
  }, [isOpen, tournamentId]);

  // Ensure match selection stays consistent with selected area
  useEffect(() => {
    if (!matchId || loadingMatches) return;

    const matchInSelectedArea = matches.some(
      (m) => m.id === matchId && m.areaId === areaId,
    );

    if (!matchInSelectedArea) {
      setMatchId("");
    }
  }, [areaId, matchId, matches, loadingMatches]);

  if (!isOpen || !judge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId.trim()) return;

    const existingAssignment = judges.find(
      (j) =>
        j.id !== judge.id &&
        j.currentAssignment?.areaId === areaId &&
        j.currentAssignment?.cornerId === cornerId,
    );

    if (existingAssignment) {
      alert(
        `Cannot assign: ${existingAssignment.name} is already assigned to Area ${areaId} as ${cornerId}. Please unassign them first.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await onAssign(judge.id!, { areaId, cornerId, matchId });
      onClose();
    } catch (error) {
      console.error("Failed to assign", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200">
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white tracking-wide">
            Assign Judge
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xl uppercase">
              {judge.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">
                {judge.name}
              </h3>
              <p className="text-sm font-mono text-gray-500 tracking-widest">
                PIN: {judge.pin}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="area-select"
                className="block text-sm font-bold text-gray-700 mb-1"
              >
                Area / Tatami
              </label>
              <select
                id="area-select"
                aria-label="Area / Tatami"
                title="Area / Tatami"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-gray-50 text-gray-900 font-medium"
              >
                {Array.from({ length: tournamentAreas }).map((_, i) => (
                  <option key={i} value={String(i + 1)}>
                    Area {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="corner-select"
                className="block text-sm font-bold text-gray-700 mb-1"
              >
                Corner / Role
              </label>
              <select
                id="corner-select"
                aria-label="Corner / Role"
                title="Corner / Role"
                value={cornerId}
                onChange={(e) => setCornerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-gray-50 text-gray-900 font-medium"
              >
                <option value={CornerRole.CORNER_1}>Corner 1</option>
                <option value={CornerRole.CORNER_2}>Corner 2</option>
                <option value={CornerRole.CORNER_3}>Corner 3</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Match
              </label>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-gray-50 text-left flex justify-between items-center"
              >
                {matchId ? (
                  (() => {
                    const m = matches.find((x) => x.id === matchId);
                    if (!m)
                      return (
                        <span className="text-gray-900 font-medium">
                          {matchId}
                        </span>
                      );
                    return (
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-gray-700">
                          R{m.round}:
                        </span>
                        <span className="text-red-600 font-bold truncate">
                          {getCompetitorFullName(
                            m.redCompetitorId,
                            competitors,
                          )}
                        </span>
                        <span className="text-xs text-gray-400">vs</span>
                        <span className="text-blue-600 font-bold truncate">
                          {getCompetitorFullName(
                            m.blueCompetitorId,
                            competitors,
                          )}
                        </span>
                      </div>
                    );
                  })()
                ) : (
                  <span className="text-gray-400 font-medium">
                    -- Select a Match --
                  </span>
                )}
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  ></div>
                  <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {filteredMatches.map((m) => (
                      <li
                        key={m.id}
                        onClick={() => {
                          setMatchId(m.id);
                          setDropdownOpen(false);
                        }}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Round {m.round}{" "}
                          <span className="font-mono text-gray-400 ml-1">
                            ({m.id})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 font-black">
                            {getCompetitorFullName(
                              m.redCompetitorId,
                              competitors,
                            )}
                          </span>
                          <span className="text-xs text-gray-400 italic">
                            vs
                          </span>
                          <span className="text-blue-600 font-black">
                            {getCompetitorFullName(
                              m.blueCompetitorId,
                              competitors,
                            )}
                          </span>
                        </div>
                      </li>
                    ))}
                    {filteredMatches.length === 0 && (
                      <li className="px-4 py-4 text-center text-gray-500 italic">
                        No matches available in Area {areaId}.
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !matchId.trim()}
                className="flex-1 px-4 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                {submitting ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
