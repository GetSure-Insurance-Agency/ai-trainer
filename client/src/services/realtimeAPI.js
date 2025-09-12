class RealtimeAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ws = null;
    this.isConnected = false;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.onMessage = null;
    this.onAudioReceived = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', [
          'realtime',
          `Bearer.${this.apiKey}`
        ]);

        this.ws.onopen = () => {
          console.log('Connected to OpenAI Realtime API');
          this.isConnected = true;
          this.initializeSession();
          resolve();
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from OpenAI Realtime API');
          this.isConnected = false;
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  initializeSession() {
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are an AI prospect for life insurance sales training. 
        
        Your role is to help train insurance salespeople by presenting realistic objections during practice calls.
        
        When the call begins:
        1. Start by saying "Hello?" in a neutral tone
        2. Listen to the salesperson's opening
        3. Present the assigned objection naturally in conversation
        4. Respond realistically to their handling of the objection
        5. Don't make it too easy - provide realistic pushback
        6. Keep responses conversational and natural
        7. End the conversation naturally after 2-5 minutes
        
        Stay in character as a potential life insurance customer. Be polite but skeptical.`,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        }
      }
    };

    this.sendMessage(sessionConfig);
  }

  setObjectionScenario(objectionType) {
    const objectionInstructions = {
      price: "Your main objection is price. Say things like 'That sounds expensive' or 'I can't afford that right now'",
      time: "Your main objection is lack of time. Say things like 'I'm really busy right now' or 'I don't have time for this'",
      coverage: "Your main objection is existing coverage. Say 'I already have life insurance through work'",
      think: "Your main objection is needing time to decide. Say 'I need to think about it'",
      spouse: "Your main objection is needing spousal approval. Say 'I need to talk to my spouse first'",
      young: "Your main objection is being too young. Say 'I'm too young to worry about this'",
      research: "Your main objection is wanting to shop around. Say 'I want to shop around first'"
    };

    const instruction = objectionInstructions[objectionType] || objectionInstructions.price;
    
    const updateMessage = {
      type: 'session.update',
      session: {
        instructions: `You are an AI prospect for life insurance sales training. ${instruction}. 
        
        Start with "Hello?" then wait for the agent to speak. Present your objection naturally when appropriate.`
      }
    };

    this.sendMessage(updateMessage);
  }

  sendMessage(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  startAudioInput() {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 24000
          }
        });

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000
        });

        const source = this.audioContext.createMediaStreamSource(stream);
        const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = this.floatTo16BitPCM(inputData);
          
          if (this.isConnected) {
            this.sendMessage({
              type: 'input_audio_buffer.append',
              audio: this.arrayBufferToBase64(pcm16.buffer)
            });
          }
        };

        source.connect(processor);
        processor.connect(this.audioContext.destination);

        resolve(stream);
      } catch (error) {
        reject(error);
      }
    });
  }

  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      int16Array[i] = Math.max(-32768, Math.min(32767, Math.floor(float32Array[i] * 32768)));
    }
    return int16Array;
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  handleMessage(message) {
    console.log('Received message:', message);

    switch (message.type) {
      case 'session.created':
        console.log('Session created');
        break;
      
      case 'response.audio.delta':
        if (this.onAudioReceived && message.delta) {
          const audioData = this.base64ToArrayBuffer(message.delta);
          this.onAudioReceived(audioData);
        }
        break;
      
      case 'conversation.item.input_audio_transcription.completed':
        if (this.onMessage) {
          this.onMessage({
            type: 'user_transcript',
            content: message.transcript
          });
        }
        break;
      
      case 'response.text.delta':
        if (this.onMessage) {
          this.onMessage({
            type: 'assistant_text',
            content: message.delta
          });
        }
        break;
      
      case 'error':
        console.error('API Error:', message.error);
        break;
    }
  }

  commitAudio() {
    this.sendMessage({
      type: 'input_audio_buffer.commit'
    });
  }

  createResponse() {
    this.sendMessage({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isConnected = false;
  }
}

export default RealtimeAPI;