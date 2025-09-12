import React, { useState, useEffect } from 'react';

function Analytics() {
  const [analytics, setAnalytics] = useState({
    totalSessions: 0,
    totalPracticeTime: 0,
    mostPracticedObjection: '',
    averageDuration: 0,
    objectionBreakdown: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}.${Math.floor((secs / 60) * 10)}`;
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

  const getProgressBarWidth = (count, maxCount) => {
    return maxCount > 0 ? (count / maxCount) * 100 : 0;
  };

  const getProgressBarColor = (index) => {
    const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-secondary', 'bg-danger', 'bg-dark'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading analytics...</span>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(analytics.objectionBreakdown));
  const objectionEntries = Object.entries(analytics.objectionBreakdown)
    .sort(([,a], [,b]) => b - a);

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Your Practice Progress</h4>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="analytics-card text-center">
            <div className="stat-number">{analytics.totalSessions}</div>
            <p className="card-text text-muted">Total Sessions</p>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="analytics-card text-center">
            <div className="stat-number text-success">
              {formatTime(analytics.totalPracticeTime)}
            </div>
            <p className="card-text text-muted">Practice Time</p>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="analytics-card text-center">
            <div className="stat-number text-info">
              {getObjectionLabel(analytics.mostPracticedObjection)}
            </div>
            <p className="card-text text-muted">Most Practiced</p>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="analytics-card text-center">
            <div className="stat-number text-warning">
              {formatDuration(analytics.averageDuration)}
            </div>
            <p className="card-text text-muted">Avg Duration (min)</p>
          </div>
        </div>
      </div>

      {/* Objection Practice Breakdown */}
      {analytics.totalSessions > 0 ? (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Practice Sessions by Objection Type</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {objectionEntries.map(([objection, count], index) => {
                    const isLeftColumn = index % 2 === 0;
                    const columnIndex = Math.floor(index / 2);
                    
                    if (index % 6 === 0 && index > 0) {
                      return null;
                    }
                    
                    return (
                      <div key={objection} className={`col-md-6 ${isLeftColumn ? '' : ''}`}>
                        <div className="mb-3">
                          <div className="d-flex justify-content-between">
                            <span>{getObjectionLabel(objection)}</span>
                            <span>{count} session{count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="progress">
                            <div 
                              className={`progress-bar ${getProgressBarColor(index)}`}
                              style={{ width: `${getProgressBarWidth(count, maxCount)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="col-12">
          <div className="text-center text-muted py-5">
            <i className="bi bi-graph-up" style={{fontSize: '3rem'}}></i>
            <p className="mt-3">Complete some practice sessions to see your analytics!</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;