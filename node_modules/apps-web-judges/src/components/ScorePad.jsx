import React, { useState, useEffect } from 'react';
import '../styles/global.css';

export default function ScorePad() {
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  
  const [redWarnings, setRedWarnings] = useState(0);
  const [blueWarnings, setBlueWarnings] = useState(0);
  
  const [redDeductions, setRedDeductions] = useState(0);
  const [blueDeductions, setBlueDeductions] = useState(0);

  // According to BR-024: 3 warnings = 1 point deduction
  useEffect(() => {
    if (redWarnings >= 3) {
      setRedDeductions(prev => prev + 1);
      setRedWarnings(0);
      setRedScore(prev => prev - 1);
    }
  }, [redWarnings]);

  useEffect(() => {
    if (blueWarnings >= 3) {
      setBlueDeductions(prev => prev + 1);
      setBlueWarnings(0);
      setBlueScore(prev => prev - 1);
    }
  }, [blueWarnings]);

  const handleScore = (e, color, points) => {
    e.currentTarget.blur();
    if (color === 'red') setRedScore(prev => prev + points);
    if (color === 'blue') setBlueScore(prev => prev + points);
    
    // Simple visual feedback trigger
    const scoreEl = document.getElementById(`${color}-score`);
    if (scoreEl) {
      scoreEl.classList.remove('score-flash');
      void scoreEl.offsetWidth; // trigger reflow
      scoreEl.classList.add('score-flash');
    }
  };

  const handleWarning = (e, color) => {
    e.currentTarget.blur();
    if (color === 'red') setRedWarnings(prev => prev + 1);
    if (color === 'blue') setBlueWarnings(prev => prev + 1);
  };

  const handleDeduction = (e, color) => {
    e.currentTarget.blur();
    if (color === 'red') {
      setRedDeductions(prev => prev + 1);
      setRedScore(prev => prev - 1);
    }
    if (color === 'blue') {
      setBlueDeductions(prev => prev + 1);
      setBlueScore(prev => prev - 1);
    }
  };

  return (
    <div className="score-pad-container">
      {/* RED COMPETITOR */}
      <div className="competitor-panel red">
        <div className="panel-header">
          <h2>RED</h2>
          <div id="red-score" className="score-display">{redScore}</div>
          <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.5rem' }}>
            Warnings: {redWarnings}/3 | Deductions: {redDeductions}
          </div>
        </div>
        
        <div className="point-buttons">
          <button className="btn-point" onClick={(e) => handleScore(e, 'red', 1)}>
            <strong>+1</strong> <span>(Hand)</span>
          </button>
          <button className="btn-point" onClick={(e) => handleScore(e, 'red', 2)}>
            <strong>+2</strong> <span>(Foot Mid)</span>
          </button>
          <button className="btn-point" onClick={(e) => handleScore(e, 'red', 3)}>
            <strong>+3</strong> <span>(Foot High)</span>
          </button>
        </div>

        <div className="action-row">
          <button className="btn-action btn-warning" onClick={(e) => handleWarning(e, 'red')}>
            WARN
          </button>
          <button className="btn-action btn-deduction" onClick={(e) => handleDeduction(e, 'red')}>
            DEDUCT
          </button>
        </div>
      </div>

      {/* BLUE COMPETITOR */}
      <div className="competitor-panel blue">
        <div className="panel-header">
          <h2>BLUE</h2>
          <div id="blue-score" className="score-display">{blueScore}</div>
          <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.5rem' }}>
            Warnings: {blueWarnings}/3 | Deductions: {blueDeductions}
          </div>
        </div>
        
        <div className="point-buttons">
          <button className="btn-point" onClick={(e) => handleScore(e, 'blue', 1)}>
            <strong>+1</strong> <span>(Hand)</span>
          </button>
          <button className="btn-point" onClick={(e) => handleScore(e, 'blue', 2)}>
            <strong>+2</strong> <span>(Foot Mid)</span>
          </button>
          <button className="btn-point" onClick={(e) => handleScore(e, 'blue', 3)}>
            <strong>+3</strong> <span>(Foot High)</span>
          </button>
        </div>

        <div className="action-row">
          <button className="btn-action btn-warning" onClick={(e) => handleWarning(e, 'blue')}>
            WARN
          </button>
          <button className="btn-action btn-deduction" onClick={(e) => handleDeduction(e, 'blue')}>
            DEDUCT
          </button>
        </div>
      </div>
    </div>
  );
}
