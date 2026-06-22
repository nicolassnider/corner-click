import { describe, it, expect } from "vitest";
import { BracketFactory } from "../services/brackets/bracketGenerators";
import { BracketType, MatchStatus } from "@corner-click/types";
import type { Competitor } from "@corner-click/types";

const mockCompetitors = (count: number): Competitor[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `comp-${i + 1}`,
    tournamentId: "t-1",
    categoryId: "c-1",
    firstName: "Competidor",
    lastName: `${i + 1}`,
    club: "Club A",
    country: "AR",
    isSeeded: i < 2, // Top 2 seeded
  }));
};

describe("Fábrica de Brackets y Algoritmos de Generación", () => {
  describe("SingleEliminationGenerator", () => {
    it("debe generar una llave de eliminación simple para 4 competidores", () => {
      const competitors = mockCompetitors(4);
      const generator = BracketFactory.getGenerator(BracketType.SINGLE_ELIMINATION);
      let idCounter = 1;
      const nextId = () => `match-${idCounter++}`;

      const matches = generator.generate("t-1", "c-1", "area-1", competitors, nextId);

      // N = 4 competitors -> total rounds = log2(4) = 2 rounds.
      // Semis: 2 matches (round 1). Final: 1 match (round 2). Total: 3 matches.
      expect(matches.length).toBe(3);
      expect(matches.filter((m) => m.round === 1).length).toBe(2);
      expect(matches.filter((m) => m.round === 2).length).toBe(1);

      // Verify parent-child links
      const round1Matches = matches.filter((m) => m.round === 1);
      const finalMatch = matches.find((m) => m.round === 2);
      expect(finalMatch).toBeDefined();
      round1Matches.forEach((m) => {
        expect(m.nextMatchId).toBe(finalMatch!.id);
      });
    });

    it("debe distribuir Byes correctamente cuando no es potencia de 2", () => {
      const competitors = mockCompetitors(3); // 3 competitors -> size 4 with 1 Bye
      const generator = BracketFactory.getGenerator(BracketType.SINGLE_ELIMINATION);
      let idCounter = 1;
      const nextId = () => `match-${idCounter++}`;

      const matches = generator.generate("t-1", "c-1", "area-1", competitors, nextId);

      expect(matches.length).toBe(3);
      const round1Matches = matches.filter((m) => m.round === 1);
      // One of the round 1 matches must have a BYE and be completed
      const byeMatch = round1Matches.find(
        (m) => m.redCompetitorId === "BYE" || m.blueCompetitorId === "BYE"
      );
      expect(byeMatch).toBeDefined();
      expect(byeMatch!.status).toBe(MatchStatus.COMPLETED);
      expect(byeMatch!.winnerId).toBeDefined();
      expect(byeMatch!.winnerId).not.toBeNull();
    });
  });

  describe("DoubleEliminationGenerator", () => {
    it("debe generar la estructura de doble eliminación con repesca para 4 competidores", () => {
      const competitors = mockCompetitors(4);
      const generator = BracketFactory.getGenerator(BracketType.DOUBLE_ELIMINATION);
      let idCounter = 1;
      const nextId = () => `match-${idCounter++}`;

      const matches = generator.generate("t-1", "c-1", "area-1", competitors, nextId);

      // 4 competitors double elimination:
      // Winners Bracket: 2 Semis (Round 1) + 1 Final (Round 2) -> 3 matches
      // Losers Bracket: 1 Losers Semis (Round 1) + 1 Losers Final (Round 2) -> 2 matches
      // Grand Final: 1 Grand Final (Round 4) -> 1 match
      // Total matches: 3 + 2 + 1 = 6 matches.
      expect(matches.length).toBe(6);

      const winnersFinal = matches.find((m) => m.round === 2 && !m.isLosersBracket);
      expect(winnersFinal!.losersMatchId).toBeDefined(); // Loser of winners final goes to losers final
      expect(winnersFinal!.nextMatchId).toBeDefined(); // Winner of winners final goes to Grand Final

      const losersMatches = matches.filter((m) => m.isLosersBracket);
      expect(losersMatches.length).toBe(2);
      expect(losersMatches.every((m) => m.isLosersBracket === true)).toBe(true);
    });
  });

  describe("RoundRobinGenerator", () => {
    it("debe generar combates todos contra todos en Round Robin", () => {
      const competitors = mockCompetitors(4);
      const generator = BracketFactory.getGenerator(BracketType.ROUND_ROBIN);
      let idCounter = 1;
      const nextId = () => `match-${idCounter++}`;

      const matches = generator.generate("t-1", "c-1", "area-1", competitors, nextId);

      // N = 4 -> N * (N - 1) / 2 = 6 matches
      expect(matches.length).toBe(6);

      // Verify no nextMatchId is set
      matches.forEach((m) => {
        expect(m.nextMatchId).toBeUndefined();
      });
    });
  });
});
