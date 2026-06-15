export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  areas: number;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  organizerId?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  tournamentId: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
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
  isSeeded?: boolean;
}

export interface Judge {
  id: string;
  tournamentId: string;
  name: string;
  pin: string;
  status: 'ONLINE' | 'OFFLINE';
  currentAssignment: {
    areaId: string;
    cornerId: string;
    matchId: string;
  } | null;
}

export interface Match {
  id: string;
  tournamentId: string;
  categoryId: string;
  areaId: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
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

export * from './itfCategories';
