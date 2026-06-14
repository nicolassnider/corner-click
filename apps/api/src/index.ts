import express, { Request, Response } from 'express';
import cors from 'cors';
import settings from './config/settings';

import authRoutes from './routes/auth';
import tournamentsRoutes from './routes/tournaments';
import pinsRoutes from './routes/pins';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const app = express();
app.use(cors());

// Load OpenAPI spec
const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/tournaments', pinsRoutes); // Mounted on tournaments since it extends /:id/pins

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    firebaseConfigured: !!settings.firebase.projectId 
  });
});

app.listen(settings.port, () => {
  console.log(`Corner Click API running on port ${settings.port}`);
});
