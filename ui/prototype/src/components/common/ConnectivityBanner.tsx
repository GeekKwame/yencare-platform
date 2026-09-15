import React from 'react';
import { ConnectivityState } from '../../types/clinic';

interface ConnectivityBannerProps {
  state: ConnectivityState;
}

export const ConnectivityBanner: React.FC<ConnectivityBannerProps> = ({ state }) => {
  if (state === 'online') return null;

  const config: Record<Exclude<ConnectivityState, 'online'>, {
    icon: string;
    message: string;
    className: string;
  }> = {
    poor: {
      icon: 'signal_wifi_statusbar_connected_no_internet_4',
      message: 'Poor connection. Some features may load slowly.',
      className: 'connectivity-bar connectivity-poor',
    },
    offline: {
      icon: 'wifi_off',
      message: 'You are offline. Your appointment details are still available below.',
      className: 'connectivity-bar connectivity-offline',
    },
    restored: {
      icon: 'wifi',
      message: 'Connection restored. Your data is up to date.',
      className: 'connectivity-bar connectivity-restored',
    },
  };

  const current = config[state];

  return (
    <div className={current.className}>
      <span className="material-symbols-outlined text-[16px] shrink-0">{current.icon}</span>
      <span className="text-xs font-medium">{current.message}</span>
    </div>
  );
};
