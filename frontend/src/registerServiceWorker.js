import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the YɛnCare Service Worker for PWA offline caching and background synchronization.
 */
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.info('[PWA] New YɛnCare version available; ready to reload.');
      },
      onOfflineReady() {
        console.info('[PWA] YɛnCare is now cached for offline access.');
      },
      onRegistered(registration) {
        console.info('[PWA] Service Worker registered:', registration);
      },
      onRegisterError(error) {
        console.warn('[PWA] Service Worker registration failed:', error);
      },
    });

    return updateSW;
  }
}

