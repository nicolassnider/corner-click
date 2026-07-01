import type { Judge, Match, Tournament } from '@corner-click/types'

export interface ITournamentRepository {
  findAll(): Promise<Tournament[]>
  findById(id: string): Promise<Tournament | null>
  create(tournament: Omit<Tournament, 'id'>): Promise<Tournament>
  update(id: string, data: Partial<Tournament>): Promise<Tournament | null>
  delete(id: string): Promise<void>
}

export interface IMatchRepository {
  findByTournament(tournamentId: string): Promise<Match[]>
  findById(id: string): Promise<Match | null>
  updateStatus(id: string, status: string): Promise<void>
  submitScores(id: string, cornerId: string, scores: unknown): Promise<void>
  getScores(id: string): Promise<unknown>
  streamScores(
    id: string,
    onUpdate: (data: unknown) => void,
    onError: (error: unknown) => void
  ): () => void
  declareWinner(
    matchId: string,
    params: {
      winnerId: string
      tournamentId: string
      nextMatchId?: string
      losersMatchId?: string
      loserId?: string
    }
  ): Promise<void>
}

export interface IJudgeRepository {
  create(tournamentId: string, judge: Omit<Judge, 'id'>): Promise<Judge>
  findByPin(pin: string): Promise<{ id: string; data: Judge } | null>
  findByTournament(tournamentId: string): Promise<Judge[]>
  updateStatus(
    tournamentId: string,
    judgeId: string,
    status: string,
    lastActiveAt?: string
  ): Promise<void>
  updateAssignment(tournamentId: string, judgeId: string, assignment: unknown): Promise<void>
  delete(tournamentId: string, judgeId: string): Promise<void>
  cleanupExpiredJudges(tournamentId: string): Promise<void>
}

export interface IAuthService {
  createJudgeToken(judgeId: string, claims: Record<string, unknown>): Promise<string>
  loginAdmin(
    email: string,
    password: string
  ): Promise<{
    token: string
    uid: string
    email: string
    displayName: string | null
  }>
  createGuestToken(): Promise<{ token: string; uid: string }>
}
