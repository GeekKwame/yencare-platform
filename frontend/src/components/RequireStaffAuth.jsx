import { Navigate, useLocation } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext";

export default function RequireStaffAuth({ children, roles = [] }) {
  const { staff, loading } = useStaffAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-5 pt-28 pb-16 text-sm text-gray-500">
        Checking staff session…
      </main>
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
