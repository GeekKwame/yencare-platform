import { entityId } from "./appointmentView";

export function resolveRoomId(room) {
  if (!room) return "";
  if (typeof room === "string") return room;
  return room.id || room._id || "";
}

export function mapClinician(doc) {
  const room = doc?.roomId && typeof doc.roomId === "object" ? doc.roomId : null;
  const roomName = room?.name || "";
  const specialty = doc?.specialty || "General Clinic";

  return {
    id: entityId(doc),
    name: doc?.name || "Clinician",
    title: doc?.title || "",
    specialty,
    clinicSite: doc?.clinicSite || "",
    available: doc?.available !== false,
    roomId: resolveRoomId(doc?.roomId),
    roomName,
    roomLabel: roomName ? `${specialty} · ${roomName}` : specialty,
    position: doc?.title || "Medical Officer",
  };
}

export function mapTimeSlot(doc) {
  return {
    id: entityId(doc),
    date: doc?.date || "",
    startTime: doc?.startTime || "",
    endTime: doc?.endTime || "",
    isBooked: Boolean(doc?.isBooked),
    clinicSite: doc?.clinicSite || "",
    clinicianId: entityId(doc?.clinicianId),
    roomId: resolveRoomId(doc?.roomId),
  };
}

export function bumpClock(hhmm, minutes = 1) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return "08:30";
  const [hours, mins] = hhmm.split(":").map(Number);
  const total = (((hours * 60 + mins + minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
