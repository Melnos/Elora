import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => undefined,
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="fixed bottom-[calc(86px+env(safe-area-inset-bottom,0px))] lg:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
        >
          {toasts.map((t) => {
            const Icon =
              t.variant === 'success'
                ? CheckCircle2
                : t.variant === 'error' || t.variant === 'warning'
                  ? AlertCircle
                  : Info;
            return (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto flex items-start gap-2.5 p-3 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-lg text-xs text-[var(--color-text-main)] animate-fadeIn"
              >
                <Icon
                  size={16}
                  className={`shrink-0 mt-0.5 ${
                    t.variant === 'error'
                      ? 'text-[var(--color-danger)]'
                      : t.variant === 'success'
                        ? 'text-[var(--color-emerald)]'
                        : 'text-[var(--color-accent)]'
                  }`}
                />
                <span className="flex-1 min-w-0 break-words leading-snug">{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Fermer la notification"
                  className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] shrink-0 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
};
