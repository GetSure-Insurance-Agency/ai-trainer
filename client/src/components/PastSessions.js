import React, { useState, useEffect } from 'react';

function PastSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const playSession = (session) => {
    setSelectedSession(session);
  };

  const showSessionTranscript = (session) => {
    setSelectedSession(session);
    setShowTranscript(true);
  };

  const getObjectionLabel = (objectionType) => {
    const objectionMap = {
      'price': 'Price concerns',
      'time': 'No time',
      'coverage': 'Already have coverage',
      'think': 'Need to think',
      'spouse': 'Need spouse approval',
      'young': 'Too young',
      'research': 'Need to research'
    };
    return objectionMap[objectionType] || objectionType;
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Your Practice Sessions</h4>
        
        {sessions.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-clock-history" style={{fontSize: '3rem'}}></i>
            <p className="mt-3">No practice sessions yet. Start your first session!</p>
          </div>
        ) : (
          <div className="list-group">
            {sessions.map((session, index) => (
              <div key={session.id || index} className="session-item">
                <div className="d-flex w-100 justify-content-between align-items-start">
                  <div className="me-3">
                    <h6 className="mb-1">{getObjectionLabel(session.objection)} objection</h6>
                    <p className="mb-1 text-muted">
                      Duration: {formatDuration(session.duration)} | {formatDate(session.created_at)}
                    </p>
                    <small className={session.performance_note ? getPerformanceColor(session.performance_score) : 'text-muted'}>
                      {session.performance_note || 'No performance notes available'}
                    </small>
                  </div>
                  <div className="audio-controls">
                    <button 
                      className="btn btn-outline-primary btn-sm me-1"
                      onClick={() => playSession(session)}
                    >
                      <i className="bi bi-play"></i> Play
                    </button>
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => showSessionTranscript(session)}
                    >
                      <i className="bi bi-file-text"></i> Transcript
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audio Player Modal */}
        {selectedSession && !showTranscript && (
          <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {getObjectionLabel(selectedSession.objection)} Session
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setSelectedSession(null)}
                  ></button>
                </div>
                <div className="modal-body text-center">
                  <p className="text-muted">
                    {formatDate(selectedSession.created_at)} • {formatDuration(selectedSession.duration)}
                  </p>
                  <audio 
                    controls 
                    className="w-100 mb-3"
                    src={selectedSession.audio_url}
                  >
                    Your browser does not support the audio element.
                  </audio>
                  {selectedSession.performance_note && (
                    <div className="alert alert-info">
                      <strong>Performance Note:</strong> {selectedSession.performance_note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Modal */}
        {selectedSession && showTranscript && (
          <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Transcript - {getObjectionLabel(selectedSession.objection)}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => {setSelectedSession(null); setShowTranscript(false);}}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="bg-light p-3 rounded" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    {selectedSession.transcript ? (
                      <pre className="mb-0" style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>
                        {selectedSession.transcript}
                      </pre>
                    ) : (
                      <p className="text-muted mb-0">Transcript not available for this session.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PastSessions;