import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create a module-level mock state to capture the callbacks
const registeredSocketEvents: Record<string, Function> = {};
let connectionCallback: Function = () => {};

const mockEmitToRoom = vi.fn();
const mockToRoom = vi.fn().mockReturnValue({ emit: mockEmitToRoom });

vi.mock('socket.io', () => {
  return {
    Server: class {
      on(event: string, callback: Function) {
        if (event === 'connection') {
          connectionCallback = callback;
        }
      }
      to = mockToRoom;
    }
  };
});

import { localStore, initSocketService } from '../services/socketService.js';
import { MatchStatus, CornerRole } from '@corner-click/types';

describe('SocketService & MemoryStore Tests', () => {
  let socketInstance: any;

  beforeEach(() => {
    // Clear stores
    for (const key of Array.from(localStore.getAllMatchStates().keys())) {
      localStore.deleteMatchState(key);
    }
    vi.clearAllMocks();

    // Re-initialize service to bind classes
    initSocketService({} as any);

    // Mock socket instance
    socketInstance = {
      id: 'socket-judge-1',
      join: vi.fn(),
      emit: vi.fn(),
      on: vi.fn().mockImplementation((event: string, callback: Function) => {
        registeredSocketEvents[event] = callback;
      }),
    };

    // Trigger connection
    connectionCallback(socketInstance);
  });

  describe('MemoryStore Service', () => {
    it('should initialize and hold active match state in-memory', () => {
      const areaId = 'area-5';
      expect(localStore.getMatchState(areaId)).toBeUndefined();

      const initialState = {
        match: {
          id: 'test-match-1',
          tournamentId: 't-123',
          categoryId: 'cat-456',
          areaId,
          status: MatchStatus.ACTIVE,
          redCompetitorId: 'Red',
          blueCompetitorId: 'Blue',
          winnerId: null,
          score: { red: 0, blue: 0 },
          warnings: { red: 0, blue: 0 },
          deductions: { red: 0, blue: 0 },
        },
        timer: 120,
        timerActive: true,
        judges: {},
        judgeClicks: {},
      };

      localStore.setMatchState(areaId, initialState);
      const retrieved = localStore.getMatchState(areaId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.match.id).toBe('test-match-1');
    });
  });

  describe('Socket Connection & Rooms', () => {
    it('should join area, initialize default state and emit match_state on join_area', () => {
      const joinAreaHandler = registeredSocketEvents['join_area'];
      expect(joinAreaHandler).toBeDefined();

      joinAreaHandler({
        areaId: 'area-1',
        role: 'spectator'
      });

      expect(socketInstance.join).toHaveBeenCalledWith('area:area-1');
      expect(socketInstance.emit).toHaveBeenCalledWith('match_state', expect.any(Object));

      const state = localStore.getMatchState('area-1');
      expect(state).toBeDefined();
      expect(state?.match.id).toBe('temp-area-1');
    });

    it('should register judge details and notify room on judge join_area', () => {
      const joinAreaHandler = registeredSocketEvents['join_area'];
      joinAreaHandler({
        areaId: 'area-1',
        role: 'judge',
        judgeId: 'j-1',
        judgeName: 'Nicolas Snider',
        corner: 'corner_1'
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.judges['j-1']).toEqual({
        name: 'Nicolas Snider',
        corner: 'corner_1',
        connected: true,
        socketId: 'socket-judge-1'
      });

      expect(mockToRoom).toHaveBeenCalledWith('area:area-1');
      expect(mockEmitToRoom).toHaveBeenCalledWith('judges_update', state.judges);
    });
  });

  describe('Judge scoring actions', () => {
    beforeEach(() => {
      const joinAreaHandler = registeredSocketEvents['join_area'];
      joinAreaHandler({
        areaId: 'area-1',
        role: 'judge',
        judgeId: 'j-1',
        judgeName: 'Nicolas Snider',
        corner: 'corner_1'
      });
      // Mock active match status to ACTIVE
      const state = localStore.getMatchState('area-1')!;
      state.match.status = MatchStatus.ACTIVE;
      localStore.setMatchState('area-1', state);
    });

    it('should calculate consolidated scores correctly when judge clicks point', () => {
      const scoreUpdateHandler = registeredSocketEvents['judge_score_update'];
      
      scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'red',
        type: 'point',
        value: 1
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.judgeClicks['j-1'].redRaw).toBe(1);
      expect(state.match.score.red).toBe(1); // 1 point / 1 judge = 1
      expect(mockEmitToRoom).toHaveBeenCalledWith('match_state', expect.any(Object));
    });

    it('should accumulate warnings linearly on match.warnings', () => {
      const scoreUpdateHandler = registeredSocketEvents['judge_score_update'];
      
      scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'blue',
        type: 'warning',
        value: 1
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.match.warnings.blue).toBe(1);
    });

    it('should accumulate deductions on match.deductions', () => {
      const scoreUpdateHandler = registeredSocketEvents['judge_score_update'];
      
      scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'red',
        type: 'deduction',
        value: 1
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.match.deductions.red).toBe(1);
    });

    it('should support blue corner scoring points', () => {
      const scoreUpdateHandler = registeredSocketEvents['judge_score_update'];
      
      scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'blue',
        type: 'point',
        value: 2
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.judgeClicks['j-1'].blueRaw).toBe(2);
      expect(state.match.score.blue).toBe(2);
    });

    it('should support blue corner deductions', () => {
      const scoreUpdateHandler = registeredSocketEvents['judge_score_update'];
      
      scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'blue',
        type: 'deduction',
        value: 1
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.match.deductions.blue).toBe(1);
    });

    it('should dynamically initialize judgeClicks if it does not exist when scoring', () => {
      const scoreUpdateHandler = registeredSocketEvents['judge_score_update'];
      
      // Delete judgeClicks for j-1 to simulate uninitialized state
      const state = localStore.getMatchState('area-1')!;
      delete state.judgeClicks['j-1'];
      localStore.setMatchState('area-1', state);

      scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'red',
        type: 'point',
        value: 3
      });

      const stateAfter = localStore.getMatchState('area-1')!;
      expect(stateAfter.judgeClicks['j-1']).toBeDefined();
      expect(stateAfter.judgeClicks['j-1'].redRaw).toBe(3);
    });
  });

  describe('Match Controls', () => {
    beforeEach(() => {
      // Join room to initialize state
      registeredSocketEvents['join_area']({
        areaId: 'area-1',
        role: 'admin'
      });
    });

    it('should start match control action', () => {
      const controlHandler = registeredSocketEvents['match_control'];
      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'start'
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.match.status).toBe(MatchStatus.ACTIVE);
      expect(state.timerActive).toBe(true);
    });

    it('should pause match control action', () => {
      const controlHandler = registeredSocketEvents['match_control'];
      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'pause'
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.match.status).toBe(MatchStatus.PAUSED);
      expect(state.timerActive).toBe(false);
    });

    it('should reset match control action', () => {
      const controlHandler = registeredSocketEvents['match_control'];
      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'reset',
        timerValue: 90
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.match.status).toBe(MatchStatus.PENDING);
      expect(state.timer).toBe(90);
    });

    it('should execute timer tick control action', () => {
      const controlHandler = registeredSocketEvents['match_control'];
      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'timer_tick',
        timerValue: 45
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.timer).toBe(45);
    });

    it('should decrement timer by 1 if timerValue is undefined in timer_tick', () => {
      const controlHandler = registeredSocketEvents['match_control'];
      
      // Set initial timer to 10
      const stateBefore = localStore.getMatchState('area-1')!;
      stateBefore.timer = 10;
      stateBefore.timerActive = true;
      localStore.setMatchState('area-1', stateBefore);

      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'timer_tick'
      });

      const stateAfter = localStore.getMatchState('area-1')!;
      expect(stateAfter.timer).toBe(9);
    });

    it('should end the match and set timerActive to false when timer ticks to 0', () => {
      const controlHandler = registeredSocketEvents['match_control'];
      
      // Set initial timer to 1
      const stateBefore = localStore.getMatchState('area-1')!;
      stateBefore.timer = 1;
      stateBefore.match.status = MatchStatus.ACTIVE;
      stateBefore.timerActive = true;
      localStore.setMatchState('area-1', stateBefore);

      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'timer_tick'
      });

      const stateAfter = localStore.getMatchState('area-1')!;
      expect(stateAfter.timer).toBe(0);
      expect(stateAfter.timerActive).toBe(false);
      expect(stateAfter.match.status).toBe(MatchStatus.ENDED);
    });

    it('should reset judge clicks when set_match is called and judges are registered', () => {
      // Connect judge first
      registeredSocketEvents['join_area']({
        areaId: 'area-1',
        role: 'judge',
        judgeId: 'j-1',
        judgeName: 'Nicolas Snider',
        corner: 'corner_1'
      });

      // Set some clicks
      const stateBefore = localStore.getMatchState('area-1')!;
      stateBefore.judgeClicks['j-1'] = { redRaw: 5, blueRaw: 3, warnings: 1, deductions: 0 };
      localStore.setMatchState('area-1', stateBefore);

      const controlHandler = registeredSocketEvents['match_control'];
      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'set_match',
        matchData: { id: 'new-match-id' },
        timerValue: 120
      });

      const stateAfter = localStore.getMatchState('area-1')!;
      expect(stateAfter.judgeClicks['j-1']).toEqual({
        redRaw: 0,
        blueRaw: 0,
        warnings: 0,
        deductions: 0
      });
    });

    it('should finish match control action with winnerId', () => {
      const controlHandler = registeredSocketEvents['match_control'];
      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'end',
        matchData: { winnerId: 'winner-competitor-id' }
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.match.status).toBe(MatchStatus.COMPLETED);
      expect(state.match.winnerId).toBe('winner-competitor-id');
    });

    it('should trigger golden point mode', () => {
      const controlHandler = registeredSocketEvents['match_control'];
      controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: 'golden_point'
      });

      const state = localStore.getMatchState('area-1')!;
      expect(state.match.status).toBe(MatchStatus.GOLDEN_POINT);
    });
  });

  describe('Disconnect handling', () => {
    it('should set judge connection state to offline on disconnect', () => {
      // Connect judge first
      registeredSocketEvents['join_area']({
        areaId: 'area-1',
        role: 'judge',
        judgeId: 'j-1',
        judgeName: 'Nicolas Snider',
        corner: 'corner_1'
      });

      const disconnectHandler = registeredSocketEvents['disconnect'];
      expect(disconnectHandler).toBeDefined();

      disconnectHandler();

      const state = localStore.getMatchState('area-1')!;
      expect(state.judges['j-1'].connected).toBe(false);
      expect(mockEmitToRoom).toHaveBeenCalledWith('judges_update', state.judges);
    });
  });
});
