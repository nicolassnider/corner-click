import type { Match, Competitor } from "@corner-click/types";
import { MatchStatus, BracketType } from "@corner-click/types";

/**
 * Shuffles an array randomly using Fisher-Yates algorithm.
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  let currentIndex = arr.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [arr[currentIndex], arr[randomIndex]] = [
      arr[randomIndex],
      arr[currentIndex],
    ];
  }
  return arr;
}

/**
 * Propagates "BYE"s through any generic bracket structure.
 * It iterates until a fixed point is reached (no more changes).
 */
export function resolveByes(matches: Match[]): Match[] {
  const propagatedNext = new Set<string>();
  const propagatedLoser = new Set<string>();
  
  const matchMap = new Map<string, Match>();
  for (const m of matches) {
    matchMap.set(m.id, m);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const match of matches) {
      // 1. If match is PENDING but both spots are filled, and one or both is BYE -> auto-complete
      if (match.status === MatchStatus.PENDING && match.redCompetitorId !== "" && match.blueCompetitorId !== "") {
        const isRedBye = match.redCompetitorId === "BYE";
        const isBlueBye = match.blueCompetitorId === "BYE";
        if (isRedBye || isBlueBye) {
          match.status = MatchStatus.COMPLETED;
          if (isRedBye && isBlueBye) {
            match.winnerId = null;
          } else if (isRedBye) {
            match.winnerId = match.blueCompetitorId;
          } else {
            match.winnerId = match.redCompetitorId;
          }
          changed = true;
        }
      }

      // 2. Propagate COMPLETED match winner to nextMatchId
      if (match.status === MatchStatus.COMPLETED && match.nextMatchId && !propagatedNext.has(match.id)) {
        const nextMatch = matchMap.get(match.nextMatchId);
        if (nextMatch) {
          const winnerToPropagate = match.winnerId || "BYE";
          if (nextMatch.redCompetitorId === "") {
            nextMatch.redCompetitorId = winnerToPropagate;
            propagatedNext.add(match.id);
            changed = true;
          } else if (nextMatch.blueCompetitorId === "") {
            nextMatch.blueCompetitorId = winnerToPropagate;
            propagatedNext.add(match.id);
            changed = true;
          }
        }
      }

      // 3. Propagate COMPLETED match loser to losersMatchId
      if (match.status === MatchStatus.COMPLETED && match.losersMatchId && !propagatedLoser.has(match.id)) {
        const losersMatch = matchMap.get(match.losersMatchId);
        if (losersMatch) {
          let loserToPropagate = "BYE";
          if (match.winnerId) {
            loserToPropagate = match.winnerId === match.redCompetitorId ? match.blueCompetitorId : match.redCompetitorId;
          }
          if (loserToPropagate === "") loserToPropagate = "BYE";

          if (losersMatch.redCompetitorId === "") {
            losersMatch.redCompetitorId = loserToPropagate;
            propagatedLoser.add(match.id);
            changed = true;
          } else if (losersMatch.blueCompetitorId === "") {
            losersMatch.blueCompetitorId = loserToPropagate;
            propagatedLoser.add(match.id);
            changed = true;
          }
        }
      }
    }
  }
  return matches;
}

export interface BracketGenerator {
  generate(
    tournamentId: string,
    categoryId: string,
    areaId: string,
    competitors: Competitor[],
    nextId: () => string
  ): Match[];
}

/**
 * Generates a Single Elimination bracket.
 */
