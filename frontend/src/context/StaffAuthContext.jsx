import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEMO_STAFF_ACCOUNTS,
  clearStaffSession,
  fetchCurrentStaff,
  localDemoSession,
  loginStaff,
  persistStaffSession,
  readStoredStaffSession,
  refreshStaffToken,
} from "../services/staffAuth";

const StaffAuthContext = createContext(null);

export function StaffAuthProvider({ children }) {
  const stored = readStoredStaffSession();
  const [token, setToken] = useState(stored.token);
  const [staff, setStaff] = useState(stored.staff);
  const [loading, setLoading] = useState(Boolean(stored.token));
  const [sessionExpired, setSessionExpired] = useState(false);

  const applySession = useCallback((nextToken, nextStaff) => {
    persistStaffSession(nextToken, nextStaff);
    setToken(nextToken);
    setStaff(nextStaff);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    clearStaffSession();
    setToken(null);
    setStaff(null);
  }, []);

  useEffect(() => {
    function onUnauthorized() {
      if (!token || String(token).startsWith("demo-local.")) return;
      setSessionExpired(true);
      logout();
    }
    window.addEventListener("yencare:staff-unauthorized", onUnauthorized);
    return () => window.removeEventListener("yencare:staff-unauthorized", onUnauthorized);
  }, [logout, token]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }

      if (String(token).startsWith("demo-local.")) {
        setLoading(false);
        return;
      }

      try {
        const live = await fetchCurrentStaff();
        if (cancelled) return;
        applySession(token, live);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401) {
          setSessionExpired(true);
          logout();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [applySession, logout, token]);

  useEffect(() => {
    if (!token || String(token).startsWith("demo-local.")) return undefined;
    const id = window.setInterval(async () => {
      try {
        const result = await refreshStaffToken();
        if (result?.token) {
          applySession(result.token, result.staff || staff);
        }
      } catch {
        /* expiry is handled by the 401 interceptor */
      }
    }, 4 * 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [applySession, staff, token]);

  const login = useCallback(
    async ({ identifier, password }) => {
      try {
        const result = await loginStaff({ identifier, password });
        applySession(result.token, result.staff);
        return result.staff;
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 400) throw err;

        const allowDemoFallback =
          import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_STAFF === "true";
        if (!allowDemoFallback) throw err;

        const demo = DEMO_STAFF_ACCOUNTS.find(
          (account) =>
            account.identifier.toLowerCase() === String(identifier || "").trim().toLowerCase() &&
            account.password === password,
        );
        if (!demo) throw err;

        const fallback = localDemoSession(demo);
        applySession(fallback.token, fallback.staff);
        return fallback.staff;
      }
    },
    [applySession],
  );

  const value = useMemo(
    () => ({
      token,
      staff,
      loading,
      sessionExpired,
      clearSessionExpired: () => setSessionExpired(false),
      isAuthenticated: Boolean(staff),
      login,
      logout,
    }),
    [token, staff, loading, sessionExpired, login, logout],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (!context) {
    throw new Error("useStaffAuth must be used within StaffAuthProvider");
  }
  return context;
}
