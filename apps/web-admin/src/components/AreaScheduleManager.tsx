import React, { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { database } from "../lib/firebase";
import { getMatches } from "../services/bracketService";
import { getCompetitors } from "../services/competitorService";
import type { Match, Competitor, Category } from "@corner-click/types";
import { MatchStatus } from "@corner-click/types";

interface AreaScheduleManagerProps {
  tournamentId: string;
  tournamentAreas: number;
}

export const AreaScheduleManager: React.FC<AreaScheduleManagerProps> = ({
  tournamentId,
  tournamentAreas,
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>("1");
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitors, setCompetitors] = useState<Record<string, Competitor>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchesData, compsData] = await Promise.all([
        getMatches(tournamentId),
        getCompetitors(tournamentId),
      ]);
      setMatches(matchesData);

      const compsMap: Record<string, Competitor> = {};
      compsData.forEach((c) => {
        compsMap[c.id] = c;
      });
      setCompetitors(compsMap);

      const catSnap = await get(ref(database, `tournaments/${tournamentId}/categories`));
      if (catSnap.exists()) {
        setCategories(catSnap.val());
      }
    } catch (error) {
      console.error("Failed to load schedule data:", error);
    } finally {
      setLoading(false);
    }
  };

  const areaOptions = Array.from({ length: tournamentAreas }).map(
    (_, i) => `${i + 1}`
  );

  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case MatchStatus.ACTIVE:
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">ACTIVE</span>;
      case MatchStatus.PENDING:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">PENDING</span>;
      case MatchStatus.COMPLETED:
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">COMPLETED</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">{status}</span>;
    }
  };

  const getCompetitorName = (id?: string) => {
    if (!id) return "TBD";
    const c = competitors[id];
    return c ? `${c.firstName} ${c.lastName}` : "Unknown";
  };

  // Filter and sort matches: Active first, then Pending, then Completed
  const areaMatches = matches
    .filter((m) => m.areaId === selectedAreaId)
    .sort((a, b) => {
      const statusOrder = {
        [MatchStatus.ACTIVE]: 0,
        [MatchStatus.PENDING]: 1,
        [MatchStatus.COMPLETED]: 2,
      } as Record<string, number>;
      
      const orderA = statusOrder[a.status] ?? 99;
      const orderB = statusOrder[b.status] ?? 99;
      
      if (orderA !== orderB) return orderA - orderB;
      // If same status, try to sort by round if applicable (or maintain generation order)
      return (a.round || 0) - (b.round || 0);
    });

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading schedule...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Selector de Área */}
      <div>
        <label
          htmlFor="area-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Seleccionar Área para ver cronograma
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {areaOptions.map((area) => (
            <button
              key={area}
              onClick={() => setSelectedAreaId(area)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${
                selectedAreaId === area
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Área {area}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Combates */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {areaMatches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No hay combates asignados a esta área.</p>
            <p className="text-sm mt-1">Los combates aparecerán aquí una vez generadas las llaves.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {areaMatches.map((match, idx) => (
              <div key={match.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-center gap-4">
                {/* Order & Status */}
                <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-gray-200 pr-4">
                  <span className="text-xs text-gray-400 font-bold mb-1">#{idx + 1}</span>
                  {getStatusBadge(match.status)}
                </div>

                {/* Match Details */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-indigo-600 mb-1 truncate">
                    {categories[match.categoryId]?.name || "Categoría Desconocida"}
                    {match.round ? ` • Ronda ${match.round}` : ""}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="flex-1 flex items-center justify-end">
                      <span className="truncate">{getCompetitorName(match.redCompetitorId)}</span>
                      <div className="ml-3 w-3 h-3 bg-red-500 rounded-full shrink-0"></div>
                    </div>
                    
                    <div className="text-gray-400 font-bold px-2">VS</div>
                    
                    <div className="flex-1 flex items-center justify-start">
                      <div className="mr-3 w-3 h-3 bg-blue-500 rounded-full shrink-0"></div>
                      <span className="truncate">{getCompetitorName(match.blueCompetitorId)}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
