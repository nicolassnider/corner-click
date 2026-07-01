import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLogger } from '@corner-click/logger'
import * as trpcExpress from '@trpc/server/adapters/express'
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import settings from './config/settings.js'
import { initSocketService } from './services/socketService.js'
import { appRouter } from './trpc/routers/_app.js'
import { createContext } from './trpc/trpc.js'

const log = createLogger('server')

const app = express()
app.use(cors())

const httpServer = createServer(app)
initSocketService(httpServer)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Extract app settings to variables to avoid magic strings
const { name: appName, apiPrefix, environment, isVercel } = settings.app
app.use(express.json())

// HTTP request logging
app.use((req: Request, _res, next) => {
  log.info({ method: req.method, url: req.url }, 'incoming request')
  next()
})

// Routes
app.use(
  `${apiPrefix}/trpc`,
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
)
// Root endpoint for quick deployment verification
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: `🚀 ${appName} is up and running!`,
    environment: isVercel
      ? 'Production (Vercel)'
      : settings.app.isRender
        ? 'Production (Render)'
        : 'Local Development',
    timestamp: new Date().toISOString(),
  })
})

// Health check endpoint
app.get(`${apiPrefix}/health`, (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: `✅ ${appName} is healthy and ready to process requests`,
    firebaseConfigured: !!settings.firebase.projectId,
    environment: isVercel ? 'Vercel' : settings.app.isRender ? 'Render' : 'Local',
    uptime: process.uptime(),
  })
})

// Expose built web-admin and web-judges frontends for local network fallback
const adminDistPath = path.resolve(__dirname, '../../web-admin/dist')
const judgesDistPath = path.resolve(__dirname, '../../web-judges/dist')

app.use('/admin', express.static(adminDistPath))
app.use('/judges', express.static(judgesDistPath))

// Fallback for SPA routing
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(adminDistPath, 'index.html'))
})
app.get('/judges/*', (_req, res) => {
  res.sendFile(path.join(judgesDistPath, 'index.html'))
})

if (!isVercel) {
  httpServer.listen(settings.port, () => {
    log.info({ port: settings.port, env: environment }, `${appName} running`)
  })
}

export default app
