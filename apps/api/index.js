const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'corner-click-api' });
});

// Endpoint for brackets (stub)
app.post('/api/brackets/generate', (req, res) => {
  res.json({ message: 'Bracket generation stub' });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
