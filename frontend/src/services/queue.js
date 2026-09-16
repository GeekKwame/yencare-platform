import api from "./api";

export async function callNextPatient({ roomId, clinicianId, force = false, completePrevious = false } = {}) {
  const response = await api.post("/queue/call-next", {
    roomId,
    clinicianId,
    force,
    completePrevious,
  });
  return response.data;
}

export async function advanceQueue({ appointmentId, referenceCode, roomId, callNext = false } = {}) {
  const response = await api.post("/queue/advance", {
    appointmentId,
    referenceCode,
    roomId,
    callNext,
  });
  return response.data;
}

export async function markQueueNoShow({ appointmentId, referenceCode, roomId, reason } = {}) {
  const response = await api.post("/queue/no-show", {
    appointmentId,
    referenceCode,
    roomId,
    reason,
  });
  return response.data;
}

/**
 * Public clinic-activity snapshot for the patient welcome screen.
 * @param {string} [clinicSite]
 */
export async function getClinicActivity(clinicSite = "students-clinic") {
  const response = await api.get("/queue/activity", {
    params: { clinicSite },
  });
  return response.data;
}
