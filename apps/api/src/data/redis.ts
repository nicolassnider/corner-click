import { createLogger } from '@corner-click/logger'
import { Redis } from 'ioredis'
import settings from '../config/settings.js'

const log = createLogger('redis')

const redisUrl = settings.redis.url || 'redis://localhost:6379'

const isUpstash = redisUrl.includes('upstash.io')
const useTls = isUpstash || redisUrl.startsWith('rediss://')

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(useTls ? { tls: {} } : {}),
})

redis.on('connect', () => {
  log.info('Redis connected successfully')
})

redis.on('error', (err) => {
  log.error({ err }, 'Redis connection error')
})

export const closeRedis = async () => {
  log.info('Closing Redis connection')
  await redis.quit()
}

export const checkRedisConnection = async () => {
  try {
    await redis.ping()
    return true
  } catch (error) {
    log.error({ error }, 'Failed to ping Redis during startup')
    return false
  }
}
