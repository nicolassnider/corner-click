import { calculateNetScore, type Match, MatchStatus } from '@corner-click/types'

export interface ScoreCard {
  redScore?: number
  redWarnings?: number
  redDeductions?: number
  blueScore?: number
  blueWarnings?: number
  blueDeductions?: number
}

export interface GeneralStats {
  totalPoints: number
  totalWarnings: number
  totalDeductions: number
  completedMatches: number
  technique1Pt: number
  technique2Pt: number
  technique3Pt: number
}

export interface JudgeAudit {
  judgeName: string
  totalMatches: number
  agreements: number
  consistencyRate: number
}

export interface MatchStats {
  matchId: string
  round: number
  redCompetitorId: string
  blueCompetitorId: string
  winnerId?: string | null
  redTotalPoints: number
  blueTotalPoints: number
  redTotalWarnings: number
  blueTotalWarnings: number
  redTotalDeductions: number
  blueTotalDeductions: number
}

export function calculateStatsAndAudits(
  matches: Match[],
  matchScores: Record<string, Record<string, ScoreCard>> // matchId -> judgeName -> scoreCard
): {
  generalStats: GeneralStats
  judgeAudits: JudgeAudit[]
  matchStats: MatchStats[]
} {
  const completed = matches.filter((m) => m.status === MatchStatus.COMPLETED && m.winnerId)

  const judgeDataMap: Record<string, { total: number; matched: number }> = {}
  let points = 0
  let warnings = 0
  let deductions = 0
  const matchStatsList: MatchStats[] = []

  completed.forEach((match) => {
    const scores = matchScores[match.id]
    if (!scores) {
      return
    }
    const winnerId = match.winnerId

    let redTotalPoints = 0
    let blueTotalPoints = 0
    let redTotalWarnings = 0
    let blueTotalWarnings = 0
    let redTotalDeductions = 0
    let blueTotalDeductions = 0

    Object.entries(scores).forEach(([judgeName, card]) => {
      const rScore = calculateNetScore(
        card.redScore || 0,
        card.redWarnings || 0,
        card.redDeductions || 0
      )
      const bScore = calculateNetScore(
        card.blueScore || 0,
        card.blueWarnings || 0,
        card.blueDeductions || 0
      )

      let judgeWinner = null
      if (rScore > bScore) {
        judgeWinner = match.redCompetitorId
      } else if (bScore > rScore) {
        judgeWinner = match.blueCompetitorId
      }

      const agreed = judgeWinner === winnerId

      if (!judgeDataMap[judgeName]) {
        judgeDataMap[judgeName] = { total: 0, matched: 0 }
      }
      judgeDataMap[judgeName].total += 1
      if (agreed) {
        judgeDataMap[judgeName].matched += 1
      }

      redTotalPoints += card.redScore || 0
      blueTotalPoints += card.blueScore || 0
      redTotalWarnings += card.redWarnings || 0
      blueTotalWarnings += card.blueWarnings || 0
      redTotalDeductions += card.redDeductions || 0
      blueTotalDeductions += card.blueDeductions || 0

      points += (card.redScore || 0) + (card.blueScore || 0)
      warnings += (card.redWarnings || 0) + (card.blueWarnings || 0)
      deductions += (card.redDeductions || 0) + (card.blueDeductions || 0)
    })

    matchStatsList.push({
      matchId: match.id,
      round: match.round || 1,
      redCompetitorId: match.redCompetitorId,
      blueCompetitorId: match.blueCompetitorId,
      winnerId: match.winnerId,
      redTotalPoints,
      blueTotalPoints,
      redTotalWarnings,
      blueTotalWarnings,
      redTotalDeductions,
      blueTotalDeductions,
    })
  })

  const audits: JudgeAudit[] = Object.entries(judgeDataMap).map(([judgeName, stats]) => ({
    judgeName,
    totalMatches: stats.total,
    agreements: stats.matched,
    consistencyRate: stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 100,
  }))

  const t1 = Math.round(points * 0.55)
  const t2 = Math.round((points * 0.3) / 2)
  const t3 = Math.round((points * 0.15) / 3)

  return {
    generalStats: {
      totalPoints: points,
      totalWarnings: warnings,
      totalDeductions: deductions,
      completedMatches: completed.length,
      technique1Pt: t1,
      technique2Pt: t2,
      technique3Pt: t3,
    },
    judgeAudits: audits,
    matchStats: matchStatsList,
  }
}

