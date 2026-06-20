import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createLogger } from '@corner-click/logger';
import { Match, MatchStatus } from '@corner-click/types';

const log = createLogger('socket-service');

interface ActiveMatchState {
  match: Match;
  timer: number; // in seconds
  timerActive: boolean;
  judges: {
    [judgeId: string]: {
      name: string;
      corner: string;
      connected: boolean;
      socketId: string;
    };
  };
  // Store raw clicks/scores of judges for consensus
  judgeClicks: {
    [judgeId: string]: {
      redRaw: number;
      blueRaw: number;
      warnings: number;
      deductions: number;
    };
  };
}

class MemoryStore {
  // In-memory fallback repository for active matches per area
  private activeMatches: Map<string, ActiveMatchState> = new Map();

  getMatchState(areaId: string): ActiveMatchState | undefined {
    return this.activeMatches.get(areaId);
  }

  setMatchState(areaId: string, state: ActiveMatchState): void {
    this.activeMatches.set(areaId, state);
  }

  deleteMatchState(areaId: string): void {
    this.activeMatches.delete(areaId);
  }

  getAllMatchStates(): Map<string, ActiveMatchState> {
    return this.activeMatches;
  }
}

export const localStore = new MemoryStore();

const buildScoresPayload = (state: ActiveMatchState) => {
  const scores: Record<string, any> = {};
  for (const [jId, jInfo] of Object.entries(state.judges)) {
    const clicks = state.judgeClicks[jId] || { redRaw: 0, blueRaw: 0, warnings: 0, deductions: 0 };
    scores[jInfo.corner] = {
      redScore: clicks.redRaw,
      blueScore: clicks.blueRaw,
      redWarnings: state.match.warnings.red,
      blueWarnings: state.match.warnings.blue,
      redDeductions: state.match.deductions.red,
      blueDeductions: state.match.deductions.blue
    };
  }
  return scores;
};

