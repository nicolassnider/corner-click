import { createLogger } from '@corner-click/logger'
import { Redis } from 'ioredis'
import settings from '../config/settings.js'

const log = createLogger('redis')

let finalUrl = settings.redis.url || 'redis://localhost:6379'

// Ensure Upstash connections always use secure TLS
if (finalUrl.includes('upstash.io') && finalUrl.startsWith('redis://')) {
  finalUrl = finalUrl.replace('redis://', 'rediss://')
}

export const redis = new Redis(finalUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  family: 4, // Force IPv4 to prevent resolution issues on Render/Upstash
  keepAlive: 10000, // Keep connection active
})

redis.on('connect', () => {
  log.info('Redis TCP connection established')
})

redis.on('ready', () => {
  log.info('Redis is ready and authenticated')
})

redis.on('close', () => {
  log.warn('Redis connection closed')
})

redis.on('error', (err) => {
  log.error({ err }, 'Redis connection error')
})

redis.on('end', () => {
  log.warn('Redis connection ended')
})

redis.on('reconnecting', (time: number) => {
  log.info({ time }, 'Redis reconnecting...')
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
