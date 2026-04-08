import { useState, useEffect } from 'react';
import { AppProgress } from '../types';

interface Props {
  progress: AppProgress;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  overdue: boolean;
}

function computeTimeLeft(progress: AppProgress): TimeLeft {
  const next =
    new Date(progress.lastRegressionCheck).getTime() +
    progress.regressionDays * 86_400_000;
  const remaining = next - Date.now();

  if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, overdue: true };

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return { days, hours, minutes, overdue: false };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function Countdown({ progress }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft(progress));

  useEffect(() => {
    setTimeLeft(computeTimeLeft(progress));
    const id = setInterval(() => setTimeLeft(computeTimeLeft(progress)), 60_000);
    return () => clearInterval(id);
  }, [progress]);

  if (timeLeft.overdue) {
    return (
      <div className="countdown countdown--overdue">
        <span className="countdown__icon">⏰</span>
        <span className="countdown__overdue-text">
          Régression en attente — relancez pour l'appliquer
        </span>
      </div>
    );
  }

  return (
    <div className="countdown">
      <span className="countdown__label">Prochain reset dans</span>
      <div className="countdown__blocks">
        <div className="countdown__block">
          <span className="countdown__value">{pad(timeLeft.days)}</span>
          <span className="countdown__unit">j</span>
        </div>
        <span className="countdown__sep">:</span>
        <div className="countdown__block">
          <span className="countdown__value">{pad(timeLeft.hours)}</span>
          <span className="countdown__unit">h</span>
        </div>
        <span className="countdown__sep">:</span>
        <div className="countdown__block">
          <span className="countdown__value">{pad(timeLeft.minutes)}</span>
          <span className="countdown__unit">min</span>
        </div>
      </div>
    </div>
  );
}
