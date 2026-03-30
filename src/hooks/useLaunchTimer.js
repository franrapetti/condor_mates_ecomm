import { useState, useEffect } from 'react';

// TARGET LAUNCH DATE: 31 de Marzo 2026 a las 00:00 (Medianoche en ArgentinaUTC-3)
export const LAUNCH_DATE_STR = '2026-03-31T00:00:00-03:00';
export const LAUNCH_DATE = new Date(LAUNCH_DATE_STR);

export function useLaunchTimer() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  
  // Si la fecha actual ya superó la fecha de lanzamiento (o es = ) -> ya lanzamos
  const isLaunched = new Date() >= LAUNCH_DATE;

  function calculateTimeLeft() {
    const difference = LAUNCH_DATE.getTime() - new Date().getTime();
    let left = {};

    if (difference > 0) {
      left = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      left = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return left;
  }

  useEffect(() => {
    if (isLaunched) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, isLaunched]);

  return { isLaunched, timeLeft };
}
