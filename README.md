# AI Life Insurance Sales Trainer

A real-time AI-powered training platform for life insurance sales agents to practice handling common objections using OpenAI's Realtime API.

## Features

- **Real-time Voice Conversations**: Practice with AI prospects using OpenAI's Realtime API
- **Objection-Based Training**: Select from 7 common objection scenarios
- **Session Recording**: Automatic audio recording and transcription of practice calls
- **Performance Analytics**: Track practice time, session count, and improvement over time
- **Session Review**: Replay conversations and review transcripts

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key with Realtime API access
- PostgreSQL database (optional - uses in-memory storage by default)

## Quick Start

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd ai-trainer
   npm run install-all
   ```

2. **Set up environment variables**
   ```bash
   # In server directory
   cp server/.env.example server/.env
   # Add your OpenAI API key to server/.env
   
   # In client directory  
   echo "REACT_APP_OPENAI_API_KEY=your_openai_api_key_here" > client/.env
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

   This runs both the React frontend (port 3000) and Express backend (port 3001) concurrently.

## Project Structure

```
ai-trainer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   └── ...
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Main server file
│   ├── database.sql       # Database schema
│   └── package.json
└── package.json           # Root package.json
```

## Available Objection Scenarios

1. **Price concerns** - "That sounds expensive"
2. **No time** - "I'm really busy right now"  
3. **Already have coverage** - "I already have life insurance"
4. **Need to think** - "I need to think about it"
5. **Need spouse approval** - "I need to talk to my spouse first"
6. **Too young** - "I'm too young to worry about this"
7. **Need to research** - "I want to shop around first"

## How It Works

1. **Select Scenario**: Choose an objection type from the dropdown
2. **Start Call**: Click "Start Practice Call" to begin the session
3. **AI Response**: The AI prospect says "Hello?" after a brief delay
4. **Practice**: Have a natural conversation where the AI presents realistic objections
5. **End & Review**: End the call to save the session and review performance

## API Endpoints

- `GET /api/sessions` - Retrieve user's practice sessions
- `POST /api/sessions` - Save a new practice session with audio
- `GET /api/analytics` - Get user practice analytics

## Database Setup (Optional)

For persistent data storage, set up PostgreSQL:

1. Create database and run schema:
   ```bash
   psql -U postgres -c "CREATE DATABASE ai_trainer;"
   psql -U postgres -d ai_trainer -f server/database.sql
   ```

2. Update `DATABASE_URL` in `server/.env`

## Technologies Used

- **Frontend**: React, Bootstrap, Web Audio API
- **Backend**: Node.js, Express, Multer
- **AI**: OpenAI Realtime API  
- **Database**: PostgreSQL (optional)
- **Audio**: Web Audio API, MediaRecorder API

## Development

```bash
# Install all dependencies
npm run install-all

# Start development servers
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

**"OpenAI API key not configured"**
- Ensure `REACT_APP_OPENAI_API_KEY` is set in `client/.env`
- Verify your API key has Realtime API access

**"Error accessing microphone"**
- Allow microphone permissions in your browser
- Ensure you're using HTTPS (required for microphone access)

**"Connection failed"**
- Check your internet connection
- Verify your OpenAI API key is valid
- Ensure the Realtime API is available in your region

## License

MIT License