import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEMO_STAFF_ACCOUNTS,
  clearStaffSession,
  fetchCurrentStaff,
  localDemoSession,
  loginStaff,
  persistStaffSession,
  readStoredStaffSession,
} from "../services/staffAuth";

const StaffAuthContext = createContext(null);

export function StaffAuthProvider({ children }) {
  const stored = readStoredStaffSession();
  const [token, setToken] = useState(stored.token);
  const [staff, setStaff] = useState(stored.staff);
  const [loading, setLoading] = useState(Boolean(stored.token));

  const applySession = useCallback((nextToken, nextStaff) => {
    persistStaffSession(nextToken, nextStaff);
    setToken(nextToken);
    setStaff(nextStaff);
  }, []);

  const logout = useCallback(() => {
    clearStaffSession();
    setToken(null);
    setStaff(null);
  }, []);

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
        if (status === 401) logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [applySession, logout, token]);

  const login = useCallback(
    async ({ identifier, password }) => {
      try {
        const result = await loginStaff({ identifier, password });
        applySession(result.token, result.staff);
        return result.staff;
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 400) throw err;

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
      isAuthenticated: Boolean(staff),
      login,
      logout,
    }),
    [token, staff, loading, login, logout],
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
