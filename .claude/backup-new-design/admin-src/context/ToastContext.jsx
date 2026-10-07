import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONES = {
  success: 'text-primary',
  error: 'text-danger',
  info: 'text-info',
};

/** One app-wide toast system: success / error / info, with an optional action. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message, { action, duration = type === 'error' ? 6000 : 3500 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-3), { id, type, message, action }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m || 'Something went wrong. Please try again.', o),
      info: (m, o) => push('info', m, o),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6"
          aria-live="polite"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <div
                key={t.id}
                role={t.type === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-surface px-4 py-3 shadow-pop ring-1 ring-line animate-toast-in"
              >
                <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${TONES[t.type]}`} aria-hidden />
                <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action.onClick();
                      dismiss(t.id);
                    }}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
                <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-faint hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
