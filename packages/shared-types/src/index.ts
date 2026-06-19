export enum TournamentStatus {
  UPCOMING = 'UPCOMING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum JudgeStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export enum MatchStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
  COMPLETED = 'COMPLETED',
}

export enum CornerRole {
  RED = 'red',
  BLUE = 'blue',
  CORNER_1 = 'corner_1',
  CORNER_2 = 'corner_2',
  CORNER_3 = 'corner_3',
  CORNER_4 = 'corner_4',
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  areas: number;
  status: TournamentStatus;
  organizerId?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  tournamentId: string;
  name: string;
  gender: Gender;
  ageGroup: string;
  beltLevel: string;
  weightClass: string;
  matchDuration: number;
  rounds: number;
}

export interface Competitor {
  id: string;
  tournamentId: string;
  categoryId: string;
  firstName: string;
  lastName: string;
  club: string;
  country: string;
  birthDate?: string;
  gender?: Gender;
  weight?: number;
  height?: number;
  belt?: string;
  isSeeded?: boolean;
}

export interface Judge {
  id: string;
  tournamentId: string;
  name: string;
  pin: string;
  status: JudgeStatus;
  currentAssignment: {
    areaId: string;
    cornerId: CornerRole;
    matchId: string;
  } | null;
}

export interface Match {
  id: string;
  tournamentId: string;
  categoryId: string;
  areaId: string;
  status: MatchStatus;
  round?: number;
  nextMatchId?: string;
  redCompetitorId: string;
  blueCompetitorId: string;
  winnerId: string | null;
  score: {
    red: number;
    blue: number;
  };
  warnings: {
    red: number;
    blue: number;
  };
  deductions: {
    red: number;
    blue: number;
  };
}

export * from './itfCategories.js';

export const APP_MOTTO = "Every Point. Every Match. Every Corner.";
export const AUTHOR_NAME = "Nicolas Snider";
export const AUTHOR_GITHUB = "https://github.com/nicolassnider";
export const AUTHOR_LINKEDIN = "https://www.linkedin.com/in/nicolas-snider-7a362b39/";
