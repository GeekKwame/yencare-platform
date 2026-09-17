import { createContext, useContext } from "react";

/**
 * Context carrying the toast API produced by `<ToastProvider>`.
 * Kept in its own module so Toast.jsx only exports components and stays a
 * valid Fast Refresh boundary.
 */
export const ToastContext = createContext(null);

function warnMissingProvider() {
  console.warn("useToast() was called outside <ToastProvider>. The toast was not shown.");
  return "";
}

const NOOP_TOAST = {
  toast: warnMissingProvider,
  success: warnMissingProvider,
  error: warnMissingProvider,
  info: warnMissingProvider,
  dismiss: () => {},
  dismissAll: () => {},
  toasts: [],
};

/**
 * useToast — read the toast API from any depth below `<ToastProvider>`.
 *
 * @returns {{
 *   toast: (message: string, options?: { tone?: 'success'|'error'|'info', duration?: number }) => string,
 *   success: (message: string, options?: { duration?: number }) => string,
 *   error: (message: string, options?: { duration?: number }) => string,
 *   info: (message: string, options?: { duration?: number }) => string,
 *   dismiss: (id: string) => void,
 *   dismissAll: () => void,
 *   toasts: Array<{ id: string, message: string, tone: string, duration: number }>,
 * }}
 *   Every creator returns the new toast's id, which can be handed to `dismiss`.
 *   `duration` is milliseconds; pass `0` for a toast that never auto-dismisses.
 *
 * Outside a provider this returns no-ops rather than throwing, so a page that
 * has not been wired up yet still renders; calling a creator logs a warning.
 */
export function useToast() {
  return useContext(ToastContext) || NOOP_TOAST;
}
