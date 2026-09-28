import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { StaffScreen } from '../../types/clinic';
import { YenCareLogo } from '../common/YenCareLogo';

interface StaffLayoutProps {
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const { staffScreen, setStaffScreen, staffUser, setStaffRole, setActiveShell, appointments } = useClinic();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const arrivedCount = appointments.filter((a) => a.status === 'CHECKED_IN').length;
  const navItems: { label: string; screen: StaffScreen; icon: string }[] = [
    { label: "Today's Operations", screen: 'S02_TODAY', icon: 'dashboard' },
    { label: 'Appointments Roster', screen: 'S03_APPOINTMENTS', icon: 'calendar_month' },
    { label: 'Live Queue', screen: 'S05_LIVE_QUEUE', icon: 'reorder' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F7] flex flex-col md:flex-row text-[#111111]">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-[#D8DCD9] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center">
          <YenCareLogo variant="nav" />
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-[#E7F5F1] text-[#087F6C] border border-[#99D5C8]">
            {staffUser.role}
          </span>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-1.5 border border-[#D8DCD9] text-[#111111] hover:bg-[#F0F2F1] cursor-pointer"
            aria-label="Toggle staff menu"
          >
            <span className="material-symbols-outlined text-[18px]">
              {mobileNavOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white border-b border-[#D8DCD9] p-4 space-y-2 z-30">
          {navItems.map((item) => (
            <button
              key={item.screen}
              onClick={() => {
                setStaffScreen(item.screen);
                setMobileNavOpen(false);
              }}
              className={`w-full text-left p-3 text-xs font-semibold tracking-wide flex items-center gap-3 border transition-colors ${
                staffScreen === item.screen
                  ? 'bg-[#E7F5F1] text-[#087F6C] border-[#99D5C8] font-bold'
                  : 'bg-white text-[#111111] border-[#D8DCD9]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.screen === 'S03_APPOINTMENTS' && arrivedCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-[#087F6C] text-white text-[9px] font-bold">
                  {arrivedCount}
                </span>
              )}
            </button>
          ))}
          <div className="pt-2 border-t border-[#E5E7E6] flex justify-between">
            <button
              onClick={() => setActiveShell('PATIENT')}
              className="text-xs font-semibold text-[#66706B] hover:text-[#111111] p-2 cursor-pointer"
            >
              &larr; Patient View
            </button>
            <button
              onClick={() => {
                setStaffScreen('S01_SIGN_IN');
                setMobileNavOpen(false);
              }}
              className="text-xs font-semibold text-[#C53030] hover:underline p-2 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Desktop Fixed Sidebar (240px wide per design spec) */}
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-white border-r border-[#D8DCD9] min-h-screen sticky top-0 p-4 justify-between">
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="px-1 py-1">
            <YenCareLogo variant="sidebar" className="mx-auto" />
          </div>

          {/* Staff Profile Card */}
          <div className="border border-[#D8DCD9] bg-[#F7F8F7] p-3 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#111111] text-white font-semibold flex items-center justify-center text-xs">
                {staffUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-xs text-[#111111] truncate">
                  {staffUser.name}
                </div>
                <div className="text-[10px] font-medium text-[#66706B] uppercase tracking-wider">
                  {staffUser.clinic}
                </div>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="pt-2 border-t border-[#E5E7E6] flex items-center justify-between text-[10px]">
              <span className="font-medium text-[#66706B]">Role:</span>
              <div className="flex gap-1">
                {(['Receptionist', 'Doctor', 'Admin'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setStaffRole(r)}
                    className={`px-1.5 py-0.5 border text-[9px] font-semibold transition-all cursor-pointer ${
                      staffUser.role === r
                        ? 'bg-[#087F6C] text-white border-[#087F6C]'
                        : 'bg-white text-[#66706B] border-[#D8DCD9] hover:border-[#111111]'
                    }`}
                  >
                    {r.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-medium">
            {navItems.map((item) => {
              const isActive = staffScreen === item.screen;
              return (
                <button
                  key={item.screen}
                  onClick={() => setStaffScreen(item.screen)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#E7F5F1] text-[#087F6C] border-[#99D5C8] font-semibold shadow-xs'
                      : 'bg-transparent text-[#66706B] border-transparent hover:bg-[#F0F2F1] hover:text-[#111111]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.screen === 'S03_APPOINTMENTS' && arrivedCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 bg-[#087F6C] text-white text-[9px] font-bold">
                      {arrivedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#E5E7E6] space-y-1">
          <button
            onClick={() => setActiveShell('PATIENT')}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-2 hover:bg-[#F0F2F1] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            <span>Patient View</span>
          </button>
          <button
            onClick={() => setStaffScreen('S01_SIGN_IN')}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-[#C53030] hover:bg-[#FDF2F2] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
