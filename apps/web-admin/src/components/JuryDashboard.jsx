import React, { useState, useEffect } from 'react';
import '../styles/global.css';

const MOCK_MATCHES = [
  { id: 1, title: 'Final - Black Belt - 70kg', red: 'John Doe', blue: 'Jane Smith', status: 'PENDING' },
  { id: 2, title: 'Semi-Final - Black Belt - 70kg', red: 'Mike T.', blue: 'Alex B.', status: 'ENDED' },
];

export default function JuryDashboard() {
  const [selectedMatch, setSelectedMatch] = useState(MOCK_MATCHES[0]);
  const [status, setStatus] = useState('PENDING'); // PENDING, ACTIVE, PAUSED, ENDED
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds

  useEffect(() => {
    let interval = null;
    if (status === 'ACTIVE' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && status === 'ACTIVE') {
      setStatus('ENDED');
    }
    return () => clearInterval(interval);
  }, [status, timeRemaining]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStart = () => setStatus('ACTIVE');
  const handlePause = () => setStatus('PAUSED');
  const handleEnd = () => setStatus('ENDED');

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <h1>Corner <span>Click</span> Admin</h1>
        <div>Ring 1 - Jury Table</div>
      </nav>

      <main className="main-content">
        {/* Left Sidebar: Match Queue */}
        <aside className="panel">
          <h2>Upcoming Matches</h2>
          <div className="match-list">
            {MOCK_MATCHES.map(match => (
              <div 
                key={match.id} 
                className={`match-item ${selectedMatch.id === match.id ? 'active' : ''}`}
                onClick={() => setSelectedMatch(match)}
              >
                <div className="match-item-title">{match.title}</div>
                <div className="match-item-meta">
                  <span style={{ color: 'var(--color-danger)' }}>{match.red}</span> vs <span style={{ color: 'var(--color-primary)' }}>{match.blue}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Main Area: Timer & Controls */}
        <section className="panel control-panel">
          <h2>Match Control</h2>
          <div className="match-item-meta" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--color-danger)' }}>{selectedMatch.red}</span> vs <span style={{ color: 'var(--color-primary)' }}>{selectedMatch.blue}</span>
          </div>

          <div className={`status-badge status-${status.toLowerCase()}`}>
            {status}
          </div>

          <div className="match-timer">
            {formatTime(timeRemaining)}
          </div>

          <div className="controls">
            <button 
              className="btn btn-start" 
              onClick={handleStart}
              disabled={status === 'ACTIVE' || status === 'ENDED'}
            >
              {status === 'PAUSED' ? 'Resume' : 'Start'}
            </button>
            <button 
              className="btn btn-pause" 
              onClick={handlePause}
              disabled={status !== 'ACTIVE'}
            >
              Pause
            </button>
            <button 
              className="btn btn-end" 
              onClick={handleEnd}
              disabled={status === 'ENDED'}
            >
              End Match
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
