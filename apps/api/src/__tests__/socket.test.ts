import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create a module-level mock state to capture the callbacks
const registeredSocketEvents: Record<string, (...args: unknown[]) => unknown> = {}
let connectionCallback: (...args: unknown[]) => unknown = () => {}

const mockEmitToRoom = vi.fn()
const mockToRoom = vi.fn().mockReturnValue({ emit: mockEmitToRoom })

vi.mock('socket.io', () => {
  return {
    Server: class {
      on(event: string, callback: (...args: unknown[]) => unknown) {
        if (event === 'connection') {
          connectionCallback = callback
        }
      }
      to = mockToRoom
    },
  }
})

// Mock Redis
const mockRedisStore = new Map<string, string>()
vi.mock('../data/redis.js', () => {
  return {
    redis: {
      get: vi.fn(async (key: string) => mockRedisStore.get(key) || null),
      set: vi.fn(async (key: string, value: string) => {
        mockRedisStore.set(key, value)
      }),
      del: vi.fn(async (key: string) => {
        mockRedisStore.delete(key)
      }),
      on: vi.fn(),
    },
  }
})

import {
  MatchControlAction,
  MatchStatus,
  ScoreUpdateType,
  SocketEvent,
  SocketRole,
} from '@corner-click/types'
import { initSocketService, store } from '../services/socketService.js'

