import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../utils/apiClient";
import { getMatches } from "../services/bracketService";
import { getCompetitors } from "../services/competitorService";
import type { Match, Competitor } from "@corner-click/types";
import { MatchStatus, calculateNetScore } from "@corner-click/types";

interface Props {
  tournamentId: string;
  categoryId: string;
}

interface JudgeMatchStats {
  matchId: string;
  agreedWithWinner: boolean;
  scoreGiven: { red: number; blue: number };
}

interface JudgeAudit {
  judgeName: string;
  totalMatches: number;
  agreements: number;
  consistencyRate: number;
}

export default function AnalyticsManager({ tournamentId, categoryId }: Props) {
  const [competitors, setCompetitors] = useState<Record<string, Competitor>>(
    {},
  );
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [judgeAudits, setJudgeAudits] = useState<JudgeAudit[]>([]);
  const [generalStats, setGeneralStats] = useState({
    totalPoints: 0,
    totalWarnings: 0,
    totalDeductions: 0,
    completedMatches: 0,
    technique1Pt: 0,
    technique2Pt: 0,
    technique3Pt: 0,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const competitorsList = await getCompetitors(tournamentId);
        const compsMap: Record<string, Competitor> = {};
        competitorsList.forEach((c) => {
          compsMap[c.id] = c;
        });
        if (active) setCompetitors(compsMap);

        const fetchedMatches = await getMatches(tournamentId, categoryId);
        if (!active) return;
        setMatches(fetchedMatches);

        const completed = fetchedMatches.filter(
          (m) => m.status === MatchStatus.COMPLETED && m.winnerId,
        );

        // Fetch detailed judge scores for each completed match
        const judgeDataMap: Record<string, { total: number; matched: number }> =
          {};

        let points = 0;
        let warnings = 0;
        let deductions = 0;

        for (const match of completed) {
          try {
            const res = await fetchWithAuth(`/api/matches/${match.id}/scores`);
            if (res.ok) {
              const { scores } = await res.json();
              // Calculate judge agreement with consensus winner
              const winnerId = match.winnerId;

              Object.entries(scores).forEach(
                ([judgeName, card]: [string, any]) => {
                  const rScore = calculateNetScore(
                    card.redScore || 0,
                    card.redWarnings || 0,
                    card.redDeductions || 0,
                  );
                  const bScore = calculateNetScore(
                    card.blueScore || 0,
                    card.blueWarnings || 0,
                    card.blueDeductions || 0,
                  );

                  let judgeWinner = null;
                  if (rScore > bScore) judgeWinner = match.redCompetitorId;
                  else if (bScore > rScore)
                    judgeWinner = match.blueCompetitorId;

                  const agreed = judgeWinner === winnerId;

                  if (!judgeDataMap[judgeName]) {
                    judgeDataMap[judgeName] = { total: 0, matched: 0 };
                  }
                  judgeDataMap[judgeName].total += 1;
                  if (agreed) {
                    judgeDataMap[judgeName].matched += 1;
                  }

                  // Add to aggregate counts
                  points += (card.redScore || 0) + (card.blueScore || 0);
                  warnings +=
                    (card.redWarnings || 0) + (card.blueWarnings || 0);
                  deductions +=
                    (card.redDeductions || 0) + (card.blueDeductions || 0);
                },
              );
            }
          } catch (err) {
            console.error(`Failed to load scores for match ${match.id}`, err);
          }
        }

        const audits: JudgeAudit[] = Object.entries(judgeDataMap).map(
          ([judgeName, stats]) => ({
            judgeName,
            totalMatches: stats.total,
            agreements: stats.matched,
            consistencyRate:
              stats.total > 0
                ? Math.round((stats.matched / stats.total) * 100)
                : 100,
          }),
        );

        if (active) {
          setJudgeAudits(audits);

          // Estimate technique distribution based on standard Taekwon-Do point ratios
          // 1 Pt (Punch) ~ 55%, 2 Pt (Body Kick) ~ 30%, 3 Pt (Head Kick) ~ 15%
          const t1 = Math.round(points * 0.55);
          const t2 = Math.round((points * 0.3) / 2);
          const t3 = Math.round((points * 0.15) / 3);

          setGeneralStats({
            totalPoints: points,
            totalWarnings: warnings,
            totalDeductions: deductions,
            completedMatches: completed.length,
            technique1Pt: t1,
            technique2Pt: t2,
            technique3Pt: t3,
          });
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [tournamentId, categoryId]);

  const getCompetitorName = (id: string) => {
    if (!id) return "BYE";
    const comp = competitors[id];
    return comp ? `${comp.firstName} ${comp.lastName}` : id;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    // Build Markdown report
    let md = `# Reporte Analítico del Torneo\n\n`;
    md += `**Categoría:** ${categoryId}\n`;
    md += `**Combates Completados:** ${generalStats.completedMatches} de ${matches.length}\n`;
    md += `**Fecha de Generación:** ${new Date().toLocaleString()}\n\n`;

    md += `## 1. Estadísticas Generales\n\n`;
    md += `| Métrica | Total |\n`;
    md += `| --- | --- |\n`;
    md += `| Puntos Registrados | ${generalStats.totalPoints} |\n`;
    md += `| Advertencias (Warnings) | ${generalStats.totalWarnings} |\n`;
    md += `| Deducciones (Faltas) | ${generalStats.totalDeductions} |\n\n`;

    md += `## 2. Distribución de Técnicas (Estimación)\n\n`;
    md += `- **Punches (1 Pt):** ${generalStats.technique1Pt} veces\n`;
    md += `- **Body Kicks (2 Pts):** ${generalStats.technique2Pt} veces\n`;
    md += `- **Head Kicks (3 Pts):** ${generalStats.technique3Pt} veces\n\n`;

    md += `## 3. Resultados de Combates\n\n`;
    md += `| Combate | Competidor Rojo | Competidor Azul | Ganador | Estado |\n`;
    md += `| --- | --- | --- | --- | --- |\n`;
    matches.forEach((m, idx) => {
      const winner = m.winnerId ? getCompetitorName(m.winnerId) : "TBD";
      md += `| R${m.round} - M${idx + 1} | ${getCompetitorName(m.redCompetitorId)} | ${getCompetitorName(m.blueCompetitorId)} | **${winner}** | ${m.status} |\n`;
    });
    md += `\n`;

    md += `## 4. Auditoría y Consistencia de Jueces\n\n`;
    md += `| Nombre del Juez | Combates Evaluados | Votos en Consenso | Tasa de Consistencia |\n`;
    md += `| --- | --- | --- | --- |\n`;
    judgeAudits.forEach((j) => {
      md += `| ${j.judgeName} | ${j.totalMatches} | ${j.agreements} | ${j.consistencyRate}% |\n`;
    });

    // Create Blob & download
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_categoria_${categoryId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Calculate percentages for SVG charts
  const totalTechniques =
    generalStats.technique1Pt +
      generalStats.technique2Pt +
      generalStats.technique3Pt || 1;
  const p1 = (generalStats.technique1Pt / totalTechniques) * 100;
  const p2 = (generalStats.technique2Pt / totalTechniques) * 100;
  const p3 = (generalStats.technique3Pt / totalTechniques) * 100;

  return (
    <div className="space-y-8 print:p-0 print:space-y-6">
      {/* Header Actions - hidden on print */}
      <div className="flex justify-between items-center print:hidden bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">
          Analíticas & Auditoría de Llaves
        </h2>
        <div className="flex gap-4">
          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Exportar Markdown (.md)
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Imprimir Reporte
          </button>
        </div>
      </div>

      {/* Grid: Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Puntos Totales
          </span>
          <div className="text-3xl font-black text-blue-600 mt-2">
            {generalStats.totalPoints}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Faltas (Warnings)
          </span>
          <div className="text-3xl font-black text-amber-500 mt-2">
            {generalStats.totalWarnings}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Deducciones
          </span>
          <div className="text-3xl font-black text-red-500 mt-2">
            {generalStats.totalDeductions}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Combates Jugados
          </span>
          <div className="text-3xl font-black text-emerald-600 mt-2">
            {generalStats.completedMatches}
          </div>
        </div>
      </div>

      {/* Grid: Charts and Consistency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
        {/* SVG Techniques Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-3">
            Distribución Estándar de Técnicas
          </h3>
          <div className="flex justify-center items-center h-64">
            <svg viewBox="0 0 400 200" className="w-full max-w-sm h-full">
              {/* Grid lines */}
              <line
                x1="50"
                y1="20"
                x2="350"
                y2="20"
                stroke="#E2E8F0"
                strokeDasharray="4"
              />
              <line
                x1="50"
                y1="70"
                x2="350"
                y2="70"
                stroke="#E2E8F0"
                strokeDasharray="4"
              />
              <line
                x1="50"
                y1="120"
                x2="350"
                y2="120"
                stroke="#E2E8F0"
                strokeDasharray="4"
              />
              <line
                x1="50"
                y1="170"
                x2="350"
                y2="170"
                stroke="#CBD5E1"
                strokeWidth="1.5"
              />

              {/* Bar 1 (+1 Pt) */}
              <rect
                x="80"
                y={170 - p1 * 1.3}
                width="40"
                height={p1 * 1.3}
                fill="#3B82F6"
                rx="4"
                className="transition-all duration-1000"
              />
              <text
                x="100"
                y="190"
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748B"
              >
                Punches (+1)
              </text>
              <text
                x="100"
                y={160 - p1 * 1.3}
                textAnchor="middle"
                fontSize="12"
                fontWeight="black"
                fill="#1E293B"
              >
                {Math.round(p1)}%
              </text>

              {/* Bar 2 (+2 Pt) */}
              <rect
                x="180"
                y={170 - p2 * 1.3}
                width="40"
                height={p2 * 1.3}
                fill="#10B981"
                rx="4"
                className="transition-all duration-1000"
              />
              <text
                x="200"
                y="190"
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748B"
              >
                Body (+2)
              </text>
              <text
                x="200"
                y={160 - p2 * 1.3}
                textAnchor="middle"
                fontSize="12"
                fontWeight="black"
                fill="#1E293B"
              >
                {Math.round(p2)}%
              </text>

              {/* Bar 3 (+3 Pt) */}
              <rect
                x="280"
                y={170 - p3 * 1.3}
                width="40"
                height={p3 * 1.3}
                fill="#8B5CF6"
                rx="4"
                className="transition-all duration-1000"
              />
              <text
                x="300"
                y="190"
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748B"
              >
                Head (+3)
              </text>
              <text
                x="300"
                y={160 - p3 * 1.3}
                textAnchor="middle"
                fontSize="12"
                fontWeight="black"
                fill="#1E293B"
              >
                {Math.round(p3)}%
              </text>
            </svg>
          </div>
        </div>

        {/* Judge Audits Table */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-3">
            Consistencia y Auditoría de Jueces
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Juez
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Combates
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Consensos
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Consistencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {judgeAudits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-gray-400 font-medium"
                    >
                      No hay suficientes combates completados para evaluar.
                    </td>
                  </tr>
                ) : (
                  judgeAudits.map((j, idx) => {
                    const rateColor =
                      j.consistencyRate >= 85
                        ? "bg-emerald-100 text-emerald-800"
                        : j.consistencyRate >= 70
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800";
                    return (
                      <tr key={idx}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">
                          {j.judgeName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600 font-medium">
                          {j.totalMatches}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600 font-medium">
                          {j.agreements}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${rateColor}`}
                          >
                            {j.consistencyRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printable Area Details - hidden on web view, visible on print */}
      <div className="hidden print:block border-t-2 pt-6 mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Resumen Técnico de Combates
        </h3>
        <table className="min-w-full divide-y divide-slate-300 border">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-3 py-2 text-left text-xs font-bold uppercase">
                Ronda
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase">
                Competidor Rojo
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase">
                Competidor Azul
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase">
                Ganador
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold uppercase">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {matches.map((m, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2">R{m.round}</td>
                <td className="px-3 py-2 font-bold">
                  {getCompetitorName(m.redCompetitorId)}
                </td>
                <td className="px-3 py-2 font-bold">
                  {getCompetitorName(m.blueCompetitorId)}
                </td>
                <td className="px-3 py-2 font-extrabold text-blue-700">
                  {m.winnerId ? getCompetitorName(m.winnerId) : "TBD"}
                </td>
                <td className="px-3 py-2 text-center uppercase text-[10px] font-bold">
                  {m.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
