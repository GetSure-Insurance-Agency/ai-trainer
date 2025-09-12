import React, { useState } from 'react';
import PracticeSession from './components/PracticeSession';
import PastSessions from './components/PastSessions';
import Analytics from './components/Analytics';

function App() {
  const [activeTab, setActiveTab] = useState('practice');

  return (
    <div className="App">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div className="container">
          <span className="navbar-brand">AI Sales Trainer</span>
          <span className="navbar-text text-light">Life Insurance Training Platform</span>
        </div>
      </nav>

      <div className="container">
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'practice' ? 'active' : ''}`}
              onClick={() => setActiveTab('practice')}
            >
              Practice Session
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              Past Sessions
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </li>
        </ul>

        <div className="tab-content">
          {activeTab === 'practice' && <PracticeSession />}
          {activeTab === 'sessions' && <PastSessions />}
          {activeTab === 'analytics' && <Analytics />}
        </div>
      </div>
    </div>
  );
}

export default App;