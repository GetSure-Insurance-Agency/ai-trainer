const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Import realtime routes
const realtimeRoutes = require('./routes/realtime');
app.use('/api', realtimeRoutes);
app.use(express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'session-' + uniqueSuffix + '.wav');
  }
});

const upload = multer({ storage: storage });

app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.getAllSessions();
    // Map database fields to expected frontend format
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      objection: session.objection_type,
      duration: session.duration,
      created_at: session.created_at,
      performance_note: session.performance_note,
      performance_score: session.performance_score,
      audio_url: session.audio_file_path,
      transcript: session.transcript
    }));
    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.post('/api/sessions', upload.single('audio'), async (req, res) => {
  try {
    const { objection, duration } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const sessionData = {
      objection,
      duration: parseInt(duration),
      audioFilePath: `/${audioFile.filename}`,
      transcript: 'Transcript processing...'
    };

    const newSession = await db.createSession(sessionData);
    
    // Format for frontend response
    const formattedSession = {
      id: newSession.id,
      objection: newSession.objection_type || objection,
      duration: newSession.duration,
      created_at: newSession.created_at,
      audio_url: newSession.audio_file_path,
      transcript: newSession.transcript
    };

    res.json({ message: 'Session saved successfully', session: formattedSession });
  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await db.getAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});