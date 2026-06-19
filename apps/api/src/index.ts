import express, { Request, Response } from 'express';
import cors from 'cors';
import settings from './config/settings.js';
import { createLogger } from '@corner-click/logger';

const log = createLogger('server');

import authRoutes from './routes/auth.js';
import tournamentsRoutes from './routes/tournaments.js';
import judgesRoutes from './routes/judges.js';
import matchesRoutes from './routes/matches.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const app = express();
app.use(cors());

// Extract app settings to variables to avoid magic strings
const { name: appName, version, description, apiPrefix, environment, isVercel } = settings.app;

// Configure Swagger JSDoc
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: appName,
      version: version,
      description: description,
    },
    servers: [
      {
        url: apiPrefix,
        description: `${environment} Server`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token — obtain one from /api/auth/pin (judge) or /api/auth/admin/login (admin)',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Use CDN assets — locally-served static files do not work in serverless environments (Vercel)
const swaggerUiOptions = {
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.min.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-standalone-preset.min.js',
  ],
};

app.use(`${apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.use(express.json());

// HTTP request logging
app.use((req: Request, _res, next) => {
  log.info({ method: req.method, url: req.url }, 'incoming request');
  next();
});

import { authenticateToken } from './middlewares/auth.js';

// Routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/tournaments`, authenticateToken, tournamentsRoutes);
app.use(`${apiPrefix}/tournaments`, authenticateToken, judgesRoutes);
app.use(`${apiPrefix}/matches`, authenticateToken, matchesRoutes);

// Root endpoint for quick deployment verification
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: `🚀 ${appName} is up and running!`,
    environment: isVercel 
      ? 'Production (Vercel)' 
      : (settings.app.isRender ? 'Production (Render)' : 'Local Development'),
    timestamp: new Date().toISOString(),
    docs: `${apiPrefix}/docs`
  });
});

// Health check endpoint
app.get(`${apiPrefix}/health`, (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: `✅ ${appName} is healthy and ready to process requests`,
    firebaseConfigured: !!settings.firebase.projectId,
    environment: isVercel ? 'Vercel' : (settings.app.isRender ? 'Render' : 'Local'),
    uptime: process.uptime()
  });
});

if (!isVercel) {
  app.listen(settings.port, () => {
    log.info({ port: settings.port, env: environment }, `${appName} running`);
  });
}

export default app;
