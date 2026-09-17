import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdCheckCircle, MdClose, MdErrorOutline, MdInfoOutline } from "react-icons/md";
import { ToastContext } from "./toastContext";

const DEFAULT_DURATION = 4000;

const TONES = {
  success: { Icon: MdCheckCircle, dot: "bg-accent" },
  error: { Icon: MdErrorOutline, dot: "bg-error" },
  info: { Icon: MdInfoOutline, dot: "bg-text-subtle" },
};

/**
 * Toast — a single dark notification bar.
 * Ports ui/prototype/src/components/common/Toast.tsx to JSX.
 *
 * Usually rendered for you by `<ToastProvider>`; exported for one-off use.
 * Renders nothing when `message` is empty.
 *
 * @param {object} props
 * @param {string|null} props.message                 Notification text.
 * @param {'success'|'error'|'info'} [props.tone='success']
 * @param {() => void} [props.onClose]                When set, renders a dismiss button.
 * @param {string} [props.className='']               Appended last.
 * @returns {JSX.Element|null}
 */
export function Toast({ message, tone = "success", onClose, className = "" }) {
  if (!message) return null;

  const { Icon, dot } = TONES[tone] || TONES.info;

  return (
    <div
      className={`flex items-center justify-between gap-4 border border-inverse-border bg-primary px-4 py-3 text-white shadow-xl ${className}`}
    >
      <div className="flex items-center gap-2.5 text-xs font-medium tracking-wide">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        <Icon size={16} className="shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer p-1 text-text-subtle hover:text-white"
          aria-label="Close notification"
        >
          <MdClose size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * ToastProvider — mount once at the app root; `useToast()` then works at any depth.
 *
 * Renders a fixed bottom bar with `role="status"` and `aria-live="polite"` so
 * screen readers announce every toast. Toasts stack newest-last and auto-dismiss.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.duration=4000]  Default auto-dismiss in ms. `0` disables auto-dismiss.
 * @param {number} [props.max=3]          Maximum simultaneous toasts; oldest is dropped past this.
 * @returns {JSX.Element}
 */
export function ToastProvider({ children, duration = DEFAULT_DURATION, max = 3 }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const clearTimer = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id) => {
      clearTimer(id);
      setToasts((current) => current.filter((item) => item.id !== id));
    },
    [clearTimer],
  );

  const dismissAll = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      if (!message) return "";

      counter.current += 1;
      const id = `toast-${counter.current}`;
      const tone = options.tone && TONES[options.tone] ? options.tone : "info";
      const life = options.duration ?? duration;

      setToasts((current) => {
        const next = [...current, { id, message, tone, duration: life }];
        const overflow = next.length - max;
        if (overflow > 0) {
          next.splice(0, overflow).forEach((dropped) => clearTimer(dropped.id));
        }
        return next;
      });

      if (life > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => {
            timers.current.delete(id);
            setToasts((current) => current.filter((item) => item.id !== id));
          }, life),
        );
      }

      return id;
    },
    [clearTimer, duration, max],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toast,
      success: (message, options) => toast(message, { ...options, tone: "success" }),
      error: (message, options) => toast(message, { ...options, tone: "error" }),
      info: (message, options) => toast(message, { ...options, tone: "info" }),
      dismiss,
      dismissAll,
      toasts,
    }),
    [toast, dismiss, dismissAll, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((item) => (
          <Toast
            key={item.id}
            message={item.message}
            tone={item.tone}
            onClose={() => dismiss(item.id)}
            className="pointer-events-auto w-full max-w-md"
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
