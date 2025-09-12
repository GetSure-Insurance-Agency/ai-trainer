const WebSocket = require('ws');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

console.log('🧪 Testing OpenAI Realtime API Connection');
console.log('📋 API Key:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 10)}...` : 'NO KEY');

const testFormats = [
  {
    name: 'Format 1: Bearer.token + realtime',
    protocols: [`Bearer.${OPENAI_API_KEY}`, 'realtime']
  },
  {
    name: 'Format 2: Just Bearer.token',
    protocols: [`Bearer.${OPENAI_API_KEY}`]
  },
  {
    name: 'Format 3: Bearer + token + realtime',
    protocols: ['Bearer', OPENAI_API_KEY, 'realtime']
  },
  {
    name: 'Format 4: Just realtime protocol',
    protocols: ['realtime'],
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    }
  }
];

async function testConnection(format, index) {
  return new Promise((resolve) => {
    console.log(`\n🔄 Testing ${format.name}...`);
    
    const wsOptions = {
      protocols: format.protocols
    };
    
    if (format.headers) {
      wsOptions.headers = format.headers;
    }
    
    const ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
      wsOptions
    );

    const timeout = setTimeout(() => {
      console.log(`❌ ${format.name}: Timeout`);
      ws.terminate();
      resolve({ success: false, error: 'timeout' });
    }, 10000);

    ws.on('open', () => {
      console.log(`✅ ${format.name}: Connected!`);
      
      // Send a test message
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful AI assistant.',
          voice: 'alloy'
        }
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`📨 ${format.name}: Received ${message.type}`);
      
      if (message.type === 'error') {
        console.log(`❌ ${format.name}: API Error:`, JSON.stringify(message.error, null, 2));
        clearTimeout(timeout);
        ws.terminate();
        resolve({ success: false, error: message.error });
      } else if (message.type === 'session.created') {
        console.log(`🎉 ${format.name}: SUCCESS! Session created`);
        clearTimeout(timeout);
        ws.terminate();
        resolve({ success: true, format });
      }
    });

    ws.on('error', (error) => {
      console.log(`❌ ${format.name}: WebSocket Error:`, error.message);
      clearTimeout(timeout);
      resolve({ success: false, error: error.message });
    });

    ws.on('close', (code, reason) => {
      console.log(`🔐 ${format.name}: Closed (${code}) ${reason}`);
      clearTimeout(timeout);
      if (!resolve.called) {
        resolve({ success: false, error: 'closed' });
      }
    });
  });
}

async function runTests() {
  console.log(`\n🚀 Testing ${testFormats.length} different authentication formats...\n`);
  
  const results = [];
  
  for (let i = 0; i < testFormats.length; i++) {
    const result = await testConnection(testFormats[i], i);
    results.push(result);
    
    if (result.success) {
      console.log(`\n🏆 WORKING FORMAT FOUND: ${result.format.name}`);
      console.log(`✨ Use this in your frontend:`);
      console.log(`   protocols: ${JSON.stringify(result.format.protocols)}`);
      if (result.format.headers) {
        console.log(`   headers: ${JSON.stringify(result.format.headers)}`);
      }
      break;
    }
    
    // Wait between tests
    if (i < testFormats.length - 1) {
      console.log('⏱️  Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${testFormats[i].name}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  });
  
  if (!results.some(r => r.success)) {
    console.log('\n🤔 All tests failed. Possible issues:');
    console.log('   - API key doesn\'t have Realtime API access');
    console.log('   - Different authentication method required');
    console.log('   - API endpoint or model name changed');
  }
  
  process.exit(0);
}

runTests().catch(console.error);