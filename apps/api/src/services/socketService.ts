import type { Server as HttpServer } from 'node:http'
import { createLogger } from '@corner-click/logger'
import {
  type Match,
  MatchControlAction,
  MatchStatus,
  ScoreUpdateType,
  SocketEvent,
  SocketRole,
} from '@corner-click/types'
import { Server, type Socket } from 'socket.io'
import { redis } from '../data/redis.js'

const log = createLogger('socket-service')

interface ActiveMatchState {
  match: Match
  timer: number // in seconds
  timerActive: boolean
  judges: {
    [judgeId: string]: {
      name: string
      corner: string
      connected: boolean
      socketId: string
    }
  }
  // Store raw clicks/scores of judges for consensus
  judgeClicks: {
    [judgeId: string]: {
      redRaw: number
      blueRaw: number
      warnings: number
      deductions: number
    }
  }
}

class RedisStore {
  private getRedisKey(areaId: string): string {
    return `match_state:${areaId}`
  }

  async getMatchState(areaId: string): Promise<ActiveMatchState | undefined> {
    const data = await redis.get(this.getRedisKey(areaId))
    if (!data) return undefined
    try {
      return JSON.parse(data) as ActiveMatchState
    } catch (error) {
      log.error({ error, areaId }, 'Failed to parse match state from Redis')
      return undefined
    }
  }

  async setMatchState(areaId: string, state: ActiveMatchState): Promise<void> {
    await redis.set(this.getRedisKey(areaId), JSON.stringify(state))
  }

  async deleteMatchState(areaId: string): Promise<void> {
    await redis.del(this.getRedisKey(areaId))
  }
}

export const store = new RedisStore()

const buildScoresPayload = (state: ActiveMatchState) => {
  const scores: Record<string, any> = {}
  for (const [jId, jInfo] of Object.entries(state.judges)) {
    const clicks = state.judgeClicks[jId] || {
      redRaw: 0,
      blueRaw: 0,
      warnings: 0,
      deductions: 0,
    }
    scores[jInfo.corner] = {
      redScore: clicks.redRaw,
      blueScore: clicks.blueRaw,
      redWarnings: state.match.warnings.red,
      blueWarnings: state.match.warnings.blue,
      redDeductions: state.match.deductions.red,
      blueDeductions: state.match.deductions.blue,
    }
  }
  return scores
}

