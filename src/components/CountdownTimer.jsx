import React from 'react';
import { useLaunchTimer } from '../hooks/useLaunchTimer';
import './CountdownTimer.css';

const CountdownTimer = () => {
  const { isLaunched, timeLeft } = useLaunchTimer();

  if (isLaunched) return null;

  return (
    <div className="hero-banner countdown-banner fade-in">
      <div className="hero-content">
        <span className="hero-badge countdown-badge">🚀 Gran Lanzamiento Oficial</span>
        <h1 className="hero-title">Una nueva era<br/>ha llegado a Cóndor.</h1>
        <p className="hero-subtitle" style={{marginBottom: '2rem'}}>Armá tu lista de favoritos. Los pedidos se habilitarán a la medianoche. ¡Prepará tu mate!</p>
        
        <div className="countdown-clock">
          <div className="time-block">
            <span className="time-val">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="time-label">Días</span>
          </div>
          <span className="time-sep">:</span>
          <div className="time-block">
            <span className="time-val">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="time-label">Horas</span>
          </div>
          <span className="time-sep">:</span>
          <div className="time-block">
            <span className="time-val">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="time-label">Min</span>
          </div>
          <span className="time-sep">:</span>
          <div className="time-block">
            <span className="time-val">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="time-label">Seg</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
