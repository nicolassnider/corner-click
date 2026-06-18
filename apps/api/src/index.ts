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

// Configure Swagger JSDoc
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Corner Click API',
      version: '1.0.0',
      description: 'Backend API for the Corner Click Taekwondo Scoring System',
    },
    servers: [
      {
        url: '/api',
        description: 'Local Development Server',
      },
    ],
  },
  // Automatically parse JSDoc comments in route files
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/tournaments', judgesRoutes); // wait, should judges have /api/judges instead of /api/tournaments? The original had app.use('/api/tournaments', judgesRoutes);
app.use('/api/matches', matchesRoutes);

// Root endpoint for quick deployment verification
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🚀 Corner Click API is up and running!',
    environment: process.env.VERCEL ? 'Production (Vercel)' : 'Local Development',
    timestamp: new Date().toISOString(),
    docs: '/api/docs'
  });
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: '✅ API is healthy and ready to process requests',
    firebaseConfigured: !!settings.firebase.projectId,
    environment: process.env.VERCEL ? 'Vercel' : 'Local',
    uptime: process.uptime()
  });
});

if (!process.env.VERCEL) {
  app.listen(settings.port, () => {
    console.log(`Corner Click API running on port ${settings.port}`);
  });
}

export default app;