describe('SocketService & RedisStore Tests', () => {
  let socketInstance: {
    id: string
    join: ReturnType<typeof vi.fn>
    emit: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRedisStore.clear()
    vi.clearAllMocks()

    // Re-initialize service to bind classes
    // biome-ignore lint/suspicious/noExplicitAny: Mock socket server for testing
    initSocketService({} as any)

    // Mock socket instance
    socketInstance = {
      id: 'socket-judge-1',
      join: vi.fn(),
      emit: vi.fn(),
      on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => unknown) => {
        registeredSocketEvents[event] = callback
      }),
    }

    // Trigger connection
    connectionCallback(socketInstance)
  })

  describe('RedisStore Service', () => {
    it('should initialize and hold active match state in-memory (mocked redis)', async () => {
      const areaId = 'area-5'
      expect(await store.getMatchState(areaId)).toBeUndefined()

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
      }

      await store.setMatchState(areaId, initialState)
      const retrieved = await store.getMatchState(areaId)
      expect(retrieved).toBeDefined()
      expect(retrieved?.match.id).toBe('test-match-1')
    })
  })

  describe('Socket Connection & Rooms', () => {
    it('should join area, initialize default state and emit match_state on join_area', async () => {
      const joinAreaHandler = registeredSocketEvents[SocketEvent.JOIN_AREA]
      expect(joinAreaHandler).toBeDefined()

      await joinAreaHandler({
        areaId: 'area-1',
        role: SocketRole.SPECTATOR,
      })

      expect(socketInstance.join).toHaveBeenCalledWith('area:area-1')
      expect(socketInstance.emit).toHaveBeenCalledWith(SocketEvent.MATCH_STATE, expect.any(Object))

      const state = await store.getMatchState('area-1')
      expect(state).toBeDefined()
      expect(state?.match.id).toBe('temp-area-1')
    })

    it('should register judge details and notify room on judge join_area', async () => {
      const joinAreaHandler = registeredSocketEvents[SocketEvent.JOIN_AREA]
      await joinAreaHandler({
        areaId: 'area-1',
        role: SocketRole.JUDGE,
        judgeId: 'j-1',
        judgeName: 'Nicolas Snider',
        corner: 'corner_1',
      })

      const state = await store.getMatchState('area-1')
      if (!state) {
        throw new Error('State should exist')
      }
      expect(state.judges['j-1']).toEqual({
        name: 'Nicolas Snider',
        corner: 'corner_1',
        connected: true,
        socketId: 'socket-judge-1',
      })

      expect(mockToRoom).toHaveBeenCalledWith('area:area-1')
      expect(mockEmitToRoom).toHaveBeenCalledWith(SocketEvent.JUDGES_UPDATE, state.judges)
    })
  })

  describe('Judge scoring actions', () => {
    beforeEach(async () => {
      const joinAreaHandler = registeredSocketEvents[SocketEvent.JOIN_AREA]
      await joinAreaHandler({
        areaId: 'area-1',
        role: SocketRole.JUDGE,
        judgeId: 'j-1',
        judgeName: 'Nicolas Snider',
        corner: 'corner_1',
      })
      // Mock active match status to ACTIVE
      const state = await store.getMatchState('area-1')
      if (!state) {
        throw new Error('State should exist')
      }
      state.match.status = MatchStatus.ACTIVE
      await store.setMatchState('area-1', state)
    })

    it('should calculate consolidated scores correctly when judge clicks point', async () => {
      const scoreUpdateHandler = registeredSocketEvents[SocketEvent.JUDGE_SCORE_UPDATE]

      await scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'red',
        type: ScoreUpdateType.POINT,
        value: 1,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.judgeClicks['j-1'].redRaw).toBe(1)
      expect(state.match.score.red).toBe(1) // 1 point / 1 judge = 1
      expect(mockEmitToRoom).toHaveBeenCalledWith(SocketEvent.MATCH_STATE, expect.any(Object))
    })

    it('should accumulate warnings linearly on match.warnings', async () => {
      const scoreUpdateHandler = registeredSocketEvents[SocketEvent.JUDGE_SCORE_UPDATE]

      await scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'blue',
        type: ScoreUpdateType.WARNING,
        value: 1,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.match.warnings.blue).toBe(1)
    })

    it('should accumulate deductions on match.deductions', async () => {
      const scoreUpdateHandler = registeredSocketEvents[SocketEvent.JUDGE_SCORE_UPDATE]

      await scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'red',
        type: ScoreUpdateType.DEDUCTION,
        value: 1,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.match.deductions.red).toBe(1)
    })

    it('should support blue corner scoring points', async () => {
      const scoreUpdateHandler = registeredSocketEvents[SocketEvent.JUDGE_SCORE_UPDATE]

      await scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'blue',
        type: ScoreUpdateType.POINT,
        value: 2,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.judgeClicks['j-1'].blueRaw).toBe(2)
      expect(state.match.score.blue).toBe(2)
    })

    it('should support blue corner deductions', async () => {
      const scoreUpdateHandler = registeredSocketEvents[SocketEvent.JUDGE_SCORE_UPDATE]

      await scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'blue',
        type: ScoreUpdateType.DEDUCTION,
        value: 1,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.match.deductions.blue).toBe(1)
    })

    it('should dynamically initialize judgeClicks if it does not exist when scoring', async () => {
      const scoreUpdateHandler = registeredSocketEvents[SocketEvent.JUDGE_SCORE_UPDATE]

      // Delete judgeClicks for j-1 to simulate uninitialized state
      const state = (await store.getMatchState('area-1'))!
      delete state.judgeClicks['j-1']
      await store.setMatchState('area-1', state)

      await scoreUpdateHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        judgeId: 'j-1',
        corner: 'red',
        type: ScoreUpdateType.POINT,
        value: 3,
      })

      const stateAfter = (await store.getMatchState('area-1'))!
      expect(stateAfter.judgeClicks['j-1']).toBeDefined()
      expect(stateAfter.judgeClicks['j-1'].redRaw).toBe(3)
    })
  })

  describe('Match Controls', () => {
    beforeEach(async () => {
      // Join room to initialize state
      await registeredSocketEvents[SocketEvent.JOIN_AREA]({
        areaId: 'area-1',
        role: SocketRole.ADMIN,
      })
    })

    it('should start match control action', async () => {
      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]
      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.START,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.match.status).toBe(MatchStatus.ACTIVE)
      expect(state.timerActive).toBe(true)
    })

    it('should pause match control action', async () => {
      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]
      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.PAUSE,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.match.status).toBe(MatchStatus.PAUSED)
      expect(state.timerActive).toBe(false)
    })

    it('should reset match control action', async () => {
      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]
      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.RESET,
        timerValue: 90,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.match.status).toBe(MatchStatus.PENDING)
      expect(state.timer).toBe(90)
    })

    it('should execute timer tick control action', async () => {
      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]
      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.TIMER_TICK,
        timerValue: 45,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.timer).toBe(45)
    })

    it('should decrement timer by 1 if timerValue is undefined in timer_tick', async () => {
      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]

      // Set initial timer to 10
      const stateBefore = (await store.getMatchState('area-1'))!
      stateBefore.timer = 10
      stateBefore.timerActive = true
      await store.setMatchState('area-1', stateBefore)

      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.TIMER_TICK,
      })

      const stateAfter = (await store.getMatchState('area-1'))!
      expect(stateAfter.timer).toBe(9)
    })

    it('should end the match and set timerActive to false when timer ticks to 0', async () => {
      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]

      // Set initial timer to 1
      const stateBefore = (await store.getMatchState('area-1'))!
      stateBefore.timer = 1
      stateBefore.match.status = MatchStatus.ACTIVE
      stateBefore.timerActive = true
      await store.setMatchState('area-1', stateBefore)

      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.TIMER_TICK,
      })

      const stateAfter = (await store.getMatchState('area-1'))!
      expect(stateAfter.timer).toBe(0)
      expect(stateAfter.timerActive).toBe(false)
      expect(stateAfter.match.status).toBe(MatchStatus.ENDED)
    })

    it('should reset judge clicks when set_match is called and judges are registered', async () => {
      // Connect judge first
      await registeredSocketEvents[SocketEvent.JOIN_AREA]({
        areaId: 'area-1',
        role: SocketRole.JUDGE,
        judgeId: 'j-1',
        judgeName: 'Nicolas Snider',
        corner: 'corner_1',
      })

      // Set some clicks
      const stateBefore = (await store.getMatchState('area-1'))!
      stateBefore.judgeClicks['j-1'] = {
        redRaw: 5,
        blueRaw: 3,
        warnings: 1,
        deductions: 0,
      }
      await store.setMatchState('area-1', stateBefore)

      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]
      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.SET_MATCH,
        matchData: { id: 'new-match-id' },
        timerValue: 120,
      })

      const stateAfter = (await store.getMatchState('area-1'))!
      expect(stateAfter.judgeClicks['j-1']).toEqual({
        redRaw: 0,
        blueRaw: 0,
        warnings: 0,
        deductions: 0,
      })
    })

    it('should finish match control action with winnerId', async () => {
      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]
      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.END,
        matchData: { winnerId: 'winner-competitor-id' },
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.match.status).toBe(MatchStatus.COMPLETED)
      expect(state.match.winnerId).toBe('winner-competitor-id')
    })

    it('should trigger golden point mode', async () => {
      const controlHandler = registeredSocketEvents[SocketEvent.MATCH_CONTROL]
      await controlHandler({
        areaId: 'area-1',
        matchId: 'temp-area-1',
        action: MatchControlAction.GOLDEN_POINT,
      })

      const state = (await store.getMatchState('area-1'))!
      expect(state.match.status).toBe(MatchStatus.GOLDEN_POINT)
    })
  })

  describe('Disconnect handling', () => {
    it('should set judge connection state to offline on disconnect', async () => {
      // Connect judge first
      await registeredSocketEvents[SocketEvent.JOIN_AREA]({
        areaId: 'area-1',
        role: SocketRole.JUDGE,
        judgeId: 'j-1',
        judgeName: 'Nicolas Snider',
        corner: 'corner_1',
      })

      const disconnectHandler = registeredSocketEvents[SocketEvent.DISCONNECT]
      expect(disconnectHandler).toBeDefined()

      await disconnectHandler()

      const state = (await store.getMatchState('area-1'))!
      expect(state.judges['j-1'].connected).toBe(false)
      expect(mockEmitToRoom).toHaveBeenCalledWith(SocketEvent.JUDGES_UPDATE, state.judges)
    })
  })
})
