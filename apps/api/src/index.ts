import express, { Request, Response } from 'express';
import cors from 'cors';
import settings from './config/settings';

const authRoutes = require('./routes/auth').default || require('./routes/auth');
const tournamentsRoutes = require('./routes/tournaments').default || require('./routes/tournaments');
const judgesRoutes = require('./routes/judges').default || require('./routes/judges');
const matchesRoutes = require('./routes/matches').default || require('./routes/matches');
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
  },
  // Automatically parse JSDoc comments in route files
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use(`${apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());

import { authenticateToken } from './middlewares/auth';

// Routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/tournaments`, authenticateToken, tournamentsRoutes);
app.use(`${apiPrefix}/judges`, authenticateToken, judgesRoutes);
app.use(`${apiPrefix}/matches`, authenticateToken, matchesRoutes);

// Root endpoint for quick deployment verification
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: `🚀 ${appName} is up and running!`,
    environment: isVercel ? 'Production (Vercel)' : 'Local Development',
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
    environment: isVercel ? 'Vercel' : 'Local',
    uptime: process.uptime()
  });
});

if (!isVercel) {
  app.listen(settings.port, () => {
    console.log(`${appName} running on port ${settings.port}`);
  });
}

export default app;