export class SingleEliminationGenerator implements BracketGenerator {
  generate(
    tournamentId: string,
    categoryId: string,
    areaId: string,
    competitors: Competitor[],
    nextId: () => string
  ): Match[] {
    if (competitors.length < 2) {
      throw new Error("Not enough competitors to generate a bracket");
    }

    const seeds = competitors.filter((c) => c.isSeeded);
    const unseeded = shuffle(competitors.filter((c) => !c.isSeeded));
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(competitors.length)));

    const orderedCompetitors: (Competitor | null)[] = new Array(bracketSize).fill(null);

    // Position seeds
    if (seeds.length > 0) orderedCompetitors[0] = seeds[0];
    if (seeds.length > 1) orderedCompetitors[bracketSize - 1] = seeds[1];
    if (seeds.length > 2) {
      orderedCompetitors[Math.floor(bracketSize / 2) - 1] = seeds[2];
    }

    // Fill remaining spots
    for (let i = 0; i < bracketSize; i++) {
      if (orderedCompetitors[i] === null) {
        if (unseeded.length > 0) {
          orderedCompetitors[i] = unseeded.pop() || null;
        }
      }
    }

    const totalRounds = Math.log2(bracketSize);
    const finalMatches: Match[] = [];

    const createNodes = (
      round: number,
      matchCount: number,
      nextMatchIds: string[] = []
    ): string[] => {
      if (round < 1) return [];

      const currentIds: string[] = [];
      for (let i = 0; i < matchCount; i++) {
        currentIds.push(nextId());
      }

      createNodes(round - 1, matchCount * 2, currentIds);

      for (let i = 0; i < matchCount; i++) {
        const matchId = currentIds[i];
        let redId = "";
        let blueId = "";
        let status: MatchStatus = MatchStatus.PENDING;
        let winnerId: string | null = null;

        if (round === 1) {
          const comp1 = orderedCompetitors[i * 2];
          const comp2 = orderedCompetitors[i * 2 + 1];
          redId = comp1 ? comp1.id : "BYE";
          blueId = comp2 ? comp2.id : "BYE";

          const isBye = comp1 === null || comp2 === null;
          if (isBye) {
            status = MatchStatus.COMPLETED;
            winnerId = comp1 ? comp1.id : comp2 ? comp2.id : null;
          }
        }

        finalMatches.push({
          id: matchId,
          tournamentId,
          categoryId,
          areaId,
          status,
          round,
          nextMatchId: nextMatchIds[Math.floor(i / 2)] || undefined,
          redCompetitorId: redId,
          blueCompetitorId: blueId,
          winnerId,
          score: { red: 0, blue: 0 },
          warnings: { red: 0, blue: 0 },
          deductions: { red: 0, blue: 0 },
        });
      }

      return currentIds;
    };

    createNodes(totalRounds, 1);
    return resolveByes(finalMatches);
  }
}

/**
 * Generates a Double Elimination (Winners + Losers/Repesca) bracket.
 */
export class DoubleEliminationGenerator implements BracketGenerator {
  generate(
    tournamentId: string,
    categoryId: string,
    areaId: string,
    competitors: Competitor[],
    nextId: () => string
  ): Match[] {
    if (competitors.length < 2) {
      throw new Error("Not enough competitors to generate a bracket");
    }

    // 1. Generate Winners Bracket using Single Elimination structure
    const singleGen = new SingleEliminationGenerator();
    const winnersMatches = singleGen.generate(tournamentId, categoryId, areaId, competitors, nextId);

    // Filter winners matches to exclude the Grand Final if we want to custom-route it
    // But we can just use the Winners final as a normal final, and append the Losers Bracket.
    // Let's identify the Winners Final Match: it's the match with round = maxRound, and no nextMatchId.
    const maxWinnersRound = Math.max(...winnersMatches.map(m => m.round || 1));
    const winnersFinal = winnersMatches.find(m => m.round === maxWinnersRound);

    if (!winnersFinal) {
      return winnersMatches;
    }

    // 2. Create the Grand Final match which will receive the winner of Winners Final and winner of Losers Final
    const grandFinalId = nextId();
    winnersFinal.nextMatchId = grandFinalId;

    const grandFinal: Match = {
      id: grandFinalId,
      tournamentId,
      categoryId,
      areaId,
      status: MatchStatus.PENDING,
      round: maxWinnersRound + 2, // Round after losers final
      redCompetitorId: "", // Winner of Winners Final
      blueCompetitorId: "", // Winner of Losers Final
      winnerId: null,
      score: { red: 0, blue: 0 },
      warnings: { red: 0, blue: 0 },
      deductions: { red: 0, blue: 0 },
    };

    // 3. Create the Losers/Repesca Bracket structure
    // For every round in Winners Bracket (except final), losers drop to a Losers match.
    // Let's build a simple Losers Bracket.
    // For 4 competitors:
    // W1, W2 (Round 1). Losers go to L1 (Losers Semifinal).
    // W3 (Winners Final). Loser of W3 goes to L2 (Losers Final) vs Winner of L1.
    // L2 Winner goes to Grand Final W4 vs W3 Winner.
    const losersMatches: Match[] = [];

    if (maxWinnersRound === 2) {
      // 4 competitors case
      const w1 = winnersMatches[0];
      const w2 = winnersMatches[1];
      const w3 = winnersMatches[2]; // Winners Final

      const l1Id = nextId(); // Losers Semifinal
      const l2Id = nextId(); // Losers Final

      w1.losersMatchId = l1Id;
      w2.losersMatchId = l1Id;
      w3.losersMatchId = l2Id;

      const l1: Match = {
        id: l1Id,
        tournamentId,
        categoryId,
        areaId,
        status: MatchStatus.PENDING,
        round: 1,
        isLosersBracket: true,
        nextMatchId: l2Id,
        redCompetitorId: "",
        blueCompetitorId: "",
        winnerId: null,
        score: { red: 0, blue: 0 },
        warnings: { red: 0, blue: 0 },
        deductions: { red: 0, blue: 0 },
      };

      const l2: Match = {
        id: l2Id,
        tournamentId,
        categoryId,
        areaId,
        status: MatchStatus.PENDING,
        round: 2,
        isLosersBracket: true,
        nextMatchId: grandFinalId,
        redCompetitorId: "", // Will hold Loser of W3
        blueCompetitorId: "", // Will hold Winner of L1
        winnerId: null,
        score: { red: 0, blue: 0 },
        warnings: { red: 0, blue: 0 },
        deductions: { red: 0, blue: 0 },
      };

      losersMatches.push(l1, l2);
    } else {
      // Generic fallback for larger brackets (8, 16):
      // We will create a mirror Losers match for each pair of Winners matches in Winners Round 1,
      // and then Winners Round 2 losers drop to subsequent Losers rounds.
      // For simplicity and robust generic double elimination:
      // Let's create a Losers match for every Winners match of Round 1.
      const round1Winners = winnersMatches.filter(m => m.round === 1);
      const losersRound1Ids: string[] = [];

      for (let i = 0; i < round1Winners.length; i += 2) {
        const lMatchId = nextId();
        losersRound1Ids.push(lMatchId);
        round1Winners[i].losersMatchId = lMatchId;
        if (round1Winners[i + 1]) {
          round1Winners[i + 1].losersMatchId = lMatchId;
        }

        losersMatches.push({
          id: lMatchId,
          tournamentId,
          categoryId,
          areaId,
          status: MatchStatus.PENDING,
          round: 1,
          isLosersBracket: true,
          redCompetitorId: "",
          blueCompetitorId: "",
          winnerId: null,
          score: { red: 0, blue: 0 },
          warnings: { red: 0, blue: 0 },
          deductions: { red: 0, blue: 0 },
        });
      }

      // Link Losers round 1 to Losers round 2, and drop Winners round 2 losers.
      let currentLosersMatches = [...losersMatches];
      let currentRound = 1;

      while (currentRound < maxWinnersRound) {
        const nextLosersMatches: Match[] = [];
        const winnersOfCurrentRound = winnersMatches.filter(m => m.round === currentRound + 1);

        for (let i = 0; i < currentLosersMatches.length; i++) {
          const lMatchId = nextId();
          currentLosersMatches[i].nextMatchId = lMatchId;

          // Also drop the loser of the corresponding winners round 2/3 match
          if (winnersOfCurrentRound[Math.floor(i / 2)]) {
            winnersOfCurrentRound[Math.floor(i / 2)].losersMatchId = lMatchId;
          }

          nextLosersMatches.push({
            id: lMatchId,
            tournamentId,
            categoryId,
            areaId,
            status: MatchStatus.PENDING,
            round: currentRound + 1,
            isLosersBracket: true,
            redCompetitorId: "",
            blueCompetitorId: "",
            winnerId: null,
            score: { red: 0, blue: 0 },
            warnings: { red: 0, blue: 0 },
            deductions: { red: 0, blue: 0 },
          });
        }

        if (nextLosersMatches.length === 0) break;
        losersMatches.push(...nextLosersMatches);
        currentLosersMatches = nextLosersMatches;
        currentRound++;
      }

      // Finally, the last losers match goes to the Grand Final
      if (currentLosersMatches.length > 0) {
        currentLosersMatches[0].nextMatchId = grandFinalId;
      }
    }

    return resolveByes([...winnersMatches, ...losersMatches, grandFinal]);
  }
}

