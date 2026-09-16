import { useCallback, useEffect, useState } from "react";
import { mapAppointmentToCard } from "../data/mockAppointments";
import { getTodaysAppointments } from "../services/appointments";

export function useClinicRoster(clinicSite, selectedDate, { pollMs = 0 } = {}) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingLive, setUsingLive] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await getTodaysAppointments(clinicSite, selectedDate);
      const list = Array.isArray(data) ? data.map(mapAppointmentToCard) : [];
      setAppointments(list);
      setUsingLive(true);
      setError("");
      return list;
    } catch (err) {
      setAppointments([]);
      setUsingLive(false);
      setError(
        err.response?.data?.error ||
          "Could not load the clinic roster. Check that the API is running.",
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, [clinicSite, selectedDate]);

  useEffect(() => {
    setLoading(true);
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
