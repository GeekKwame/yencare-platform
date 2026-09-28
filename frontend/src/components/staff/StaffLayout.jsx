import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../../assets/Yencare Logo.png";
import { Button } from "../ui";

const ROLE_LABELS = {
  RECEPTIONIST: "Receptionist",
  DOCTOR: "Doctor",
  ADMIN: "Admin",
};

/**
 * Staff shell: 240px sticky sidebar on desktop, header + drawer on mobile.
 * Ports ui/prototype/src/components/staff/StaffLayout.tsx.
 */
export default function StaffLayout({
  staff,
  view,
  onViewChange,
  arrivedCount = 0,
  onSignOut,
  children,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const initials = String(staff?.name || "YC")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const navItems = [
    { id: "today", label: "Today's Operations", icon: "dashboard" },
    { id: "roster", label: "Appointments Roster", icon: "calendar_month" },
    { id: "queue", label: "Live Queue", icon: "reorder" },
    ...(staff?.role === "DOCTOR" || staff?.role === "ADMIN"
      ? [{ id: "room", label: "Room Board", icon: "stethoscope" }]
      : []),
  ];

  function go(id) {
    onViewChange?.(id);
    setMobileNavOpen(false);
  }

  const navButton = (item) => {
    const isActive = !item.href && view === item.id;
    const className = `w-full text-left px-3 py-2.5 flex items-center gap-2.5 border text-xs font-medium transition-all ${
      isActive
        ? "border-accent-border bg-accent-soft font-semibold text-accent"
        : "border-transparent bg-transparent text-text-muted hover:bg-surface-secondary hover:text-primary"
    }`;
    const body = (
      <>
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
        {item.id === "roster" && arrivedCount > 0 && (
          <span className="ml-auto bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">
            {arrivedCount}
          </span>
        )}
      </>
    );

    if (item.href) {
      return (
        <Link key={item.id} to={item.href} className={className} onClick={() => setMobileNavOpen(false)}>
          {body}
        </Link>
      );
    }

    return (
      <button key={item.id} type="button" onClick={() => go(item.id)} className={className}>
        {body}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-clinic-bg text-primary md:flex-row">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-clinic-border bg-surface px-4 py-3 md:hidden">
        <Link to="/" className="flex items-center gap-2" aria-label="YɛnCare home">
          <img src={Logo} alt="" className="h-8 w-8 object-contain" />
          <span className="text-sm font-bold">YɛnCare</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="border border-accent-border bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            {ROLE_LABELS[staff?.role] || staff?.role}
          </span>
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="border border-clinic-border p-1.5 text-primary hover:bg-surface-secondary"
            aria-label="Toggle staff menu"
            aria-expanded={mobileNavOpen}
            aria-controls="staff-mobile-nav"
          >
            <span className="material-symbols-outlined text-[18px]">
              {mobileNavOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </header>

      {mobileNavOpen && (
        <div id="staff-mobile-nav" className="z-30 space-y-2 border-b border-clinic-border bg-surface p-4 md:hidden">
          {navItems.map(navButton)}
          <div className="flex justify-between border-t border-border-divider pt-2">
            <Link to="/" className="p-2 text-xs font-semibold text-text-muted hover:text-primary">
              ← Patient View
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="p-2 text-xs font-semibold text-error hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden min-h-screen w-[240px] shrink-0 flex-col justify-between border-r border-clinic-border bg-surface p-4 md:flex">
        <div className="space-y-5">
          <Link to="/" className="flex items-center justify-center px-1 py-1" aria-label="YɛnCare home">
            <img src={Logo} alt="YɛnCare" className="h-10 object-contain" />
          </Link>

          <div className="space-y-2 border border-clinic-border bg-clinic-bg p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center bg-primary text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="truncate text-xs font-semibold text-primary">{staff?.name}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  {ROLE_LABELS[staff?.role] || staff?.role}
                  {staff?.assignedRoom ? ` · ${staff.assignedRoom}` : ""}
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-1" aria-label="Staff workstation">
            {navItems.map(navButton)}
          </nav>
        </div>

        <div className="space-y-1 border-t border-border-divider pt-4">
          <Link
            to="/"
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-text-muted hover:bg-surface-secondary hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              open_in_new
            </span>
            Patient View
          </Link>
          <Button variant="destructive" size="sm" fullWidth onClick={onSignOut}>
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
