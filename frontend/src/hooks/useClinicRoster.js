import { useCallback, useEffect, useState } from "react";
import { mapAppointmentToCard } from "../data/mockAppointments";
import { getTodaysAppointments, getUpcomingAppointments } from "../services/appointments";
import { accraTodayIso } from "../lib/accraTime";

export function useClinicRoster(clinicSite, selectedDate, { pollMs = 0 } = {}) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingLive, setUsingLive] = useState(false);

  const reload = useCallback(async () => {
    try {
      let data;
      if (selectedDate === "upcoming") {
        data = await getUpcomingAppointments(clinicSite, accraTodayIso());
      } else {
        data = await getTodaysAppointments(clinicSite, selectedDate);
      }
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
          "Could not load appointment roster.",
      );
      return [];
    } finally {
      setLoading(false);
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
