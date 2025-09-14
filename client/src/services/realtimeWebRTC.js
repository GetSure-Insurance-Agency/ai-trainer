// services/realtimeWebRTC.js
export default class RealtimeWebRTC {
  constructor() {
    this.pc = null;
    this.mediaStream = null;
    this.dataChannel = null;
    this.remoteAudioEl = null;
    this.onTranscript = null;   // ({ type: 'assistant'|'user', text })
    this.onMessage = null;      // raw event payloads
    this.connected = false;
    this.model = "gpt-4o-realtime-preview-2024-10-01";
  }

  async connect() {
    try {
      console.log('🚀 Initializing WebRTC connection...');
      
      // 1) Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          channelCount: 1,
          sampleRate: 24000
        }
      });
      console.log('🎤 Microphone access granted');

      // 2) Get client secret from our backend
      const secretResp = await fetch('http://localhost:3001/api/realtime/secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!secretResp.ok) {
        throw new Error(`Failed to get client secret: ${secretResp.status}`);
      }
      
      const { client_secret, expires_at } = await secretResp.json();
      console.log('🔑 Client secret obtained, expires at:', new Date(expires_at).toLocaleTimeString());

      // 3) Create RTCPeerConnection and add local audio track
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Add microphone track to peer connection
      this.mediaStream.getTracks().forEach(track => {
        this.pc.addTrack(track, this.mediaStream);
      });

      // 4) Handle remote audio track when it arrives
      this.pc.ontrack = (event) => {
        console.log('📻 Received remote audio track');
        const [remoteStream] = event.streams;
        
        if (!this.remoteAudioEl) {
          this.remoteAudioEl = new Audio();
          this.remoteAudioEl.autoplay = true;
        }
        this.remoteAudioEl.srcObject = remoteStream;
      };

      // 5) Create data channel for control messages and events
      this.dataChannel = this.pc.createDataChannel('oai-events', {
        ordered: true
      });
      
      this.dataChannel.onopen = () => {
        console.log('✅ Data channel opened');
        // Initialize session once data channel is ready
        this.initializeSession();
      };
      
      this.dataChannel.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleEvent(msg);
          if (this.onMessage) this.onMessage(msg);
        } catch (e) {
          // Non-JSON messages (keepalive, stats, etc.)
          console.debug('Non-JSON message:', event.data);
        }
      };
      
      this.dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
      };

      // 6) Create SDP offer
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await this.pc.setLocalDescription(offer);
      console.log('📝 SDP offer created');

      // 7) Exchange SDP with OpenAI using the client secret
      const sdpResp = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(this.model)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${client_secret}`,
            'Content-Type': 'application/sdp'          },
          // body: offer.sdp,
          body: {
            type: 'realtime',
            model: 'gpt-realtime',
            audio: {
              voice: 'marin'
            },
            sdp: offer.sdp
          }
        }
      );
      
      if (!sdpResp.ok) {
        const error = await sdpResp.text();
        throw new Error(`SDP exchange failed: ${error}`);
      }
      
      const answerSdp = await sdpResp.text();
      await this.pc.setRemoteDescription({ 
        type: 'answer', 
        sdp: answerSdp 
      });
      console.log('🤝 SDP answer received and set');

      // 8) Wait for connection to be established
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        const onStateChange = () => {
          console.log('Connection state:', this.pc.connectionState);
          
          if (this.pc.connectionState === 'connected') {
            this.connected = true;
            clearTimeout(timeout);
            cleanup();
            resolve();
          } else if (['failed', 'disconnected', 'closed'].includes(this.pc.connectionState)) {
            clearTimeout(timeout);
            cleanup();
            reject(new Error(`Connection failed: ${this.pc.connectionState}`));
          }
        };
        
        const cleanup = () => {
          this.pc.removeEventListener('connectionstatechange', onStateChange);
        };
        
        this.pc.addEventListener('connectionstatechange', onStateChange);
        onStateChange(); // Check initial state
      });
      
      console.log('🎯 WebRTC connection established successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to connect:', error);
      this.disconnect();
      throw error;
    }
  }

  // Initialize session with default settings
  initializeSession() {
    console.log('🔧 Initializing session...');
    this._send({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { 
          model: 'whisper-1' 
        },
        turn_detection: { 
          type: 'server_vad', 
          threshold: 0.5, 
          prefix_padding_ms: 300, 
          silence_duration_ms: 500 
        },
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    });
  }

  // Update the AI's persona based on selected objection scenario
  setObjectionScenario(scenario) {
    const scenarios = {
      price: "You think life insurance is too expensive and not worth the cost.",
      time: "You're very busy and don't have time to discuss this right now.",
      coverage: "You already have life insurance through work and think that's enough.",
      think: "You want to think about it and aren't ready to make any decisions.",
      spouse: "You need to discuss this with your spouse before making any decisions.",
      young: "You're young and healthy and don't think you need life insurance yet.",
      research: "You want to shop around and compare different options first."
    };
    
    const instruction = scenarios[scenario] || scenarios.price;
    
    console.log(`🎭 Setting objection scenario: ${scenario}`);
    
    this._send({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        voice: 'alloy',
        input_audio_transcription: { 
          model: 'whisper-1' 
        },
        turn_detection: { 
          type: 'server_vad', 
          threshold: 0.5, 
          prefix_padding_ms: 300, 
          silence_duration_ms: 500 
        },
        instructions: `You are a potential life insurance customer. ${instruction}
