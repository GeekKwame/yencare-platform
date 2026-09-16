import { Link } from "react-router-dom";

const ROLE_LABELS = {
  RECEPTIONIST: "Receptionist",
  DOCTOR: "Doctor",
  ADMIN: "Admin",
};

export default function StaffWorkstationBar({ staff, onSignOut, showDisplayBoard = false }) {
  const initials = String(staff?.name || "YC")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="border-b border-[#dce8df] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-[#173b3a] text-xs font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#173b3a]">{staff?.name}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B]">
              {ROLE_LABELS[staff?.role] || staff?.role}
              {staff?.assignedRoom ? ` · ${staff.assignedRoom}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showDisplayBoard && (
            <Link
              to="/staff/display"
              className="rounded-xl border border-[#dce8df] px-3 py-2 text-xs font-semibold text-[#173b3a] hover:bg-[#E7F5F1]"
            >
              Corridor TV
            </Link>
          )}
          <Link
            to="/"
            className="rounded-xl border border-[#dce8df] px-3 py-2 text-xs font-semibold text-[#66706B] hover:text-[#173b3a]"
          >
            Patient web
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-[#f1c0c0] bg-[#FFF5F5] px-3 py-2 text-xs font-semibold text-[#9B2C2C] hover:bg-[#fde8e8]"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
