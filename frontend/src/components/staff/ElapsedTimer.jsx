import { useEffect, useState } from "react";

export function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default function ElapsedTimer({ resetKey, className = "text-sm text-gray-500" }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [resetKey]);

  return <p className={className}>Elapsed: {formatElapsed(seconds)}</p>;
}
