/*
 * Toasts.
 *
 * One stack, bottom-right, auto-dismissing. Mutations confirm themselves here
 * rather than each screen inventing its own success banner.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const COLORS = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  info: 'var(--color-brand)',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clear pending timers if the provider unmounts, or they fire against a
  // component that no longer exists.
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  const push = useCallback(
    (message, tone = 'success', { duration } = {}) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, tone }]);
      // Errors stay longer: they are worth reading, and often worth copying.
      const ms = duration ?? (tone === 'error' ? 7000 : 3500);
      timers.current.set(id, setTimeout(() => dismiss(id), ms));
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (m, o) => push(m, 'success', o),
      error: (m, o) => push(m, 'error', o),
      info: (m, o) => push(m, 'info', o),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map(({ id, message, tone }) => {
          const Icon = ICONS[tone] ?? Info;
          return (
            <div
              key={id}
              role={tone === 'error' ? 'alert' : 'status'}
              className="card pointer-events-auto flex items-start gap-2.5 p-3"
              style={{ boxShadow: 'var(--shadow-pop)' }}
            >
              <Icon
                className="mt-px size-4 shrink-0"
                style={{ color: COLORS[tone] }}
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 text-[13px] text-strong">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 text-muted transition hover:bg-[var(--surface-hover)]"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
