import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext";
import StaffSessionExpired from "./staff/StaffSessionExpired";
import { useToast } from "./ui";

export default function RequireStaffAuth({ children, roles = [] }) {
  const { staff, loading, sessionExpired, clearSessionExpired } = useStaffAuth();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (!staff) return undefined;

    // Guard navigation: push an entry so accidental back-button does not jump out of workstation
    window.history.pushState({ staffGuard: true }, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState({ staffGuard: true }, "", window.location.href);
      toast.info("Navigation guarded. Please use Sign Out to exit the workstation.");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [staff, toast]);

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-5 pt-28 pb-16 text-sm text-gray-500">
        Checking staff session…
      </main>
    );
  }

  if (sessionExpired) {
    return (
      <div onClick={clearSessionExpired}>
        <StaffSessionExpired />
      </div>
    );
  }

  if (!staff) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />;
  }

  if (roles.length > 0 && !roles.includes(staff.role)) {
    return <Navigate to="/staff" replace />;
  }

  return children;
}