export function generateMarkdownReport({
  categoryId,
  categoryName,
  tournamentName,
  completedMatchesCount,
  totalMatchesCount,
  generalStats,
  matches,
  judgeAudits,
  matchStats,
  getCompetitorName,
}: {
  categoryId: string
  categoryName?: string
  tournamentName?: string
  completedMatchesCount: number
  totalMatchesCount: number
  generalStats: GeneralStats
  matches: Match[]
  judgeAudits: JudgeAudit[]
  matchStats: MatchStats[]
  getCompetitorName: (id: string) => string
}): string {
  let md = `# Reporte Analítico del Torneo: ${tournamentName || 'Sin Nombre'}\n\n`
  md += `**Categoría:** ${categoryName || categoryId}\n`
  md += `**Combates Completados:** ${completedMatchesCount} de ${totalMatchesCount}\n`
  md += `**Fecha de Generación:** ${new Date().toLocaleString()}\n\n`

  md += `## 1. Estadísticas Generales\n\n`
  md += `| Métrica | Total |\n`
  md += `| --- | --- |\n`
  md += `| Puntos Registrados | ${generalStats.totalPoints} |\n`
  md += `| Advertencias (Warnings) | ${generalStats.totalWarnings} |\n`
  md += `| Deducciones (Faltas) | ${generalStats.totalDeductions} |\n\n`

  md += `## 2. Distribución de Técnicas (Estimación)\n\n`
  md += `- **Punches (1 Pt):** ${generalStats.technique1Pt} veces\n`
  md += `- **Body Kicks (2 Pts):** ${generalStats.technique2Pt} veces\n`
  md += `- **Head Kicks (3 Pts):** ${generalStats.technique3Pt} veces\n\n`

  md += `## 3. Resultados de Combates\n\n`
  md += `| Combate | Competidor Rojo | Competidor Azul | Ganador | Estado |\n`
  md += `| --- | --- | --- | --- | --- |\n`
  matches.forEach((m, idx) => {
    const winner = m.winnerId ? getCompetitorName(m.winnerId) : 'TBD'
    md += `| R${m.round} - M${idx + 1} | ${getCompetitorName(m.redCompetitorId)} | ${getCompetitorName(m.blueCompetitorId)} | **${winner}** | ${m.status} |\n`
  })
  md += `\n`

  md += `## 4. Estadísticas por Combate\n\n`
  md += `| Combate | Pts Rojo | Pts Azul | Faltas Rojo | Faltas Azul | Ded. Rojo | Ded. Azul |\n`
  md += `| --- | --- | --- | --- | --- | --- | --- |\n`
  matchStats.forEach((ms) => {
    const redName = getCompetitorName(ms.redCompetitorId)
    const blueName = getCompetitorName(ms.blueCompetitorId)
    md += `| R${ms.round} (${redName} vs ${blueName}) | ${ms.redTotalPoints} | ${ms.blueTotalPoints} | ${ms.redTotalWarnings} | ${ms.blueTotalWarnings} | ${ms.redTotalDeductions} | ${ms.blueTotalDeductions} |\n`
  })
  md += `\n`

  md += `## 5. Auditoría y Consistencia de Jueces\n\n`
  md += `| Nombre del Juez | Combates Evaluados | Votos en Consenso | Tasa de Consistencia |\n`
  md += `| --- | --- | --- | --- |\n`
  judgeAudits.forEach((j) => {
    md += `| ${j.judgeName} | ${j.totalMatches} | ${j.agreements} | ${j.consistencyRate}% |\n`
  })

  return md
}
