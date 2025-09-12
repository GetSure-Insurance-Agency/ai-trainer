const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Create HTTP server for the proxy
const server = http.createServer();

// Create WebSocket server that will proxy to OpenAI
const wss = new WebSocket.Server({ 
  server,
  path: '/realtime-proxy'
});

console.log('🚀 Starting OpenAI Realtime API Proxy Server...');

wss.on('connection', (clientWs, request) => {
  console.log('📱 Client connected to proxy');
  
  // Connect to OpenAI with proper authentication
  const openaiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
    ['realtime'],
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    }
  );

  // Forward messages from client to OpenAI
  clientWs.on('message', (data) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(data);
    }
  });

  // Forward messages from OpenAI to client
  openaiWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      if (isBinary) {
        // Forward binary data (audio) as-is
        clientWs.send(data, { binary: true });
      } else {
        // Forward text data (JSON) as-is
        clientWs.send(data);
      }
    }
  });

  // Handle OpenAI connection events
  openaiWs.on('open', () => {
    console.log('✅ Connected to OpenAI Realtime API');
  });

  openaiWs.on('error', (error) => {
    console.error('❌ OpenAI WebSocket error:', error);
    clientWs.close(1011, 'OpenAI connection error');
  });

  openaiWs.on('close', (code, reason) => {
    console.log('🔐 OpenAI connection closed:', code, reason.toString());
    clientWs.close(code, reason);
  });

  // Handle client disconnection
  clientWs.on('close', () => {
    console.log('📱 Client disconnected');
    openaiWs.close();
  });

  clientWs.on('error', (error) => {
    console.error('📱 Client WebSocket error:', error);
    openaiWs.close();
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`🌐 WebSocket Proxy Server running on port ${PORT}`);
  console.log(`📍 Client should connect to: ws://localhost:${PORT}/realtime-proxy`);
});

module.exports = server;