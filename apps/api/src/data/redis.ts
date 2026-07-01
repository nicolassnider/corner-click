import { createLogger } from '@corner-click/logger'
import { Redis } from 'ioredis'
import settings from '../config/settings.js'

const log = createLogger('redis')

const redisUrl = settings.redis.url || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('connect', () => {
  log.info('Redis connected successfully')
})

redis.on('error', (err) => {
  log.error({ err }, 'Redis connection error')
})
