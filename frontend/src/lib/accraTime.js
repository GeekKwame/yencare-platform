const ACCRA = "Africa/Accra";

export function accraTodayIso(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCRA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function accraNowHm(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function isFutureSlot(dateIso, startTime, now = new Date()) {
  const today = accraTodayIso(now);
  if (!dateIso) return false;
  if (dateIso > today) return true;
  if (dateIso < today) return false;
  return String(startTime || "") > accraNowHm(now);
}