/**
 * Generates a Round Robin (every competitor plays every other competitor) bracket.
 */
export class RoundRobinGenerator implements BracketGenerator {
  generate(
    tournamentId: string,
    categoryId: string,
    areaId: string,
    competitors: Competitor[],
    nextId: () => string
  ): Match[] {
    if (competitors.length < 2) {
      throw new Error("Not enough competitors to generate a bracket");
    }

    const matches: Match[] = [];
    let roundCounter = 1;

    // Generate matches: N * (N - 1) / 2
    for (let i = 0; i < competitors.length; i++) {
      for (let j = i + 1; j < competitors.length; j++) {
        matches.push({
          id: nextId(),
          tournamentId,
          categoryId,
          areaId,
          status: MatchStatus.PENDING,
          round: roundCounter++,
          redCompetitorId: competitors[i].id,
          blueCompetitorId: competitors[j].id,
          winnerId: null,
          score: { red: 0, blue: 0 },
          warnings: { red: 0, blue: 0 },
          deductions: { red: 0, blue: 0 },
        });
      }
    }

    return matches;
  }
}

/**
 * Factory class to instantiate the appropriate BracketGenerator.
 */
export class BracketFactory {
  static getGenerator(type: BracketType): BracketGenerator {
    switch (type) {
      case BracketType.DOUBLE_ELIMINATION:
        return new DoubleEliminationGenerator();
      case BracketType.ROUND_ROBIN:
        return new RoundRobinGenerator();
      case BracketType.SINGLE_ELIMINATION:
      default:
        return new SingleEliminationGenerator();
    }
  }
}
