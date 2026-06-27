import type { Tournament, Match, Judge } from "@corner-click/types";

export interface ITournamentRepository {
  findAll(): Promise<Tournament[]>;
  findById(id: string): Promise<Tournament | null>;
  create(tournament: Omit<Tournament, "id">): Promise<Tournament>;
  update(id: string, data: Partial<Tournament>): Promise<Tournament | null>;
  delete(id: string): Promise<void>;
}

export interface IMatchRepository {
  findByTournament(tournamentId: string): Promise<Match[]>;
  findById(id: string): Promise<Match | null>;
  updateStatus(id: string, status: string): Promise<void>;
}

export interface IJudgeRepository {
  findAll(): Promise<Judge[]>;
  findById(id: string): Promise<Judge | null>;
  updateStatus(id: string, status: string): Promise<void>;
}