export const initSocketService = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket: Socket) => {
    log.info({ socketId: socket.id }, 'client connected via WebSocket')

    let currentAreaId: string | null = null
    let currentRole: string | null = null
    let currentJudgeId: string | null = null

    // Join a specific area
    socket.on(
      SocketEvent.JOIN_AREA,
      async (data: {
        areaId: string
        role: SocketRole
        judgeId?: string
        judgeName?: string
        corner?: string
      }) => {
        const { areaId, role, judgeId, judgeName, corner } = data
        currentAreaId = areaId
        currentRole = role
        currentJudgeId = judgeId || null

        const roomName = `area:${areaId}`
        socket.join(roomName)
        log.info({ socketId: socket.id, areaId, role, judgeId }, 'client joined area room')

        // Initialize area state if it doesn't exist
        let state = await store.getMatchState(areaId)
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
          }
          await store.setMatchState(areaId, state)
        }

        // If user is a judge, register them in the area state
        if (role === SocketRole.JUDGE && judgeId) {
          state.judges[judgeId] = {
            name: judgeName || `Juez ${judgeId}`,
            corner: corner || 'corner_1',
            connected: true,
            socketId: socket.id,
          }
          if (!state.judgeClicks[judgeId]) {
            state.judgeClicks[judgeId] = {
              redRaw: 0,
              blueRaw: 0,
              warnings: 0,
              deductions: 0,
            }
          }
          await store.setMatchState(areaId, state)

          // Notify other clients in the room (e.g. admin) that judge joined/connected
          io.to(roomName).emit(SocketEvent.JUDGES_UPDATE, state.judges)
        }

        // Emit current state to the joining client
        socket.emit(SocketEvent.MATCH_STATE, {
          match: state.match,
          timer: state.timer,
          timerActive: state.timerActive,
          judges: state.judges,
          scores: buildScoresPayload(state),
        })
      }
    )

    // Score update from a judge
    socket.on(
      SocketEvent.JUDGE_SCORE_UPDATE,
      async (data: {
        areaId: string
        matchId: string
        judgeId: string
        corner: 'red' | 'blue'
        type: ScoreUpdateType
        value: number
      }) => {
        const { areaId, judgeId, corner, type, value } = data
        const state = await store.getMatchState(areaId)
        if (!state) {
          return
        }

        if (!state.judgeClicks[judgeId]) {
          state.judgeClicks[judgeId] = {
            redRaw: 0,
            blueRaw: 0,
            warnings: 0,
            deductions: 0,
          }
        }

        const clicks = state.judgeClicks[judgeId]
        if (type === ScoreUpdateType.POINT) {
          if (corner === 'red') {
            clicks.redRaw = Math.max(0, clicks.redRaw + value)
          } else {
            clicks.blueRaw = Math.max(0, clicks.blueRaw + value)
          }
        } else if (type === ScoreUpdateType.WARNING) {
          if (corner === 'red') {
            state.match.warnings.red = Math.max(0, state.match.warnings.red + value)
          } else {
            state.match.warnings.blue = Math.max(0, state.match.warnings.blue + value)
          }
        } else if (type === ScoreUpdateType.DEDUCTION) {
          if (corner === 'red') {
            state.match.deductions.red = Math.max(0, state.match.deductions.red + value)
          } else {
            state.match.deductions.blue = Math.max(0, state.match.deductions.blue + value)
          }
        }

        // Compute total score from judges
        const judgeCount = Object.keys(state.judges).length || 1
        let totalRedRaw = 0
        let totalBlueRaw = 0
        for (const jId of Object.keys(state.judgeClicks)) {
          totalRedRaw += state.judgeClicks[jId].redRaw
          totalBlueRaw += state.judgeClicks[jId].blueRaw
        }
        state.match.score.red = Math.round(totalRedRaw / judgeCount)
        state.match.score.blue = Math.round(totalBlueRaw / judgeCount)

        await store.setMatchState(areaId, state)

        // Broadcast new match state to the room
        io.to(`area:${areaId}`).emit(SocketEvent.MATCH_STATE, {
          match: state.match,
          timer: state.timer,
          timerActive: state.timerActive,
          judges: state.judges,
          scores: buildScoresPayload(state),
        })
      }
    )

    // Control update from Admin
    socket.on(
      SocketEvent.MATCH_CONTROL,
      async (data: {
        areaId: string
        matchId: string
        action: MatchControlAction
        matchData?: Partial<Match>
        timerValue?: number
      }) => {
        const { areaId, action, matchData, timerValue } = data
        const state = await store.getMatchState(areaId)
        if (!state) {
          return
        }

        if (action === MatchControlAction.SET_MATCH && matchData) {
          state.match = { ...state.match, ...matchData }
          if (timerValue !== undefined) {
            state.timer = timerValue
          }
          state.timerActive = false
          // Reset judge clicks
          state.judgeClicks = {}
          for (const jId of Object.keys(state.judges)) {
            state.judgeClicks[jId] = {
              redRaw: 0,
              blueRaw: 0,
              warnings: 0,
              deductions: 0,
            }
          }
        } else if (action === MatchControlAction.START) {
          state.timerActive = true
          state.match.status = MatchStatus.ACTIVE
        } else if (action === MatchControlAction.PAUSE) {
          state.timerActive = false
          state.match.status = MatchStatus.PAUSED
        } else if (action === MatchControlAction.RESET) {
          state.timerActive = false
          state.timer = timerValue !== undefined ? timerValue : 120
          state.match.score = { red: 0, blue: 0 }
          state.match.warnings = { red: 0, blue: 0 }
          state.match.deductions = { red: 0, blue: 0 }
          state.match.status = MatchStatus.PENDING
          state.judgeClicks = {}
        } else if (action === MatchControlAction.TIMER_TICK) {
          if (timerValue !== undefined) {
            state.timer = timerValue
          } else {
            state.timer = Math.max(0, state.timer - 1)
          }
          if (state.timer === 0) {
            state.timerActive = false
            state.match.status = MatchStatus.ENDED
          }
        } else if (action === MatchControlAction.END) {
          state.timerActive = false
          state.match.status = MatchStatus.ENDED
          if (matchData?.winnerId) {
            state.match.winnerId = matchData.winnerId
            state.match.status = MatchStatus.COMPLETED
          }
        } else if (action === MatchControlAction.GOLDEN_POINT) {
          state.match.status = MatchStatus.GOLDEN_POINT
          state.timerActive = false
        }

        await store.setMatchState(areaId, state)

        // Broadcast update
        io.to(`area:${areaId}`).emit(SocketEvent.MATCH_STATE, {
          match: state.match,
          timer: state.timer,
          timerActive: state.timerActive,
          judges: state.judges,
          scores: buildScoresPayload(state),
        })
      }
    )

    // Handle disconnect
    socket.on(SocketEvent.DISCONNECT, async () => {
      log.info({ socketId: socket.id }, 'client disconnected from WebSocket')

      if (currentAreaId && currentRole === SocketRole.JUDGE && currentJudgeId) {
        const state = await store.getMatchState(currentAreaId)
        if (state?.judges[currentJudgeId]) {
          state.judges[currentJudgeId].connected = false
          await store.setMatchState(currentAreaId, state)

          io.to(`area:${currentAreaId}`).emit(SocketEvent.JUDGES_UPDATE, state.judges)
        }
      }
    })
  })

  return io
}
