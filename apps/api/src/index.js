const express = require('express');
const cors = require('cors');
const settings = require('./config/settings');

const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    firebaseConfigured: !!settings.firebase.projectId 
  });
});

app.listen(settings.port, () => {
  console.log(`Corner Click API running on port ${settings.port}`);
});
