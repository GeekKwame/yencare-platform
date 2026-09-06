import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { SmsMessage } from '../../types/clinic';

interface SmsModalProps {
  appointmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SmsModal: React.FC<SmsModalProps> = ({ appointmentId, isOpen, onClose }) => {
  const { getSmsForAppointment } = useClinic();
  const messages = getSmsForAppointment(appointmentId);

  if (!isOpen) return null;

  const typeLabels: Record<string, string> = {
    confirmation: 'Confirmation',
    reminder: 'Reminder',
    'time-changed': 'Time Changed',
    cancelled: 'Cancelled',
    called: 'Called',
    next: 'You Are Next',
    'walk-in-confirmation': 'Walk-In Confirmed',
  };

  const typeIcons: Record<string, string> = {
    confirmation: 'check_circle',
    reminder: 'alarm',
    'time-changed': 'update',
    cancelled: 'cancel',
    called: 'notifications_active',
    next: 'priority_high',
    'walk-in-confirmation': 'directions_walk',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[440px] bg-white border border-[#D8DCD9] shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7E6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#E7F5F1] text-[#087F6C] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">sms</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111111]">Simulated SMS Messages</h2>
              <p className="text-[10px] text-[#66706B] font-medium uppercase tracking-wider">
                Prototype · Not Real SMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-[#D8DCD9] hover:bg-[#F0F2F1] text-[#66706B] hover:text-[#111111] cursor-pointer transition-colors"
            aria-label="Close SMS viewer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#66706B]">
              <span className="material-symbols-outlined text-3xl text-[#D8DCD9] block mb-2">sms</span>
              No simulated messages for this appointment yet.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="border border-[#D8DCD9] bg-[#F7F8F7]">
                {/* Message header */}
                <div className="px-3.5 py-2 bg-[#F0F2F1] border-b border-[#E5E7E6] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#111111]">
                    <span className="material-symbols-outlined text-[14px] text-[#087F6C]">
                      {typeIcons[msg.type] || 'sms'}
                    </span>
                    <span>{typeLabels[msg.type] || msg.type}</span>
                  </div>
                  <span className="text-[10px] text-[#8A948F] font-mono">{msg.timestamp}</span>
                </div>
                {/* Message body */}
                <div className="px-3.5 py-3 text-xs text-[#111111] font-mono leading-relaxed whitespace-pre-line">
                  {msg.body}
                </div>
                <div className="px-3.5 py-2 border-t border-[#E5E7E6] text-[10px] text-[#8A948F] flex items-center gap-1.5">
                  <span>📱</span>
                  <span>To: {msg.phone}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E7E6] bg-[#F7F8F7] text-[10px] text-[#8A948F] text-center">
          These are simulated messages for prototype demonstration only.
        </div>
      </div>
    </div>
  );
};
