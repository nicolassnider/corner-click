import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Shared Pino logger for all Corner Click services.
 *
 * - Development: pretty-printed, colored, human-readable output
 * - Production:  JSON lines — structured, parseable by Vercel / Cloud Logging
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: { service: process.env.SERVICE_NAME || 'corner-click' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label }
      },
    },
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname,service',
        },
      })
    : undefined
)

/** Child logger factory — adds a `module` field to every log line. */
export const createLogger = (module: string) => logger.child({ module })

/**
 * Converts an unknown catch value to a plain object for Pino.
 * TypeScript strict mode types catch blocks as `unknown`, but Pino
 * requires an object as its first argument.
 */
export const toErr = (error: unknown): object =>
  error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name }
    : { raw: String(error) }

export type Logger = typeof logger