Be conversational and realistic in your objections. You can be convinced with good arguments, but don't give in too easily. 
Respond naturally as if you're on a phone call. Keep your responses brief and to the point.`
      }
    });
  }

  // Start the conversation with initial message
  async startConversation() {
    console.log('🎯 Starting conversation...');
    
    if (!this.connected) {
      throw new Error('Not connected to Realtime API');
    }
    
    // Wait a bit for session to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create initial user message
    this._send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: "Hello! I'm calling to talk to you about life insurance options. Do you currently have life insurance?"
        }]
      }
    });
    
    // Generate AI response
    this._send({ 
      type: 'response.create',
      response: {
        modalities: ['audio', 'text']
      }
    });
  }

  // Disconnect and cleanup
  async endCall() {
    console.log('📞 Ending call...');
    this.disconnect();
  }

  disconnect() {
    try {
      if (this.dataChannel) {
        this.dataChannel.close();
      }
    } catch (e) {
      console.error('Error closing data channel:', e);
    }
    
    try {
      if (this.pc) {
        this.pc.close();
      }
    } catch (e) {
      console.error('Error closing peer connection:', e);
    }
    
    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      console.error('Error stopping media tracks:', e);
    }
    
    if (this.remoteAudioEl) {
      this.remoteAudioEl.pause();
      this.remoteAudioEl.srcObject = null;
    }
    
    this.connected = false;
  }

  // Internal: Send message through data channel
  _send(payload) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(payload));
    } else {
      console.warn('Data channel not open, message not sent:', payload.type);
    }
  }

  // Internal: Handle incoming events from OpenAI
  _handleEvent(msg) {
    // Log all events for debugging
    console.log(`📨 Event: ${msg.type}`, msg);
    
    switch (msg.type) {
      // Session events
      case 'session.created':
        console.log('Session created:', msg.session?.id);
        break;
        
      case 'session.updated':
        console.log('Session updated');
        break;
      
      // Input audio buffer events (VAD)
      case 'input_audio_buffer.speech_started':
        console.log('🎤 User started speaking');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('🎤 User stopped speaking');
        break;
        
      case 'input_audio_buffer.committed':
        console.log('🎤 User input committed');
        break;
      
      // Response events
      case 'response.created':
        console.log('Response created:', msg.response?.id);
        break;
        
      case 'response.output_item.added':
        console.log('Output item added');
        break;
      
      // Audio transcript events
      case 'response.audio_transcript.delta':
        // Live captions of assistant speech (partial)
        if (this.onTranscript) {
          this.onTranscript({ 
            type: 'assistant_partial', 
            text: msg.delta 
          });
        }
        break;
        
      case 'response.audio_transcript.done':
        // Final transcript of assistant speech
        console.log('🤖 AI said:', msg.transcript);
        if (this.onTranscript) {
          this.onTranscript({ 
            type: 'assistant', 
            text: msg.transcript 
          });
        }
        break;
      
      // User transcript events
      case 'conversation.item.input_audio_transcription.completed':
        // Transcript of user speech
        console.log('👤 You said:', msg.transcript);
        if (this.onTranscript) {
          this.onTranscript({ 
            type: 'user', 
            text: msg.transcript 
          });
        }
        break;
      
      // Text events (if using text modality)
      case 'response.text.delta':
        // Partial text response
        break;
        
      case 'response.text.done':
        // Complete text response
        console.log('Text response:', msg.text);
        break;
      
      // Response lifecycle
      case 'response.done':
        console.log('Response complete');
        break;
      
      // Error handling
      case 'error':
        console.error('❌ Realtime API error:', msg.error);
        break;
        
      default:
        // Log unhandled events for debugging
        if (msg.type && !msg.type.startsWith('realtime.')) {
          console.debug('Unhandled event:', msg.type);
        }
    }
  }
}