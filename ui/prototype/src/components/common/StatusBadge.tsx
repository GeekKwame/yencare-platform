import React from 'react';
import { AppointmentStatus } from '../../types/clinic';

export type ExtendedStatus = AppointmentStatus | 'AVAILABLE' | 'FULL' | 'PENDING' | 'WALK_IN';

interface StatusBadgeProps {
  status: ExtendedStatus;
  token?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, token, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-1 text-xs gap-1.5';

  const config: Record<
    ExtendedStatus,
    { label: string; icon: string; bg: string; text: string; border: string; dotColor?: string }
  > = {
    BOOKED: {
      label: 'Booked',
      icon: 'calendar_today',
      bg: 'bg-[#F0F2F1]',
      text: 'text-[#3D4541]',
      border: 'border-[#D8DCD9]',
      dotColor: 'bg-[#66706B]',
    },
    CHECKED_IN: {
      label: 'Checked In',
      icon: 'how_to_reg',
      bg: 'bg-[#E7F5F1]',
      text: 'text-[#087F6C]',
      border: 'border-[#99D5C8]',
      dotColor: 'bg-[#087F6C]',
    },
    WAITING: {
      label: token ? `Waiting (${token})` : 'Waiting in Queue',
      icon: 'schedule',
      bg: 'bg-[#FEF7ED]',
      text: 'text-[#B7791F]',
      border: 'border-[#FCD34D]',
      dotColor: 'bg-[#B7791F]',
    },
    CALLED: {
      label: 'Called · Ready',
      icon: 'notifications_active',
      bg: 'bg-[#E7F5F1]',
      text: 'text-[#087F6C]',
      border: 'border-[#99D5C8]',
      dotColor: 'bg-[#087F6C]',
    },
    COMPLETED: {
      label: 'Completed',
      icon: 'check_circle',
      bg: 'bg-[#E7F5F1]',
      text: 'text-[#087F6C]',
      border: 'border-[#99D5C8]',
      dotColor: 'bg-[#087F6C]',
    },
    CANCELLED: {
      label: 'Cancelled',
      icon: 'cancel',
      bg: 'bg-[#FDF2F2]',
      text: 'text-[#C53030]',
      border: 'border-[#F8B4B4]',
      dotColor: 'bg-[#C53030]',
    },
    NO_SHOW: {
      label: 'No-Show',
      icon: 'person_off',
      bg: 'bg-[#FFF5EB]',
      text: 'text-[#8B5A2B]',
      border: 'border-[#D4A574]',
      dotColor: 'bg-[#8B5A2B]',
    },
    WALK_IN: {
      label: 'Walk-In',
      icon: 'directions_walk',
      bg: 'bg-[#F3EEFF]',
      text: 'text-[#5B21B6]',
      border: 'border-[#C4B5FD]',
      dotColor: 'bg-[#5B21B6]',
    },
    AVAILABLE: {
      label: 'Available',
      icon: 'radio_button_unchecked',
      bg: 'bg-[#E7F5F1]',
      text: 'text-[#087F6C]',
      border: 'border-[#99D5C8]',
      dotColor: 'bg-[#087F6C]',
    },
    FULL: {
      label: 'Fully Booked',
      icon: 'block',
      bg: 'bg-[#F0F2F1]',
      text: 'text-[#66706B]',
      border: 'border-[#D8DCD9]',
      dotColor: 'bg-[#8A948F]',
    },
    PENDING: {
      label: 'Pending',
      icon: 'hourglass_empty',
      bg: 'bg-[#FEF7ED]',
      text: 'text-[#B7791F]',
      border: 'border-[#FCD34D]',
      dotColor: 'bg-[#B7791F]',
    },
  };

  const current = config[status] || config.BOOKED;

  return (
    <span
      className={`inline-flex items-center font-medium tracking-wide border select-none ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}
    >
      {current.dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotColor}`}></span>
      )}
      <span className="material-symbols-outlined text-[13px] leading-none shrink-0" aria-hidden="true">
        {current.icon}
      </span>
      <span>{current.label}</span>
    </span>
  );
};
