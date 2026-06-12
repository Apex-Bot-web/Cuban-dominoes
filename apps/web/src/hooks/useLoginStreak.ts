import { useEffect, useState } from 'react';

const KEY_DATE   = 'dominoes-last-login';
const KEY_STREAK = 'dominoes-login-streak';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

/** Returns the current login streak (days in a row) and marks today as visited. */
export function useLoginStreak(): number {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const today     = todayISO();
    const lastLogin = localStorage.getItem(KEY_DATE);
    const stored    = parseInt(localStorage.getItem(KEY_STREAK) ?? '0', 10);

    let next = stored;
    if (!lastLogin) {
      next = 1;
    } else if (lastLogin === today) {
      next = stored; // already counted today
    } else {
      const diff = daysBetween(lastLogin, today);
      next = diff === 1 ? stored + 1 : 1; // consecutive day → extend, gap → reset
    }

    localStorage.setItem(KEY_DATE, today);
    localStorage.setItem(KEY_STREAK, String(next));
    setStreak(next);
  }, []);

  return streak;
}
