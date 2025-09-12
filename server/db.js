const mysql = require('mysql2/promise');
require('dotenv').config();

let connection = null;

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 30000,
  acquireTimeout: 30000,
  ssl: false,
  reconnect: true
};

async function getConnection() {
  if (!connection) {
    try {
      connection = await mysql.createPool(dbConfig);
      console.log('MySQL database connected successfully');
      
      // Test the connection
      const [rows] = await connection.execute('SELECT 1 as test');
      console.log('Database connection test successful');
    } catch (error) {
      console.error('Error connecting to MySQL database:', error);
      console.log('Falling back to in-memory storage');
      return null;
    }
  }
  return connection;
}

// Session operations
async function getAllSessions() {
  try {
    const db = await getConnection();
    if (!db) return getFallbackSessions();
    
    const [rows] = await db.execute(`
      SELECT s.*, os.display_name as objection_display_name
      FROM sessions s 
      LEFT JOIN objection_scenarios os ON s.objection_type = os.objection_type
      ORDER BY s.created_at DESC
    `);
    
    return rows;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return getFallbackSessions();
  }
}

async function createSession(sessionData) {
  try {
    const db = await getConnection();
    if (!db) return createFallbackSession(sessionData);
    
    const { objection, duration, audioFilePath, transcript } = sessionData;
    
    const [result] = await db.execute(`
      INSERT INTO sessions (objection_type, duration, audio_file_path, transcript, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [objection, parseInt(duration), audioFilePath, transcript || 'Transcript processing...']);
    
    // Update user analytics (simplified for now without user auth)
    await updateAnalytics(objection, parseInt(duration));
    
    // Fetch the created session
    const [rows] = await db.execute('SELECT * FROM sessions WHERE id = ?', [result.insertId]);
    return rows[0];
  } catch (error) {
    console.error('Error creating session:', error);
    return createFallbackSession(sessionData);
  }
}

async function getAnalytics() {
  try {
    const db = await getConnection();
    if (!db) return getFallbackAnalytics();
    
    const [sessionStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(duration) as total_practice_time,
        AVG(duration) as average_duration
      FROM sessions
    `);
    
    const [objectionStats] = await db.execute(`
      SELECT objection_type, COUNT(*) as count
      FROM sessions
      GROUP BY objection_type
      ORDER BY count DESC
    `);
    
    const objectionBreakdown = {};
    let mostPracticedObjection = '';
    let maxCount = 0;
    
    objectionStats.forEach(row => {
      objectionBreakdown[row.objection_type] = row.count;
      if (row.count > maxCount) {
        maxCount = row.count;
        mostPracticedObjection = row.objection_type;
      }
    });
    
    return {
      totalSessions: sessionStats[0].total_sessions || 0,
      totalPracticeTime: sessionStats[0].total_practice_time || 0,
      averageDuration: sessionStats[0].average_duration || 0,
      mostPracticedObjection,
      objectionBreakdown
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return getFallbackAnalytics();
  }
}

async function updateAnalytics(objectionType, duration) {
  try {
    const db = await getConnection();
    if (!db) return;
    
    // For now, just update global analytics since we don't have user auth yet
    // This could be extended to user-specific analytics later
    console.log(`Updated analytics: ${objectionType} session, ${duration}s duration`);
  } catch (error) {
    console.error('Error updating analytics:', error);
  }
}

// Fallback in-memory data (same as before)
let fallbackSessions = [
  {
    id: 1,
    objection_type: 'price',
    duration: 222,
    created_at: '2024-01-15T14:30:00Z',
    performance_note: 'Good handling of price objection, stayed confident',
    performance_score: 85,
    audio_file_path: '/session-1.wav',
    transcript: 'Agent: Hello, thank you for your time today. I wanted to discuss our life insurance options.\n\nProspect: That sounds expensive.\n\nAgent: I understand price is a concern for many people. Let me ask you this - what\'s more expensive, a life insurance premium or leaving your family without financial protection?\n\nProspect: I hadn\'t thought of it that way...\n\nAgent: Many of our clients find that for less than the cost of a daily coffee, they can provide substantial protection for their loved ones. Would you like me to show you some specific numbers based on your situation?'
  },
  {
    id: 2,
    objection_type: 'time',
    duration: 138,
    created_at: '2024-01-15T11:45:00Z',
    performance_note: 'Could improve on creating urgency',
    performance_score: 65,
    audio_file_path: '/session-2.wav',
    transcript: 'Agent: Hi there! I\'d love to chat about protecting your family\'s financial future.\n\nProspect: I\'m really busy right now.\n\nAgent: I completely understand - we\'re all busy these days. This will just take a few minutes, and it could make a huge difference for your family.\n\nProspect: I really don\'t have time for this.\n\nAgent: I hear you. How about I call you back at a better time? When would work better for you?'
  }
];

function getFallbackSessions() {
  return fallbackSessions.map(session => ({
    ...session,
    audio_url: session.audio_file_path
  }));
}

function createFallbackSession(sessionData) {
  const { objection, duration, audioFilePath } = sessionData;
  const newSession = {
    id: fallbackSessions.length + 1,
    objection_type: objection,
    duration: parseInt(duration),
    created_at: new Date().toISOString(),
    audio_file_path: audioFilePath,
    audio_url: audioFilePath,
    transcript: 'Transcript processing...'
  };
  
  fallbackSessions.push(newSession);
  return newSession;
}

function getFallbackAnalytics() {
  const objectionBreakdown = {};
  let totalPracticeTime = 0;
  let mostPracticedCount = 0;
  let mostPracticedObjection = '';

  fallbackSessions.forEach(session => {
    objectionBreakdown[session.objection_type] = (objectionBreakdown[session.objection_type] || 0) + 1;
    totalPracticeTime += session.duration;

    if (objectionBreakdown[session.objection_type] > mostPracticedCount) {
      mostPracticedCount = objectionBreakdown[session.objection_type];
      mostPracticedObjection = session.objection_type;
    }
  });

  return {
    totalSessions: fallbackSessions.length,
    totalPracticeTime,
    mostPracticedObjection,
    averageDuration: fallbackSessions.length > 0 ? totalPracticeTime / fallbackSessions.length : 0,
    objectionBreakdown
  };
}

module.exports = {
  getConnection,
  getAllSessions,
  createSession,
  getAnalytics
};