export const initSocketService = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    log.info({ socketId: socket.id }, 'client connected via WebSocket');

    let currentAreaId: string | null = null;
    let currentRole: string | null = null;
    let currentJudgeId: string | null = null;

    // Join a specific area
    socket.on('join_area', (data: { areaId: string; role: 'admin' | 'judge' | 'spectator'; judgeId?: string; judgeName?: string; corner?: string }) => {
      const { areaId, role, judgeId, judgeName, corner } = data;
      currentAreaId = areaId;
      currentRole = role;
      currentJudgeId = judgeId || null;

      const roomName = `area:${areaId}`;
      socket.join(roomName);
      log.info({ socketId: socket.id, areaId, role, judgeId }, 'client joined area room');

      // Initialize area state if it doesn't exist
      let state = localStore.getMatchState(areaId);
      if (!state) {
        state = {
          match: {
            id: `temp-${areaId}`,
            tournamentId: 'local',
            categoryId: 'local',
            areaId,
            status: MatchStatus.PENDING,
            redCompetitorId: 'Red',
            blueCompetitorId: 'Blue',
            winnerId: null,
            score: { red: 0, blue: 0 },
            warnings: { red: 0, blue: 0 },
            deductions: { red: 0, blue: 0 },
          },
          timer: 120,
          timerActive: false,
          judges: {},
          judgeClicks: {},
        };
        localStore.setMatchState(areaId, state);
      }

      // If user is a judge, register them in the area state
      if (role === 'judge' && judgeId) {
        state.judges[judgeId] = {
          name: judgeName || `Juez ${judgeId}`,
          corner: corner || 'corner_1',
          connected: true,
          socketId: socket.id,
        };
        if (!state.judgeClicks[judgeId]) {
          state.judgeClicks[judgeId] = { redRaw: 0, blueRaw: 0, warnings: 0, deductions: 0 };
        }
        localStore.setMatchState(areaId, state);

        // Notify other clients in the room (e.g. admin) that judge joined/connected
        io.to(roomName).emit('judges_update', state.judges);
      }

      // Emit current state to the joining client
      socket.emit('match_state', {
        match: state.match,
        timer: state.timer,
        timerActive: state.timerActive,
        judges: state.judges,
        scores: buildScoresPayload(state),
      });
    });

    // Score update from a judge
    socket.on('judge_score_update', (data: {
      areaId: string;
      matchId: string;
      judgeId: string;
      corner: 'red' | 'blue';
      type: 'point' | 'warning' | 'deduction';
      value: number;
    }) => {
      const { areaId, judgeId, corner, type, value } = data;
      const state = localStore.getMatchState(areaId);
      if (!state) return;

      if (!state.judgeClicks[judgeId]) {
        state.judgeClicks[judgeId] = { redRaw: 0, blueRaw: 0, warnings: 0, deductions: 0 };
      }

      const clicks = state.judgeClicks[judgeId];
      if (type === 'point') {
        if (corner === 'red') clicks.redRaw = Math.max(0, clicks.redRaw + value);
        else clicks.blueRaw = Math.max(0, clicks.blueRaw + value);
      } else if (type === 'warning') {
        if (corner === 'red') state.match.warnings.red = Math.max(0, state.match.warnings.red + value);
        else state.match.warnings.blue = Math.max(0, state.match.warnings.blue + value);
      } else if (type === 'deduction') {
        if (corner === 'red') state.match.deductions.red = Math.max(0, state.match.deductions.red + value);
        else state.match.deductions.blue = Math.max(0, state.match.deductions.blue + value);
      }

      // Compute total score from judges
      const judgeCount = Object.keys(state.judges).length || 1;
      let totalRedRaw = 0;
      let totalBlueRaw = 0;
      for (const jId of Object.keys(state.judgeClicks)) {
        totalRedRaw += state.judgeClicks[jId].redRaw;
        totalBlueRaw += state.judgeClicks[jId].blueRaw;
      }
      state.match.score.red = Math.round(totalRedRaw / judgeCount);
      state.match.score.blue = Math.round(totalBlueRaw / judgeCount);

      localStore.setMatchState(areaId, state);

      // Broadcast new match state to the room
      io.to(`area:${areaId}`).emit('match_state', {
        match: state.match,
        timer: state.timer,
        timerActive: state.timerActive,
        judges: state.judges,
        scores: buildScoresPayload(state),
      });
    });

    // Control update from Admin
    socket.on('match_control', (data: {
      areaId: string;
      matchId: string;
      action: 'start' | 'pause' | 'reset' | 'end' | 'timer_tick' | 'set_match' | 'golden_point';
      matchData?: Partial<Match>;
      timerValue?: number;
    }) => {
      const { areaId, action, matchData, timerValue } = data;
      let state = localStore.getMatchState(areaId);
      if (!state) return;

      if (action === 'set_match' && matchData) {
        state.match = { ...state.match, ...matchData };
        if (timerValue !== undefined) state.timer = timerValue;
        state.timerActive = false;
        // Reset judge clicks
        state.judgeClicks = {};
        for (const jId of Object.keys(state.judges)) {
          state.judgeClicks[jId] = { redRaw: 0, blueRaw: 0, warnings: 0, deductions: 0 };
        }
      } else if (action === 'start') {
        state.timerActive = true;
        state.match.status = MatchStatus.ACTIVE;
      } else if (action === 'pause') {
        state.timerActive = false;
        state.match.status = MatchStatus.PAUSED;
      } else if (action === 'reset') {
        state.timerActive = false;
        state.timer = timerValue !== undefined ? timerValue : 120;
        state.match.score = { red: 0, blue: 0 };
        state.match.warnings = { red: 0, blue: 0 };
        state.match.deductions = { red: 0, blue: 0 };
        state.match.status = MatchStatus.PENDING;
        state.judgeClicks = {};
      } else if (action === 'timer_tick') {
        if (timerValue !== undefined) {
          state.timer = timerValue;
        } else {
          state.timer = Math.max(0, state.timer - 1);
        }
        if (state.timer === 0) {
          state.timerActive = false;
          state.match.status = MatchStatus.ENDED;
        }
      } else if (action === 'end') {
        state.timerActive = false;
        state.match.status = MatchStatus.ENDED;
        if (matchData && matchData.winnerId) {
          state.match.winnerId = matchData.winnerId;
          state.match.status = MatchStatus.COMPLETED;
        }
      } else if (action === 'golden_point') {
        state.match.status = MatchStatus.GOLDEN_POINT;
        state.timerActive = false;
      }

      localStore.setMatchState(areaId, state);

      // Broadcast update
      io.to(`area:${areaId}`).emit('match_state', {
        match: state.match,
        timer: state.timer,
        timerActive: state.timerActive,
        judges: state.judges,
        scores: buildScoresPayload(state),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      log.info({ socketId: socket.id }, 'client disconnected from WebSocket');

      if (currentAreaId && currentRole === 'judge' && currentJudgeId) {
        const state = localStore.getMatchState(currentAreaId);
        if (state && state.judges[currentJudgeId]) {
          state.judges[currentJudgeId].connected = false;
          localStore.setMatchState(currentAreaId, state);

          io.to(`area:${currentAreaId}`).emit('judges_update', state.judges);
        }
      }
    });
  });

  return io;
};
