import { Link } from "react-router-dom";

const ROLE_LABELS = {
  RECEPTIONIST: "Receptionist",
  DOCTOR: "Doctor",
  ADMIN: "Admin",
};

export default function StaffWorkstationBar({
  staff,
  onSignOut,
  view,
  onViewChange,
  arrivedCount = 0,
}) {
  const initials = String(staff?.name || "YC")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const showOpsNav = staff?.role !== "DOCTOR" && typeof onViewChange === "function";
  const navItems = [
    { id: "today", label: "Today" },
    { id: "roster", label: "Appointments" },
    { id: "queue", label: "Live Queue" },
  ];

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

        {showOpsNav && (
          <nav className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                  view === item.id
                    ? "bg-[#E7F5F1] text-[#176b5f]"
                    : "text-[#66706B] hover:bg-[#f5faf7] hover:text-[#173b3a]"
                }`}
              >
                {item.label}
                {item.id === "roster" && arrivedCount > 0 ? ` (${arrivedCount})` : ""}
              </button>
            ))}
          </nav>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/"
            className="rounded-xl border border-[#dce8df] px-3 py-2 text-xs font-semibold text-[#66706B] hover:text-[#173b3a]"
          >
            Patient web
          </Link>
          {staff?.role === "ADMIN" && (
            <Link
              to="/staff/display"
              className="rounded-xl border border-[#dce8df] px-3 py-2 text-xs font-semibold text-[#66706B] hover:text-[#173b3a]"
            >
              Corridor display
            </Link>
          )}
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
