import React, { useState, useRef, useEffect } from 'react';
import RealtimeAPI from '../services/realtimeAPI';

const objectionScenarios = [
  { value: 'price', label: 'Price concerns - "That sounds expensive"' },
  { value: 'time', label: 'No time - "I\'m really busy right now"' },
  { value: 'coverage', label: 'Already have coverage - "I already have life insurance"' },
  { value: 'think', label: 'Need to think - "I need to think about it"' },
  { value: 'spouse', label: 'Need spouse approval - "I need to talk to my spouse first"' },
  { value: 'young', label: 'Too young - "I\'m too young to worry about this"' },
  { value: 'research', label: 'Need to research - "I want to shop around first"' }
];

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

function PracticeSession() {
  const [selectedObjection, setSelectedObjection] = useState('price');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const intervalRef = useRef(null);
  const realtimeAPIRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const setupAudioPlayback = async () => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      });
    } catch (error) {
      console.error('Error setting up audio context:', error);
    }
  };

  const playAudioData = async (audioData) => {
    if (!audioContextRef.current) return;

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const startCall = async () => {
    if (!OPENAI_API_KEY) {
      alert('OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your .env file.');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      await setupAudioPlayback();
      
      realtimeAPIRef.current = new RealtimeAPI(OPENAI_API_KEY);
      
      realtimeAPIRef.current.onAudioReceived = (audioData) => {
        playAudioData(audioData);
      };

      realtimeAPIRef.current.onMessage = (message) => {
        console.log('Received message:', message);
      };

      await realtimeAPIRef.current.connect();
      setConnectionStatus('connected');

      realtimeAPIRef.current.setObjectionScenario(selectedObjection);

      const stream = await realtimeAPIRef.current.startAudioInput();
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        saveSession(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsCallActive(true);
      setCallDuration(0);

      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      setTimeout(() => {
        realtimeAPIRef.current.createResponse();
      }, 1500);

    } catch (error) {
      console.error('Error starting call:', error);
      setConnectionStatus('error');
      alert('Error starting call. Please check your API key and internet connection.');
    }
  };

  const endCall = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (realtimeAPIRef.current) {
      realtimeAPIRef.current.disconnect();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsCallActive(false);
    setIsRecording(false);
    setCallDuration(0);
    setConnectionStatus('disconnected');
  };

  const saveSession = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'session.wav');
    formData.append('objection', selectedObjection);
    formData.append('duration', callDuration);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        alert('Session saved successfully!');
      } else {
        throw new Error('Failed to save session');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Error saving session. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card">
          <div className="card-body text-center practice-section">
            <h4 className="card-title mb-4">Start a Practice Call</h4>
            
            {!isCallActive ? (
              <>
                <div className="mb-4">
                  <label htmlFor="objectionSelect" className="form-label h5">
                    Select Objection Scenario:
                  </label>
                  <select 
                    className="form-select form-select-lg" 
                    id="objectionSelect"
                    value={selectedObjection}
                    onChange={(e) => setSelectedObjection(e.target.value)}
                  >
                    {objectionScenarios.map((scenario) => (
                      <option key={scenario.value} value={scenario.value}>
                        {scenario.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  className="btn btn-primary btn-start-call"
                  onClick={startCall}
                  disabled={connectionStatus === 'connecting'}
                >
                  {connectionStatus === 'connecting' ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-telephone"></i> Start Practice Call
                    </>
                  )}
                </button>
                
                {connectionStatus === 'error' && (
                  <div className="alert alert-danger mt-3">
                    Connection failed. Please check your API key and try again.
                  </div>
                )}
              </>
            ) : (
              <div className="call-status active">
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-center mb-2">
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span className="recording-status">
                      Call in progress... Recording active
                      {connectionStatus === 'connected' && ' • AI Connected'}
                    </span>
                  </div>
                  <div className="h5 text-success">{formatTime(callDuration)}</div>
                </div>
                <button 
                  className="btn btn-danger"
                  onClick={endCall}
                >
                  <i className="bi bi-telephone-x"></i> End Call
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PracticeSession;