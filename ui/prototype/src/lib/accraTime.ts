import { useEffect, useState } from 'react';

const ACCRA = 'Africa/Accra';

export function formatAccraTime(date = new Date()): string {
  return date.toLocaleTimeString('en-GB', {
    timeZone: ACCRA,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function isClinicOpenAccra(date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: ACCRA,
      hour: 'numeric',
      hour12: false,
    }).format(date)
  );
  return hour >= 8 && hour < 20;
}

/** Live Ghana time (Africa/Accra). Clinic hours: 08:00–20:00. */
export function useAccraClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return {
    now,
    time: formatAccraTime(now),
    isOpen: isClinicOpenAccra(now),
  };
}
