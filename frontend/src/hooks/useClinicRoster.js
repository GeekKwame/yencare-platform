import { useCallback, useEffect, useRef, useState } from "react";
import { mapAppointmentToCard } from "../data/mockAppointments";
import { getTodaysAppointments, getUpcomingAppointments } from "../services/appointments";
import { accraTodayIso } from "../lib/accraTime";

export function useClinicRoster(clinicSite, selectedDate, { pollMs = 0 } = {}) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingLive, setUsingLive] = useState(false);
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    const isLatest = () => latestRequest.current === requestId;

    try {
      let data;
      if (selectedDate === "upcoming") {
        data = await getUpcomingAppointments(clinicSite, accraTodayIso());
      } else {
        data = await getTodaysAppointments(clinicSite, selectedDate);
      }
      const list = Array.isArray(data) ? data.map(mapAppointmentToCard) : [];
      if (isLatest()) {
        setAppointments(list);
        setUsingLive(true);
        setError("");
      }
      return list;
    } catch (err) {
      if (isLatest()) {
        setAppointments([]);
        setUsingLive(false);
        setError(
          err.response?.data?.error ||
            "Could not load appointment roster.",
        );
      }
      return [];
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [clinicSite, selectedDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const id = window.setInterval(() => {
      void reload();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, reload]);

  return { appointments, setAppointments, loading, error, usingLive, reload };
}
