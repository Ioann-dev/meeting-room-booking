'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// A white/near-white surface with a small colored icon chip, not a fully
// tinted background block -- reads as one restrained, premium notification
// style rather than three differently-colored candy tiles.
const ICON_CHIP_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-success-tint text-success',
  error: 'bg-danger-tint text-danger',
  info: 'bg-info-tint text-info',
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
        <path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (variant === 'error') {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
        <path
          d="M8 4.5v4M8 11.2v.1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <path d="M8 7.2v4M8 4.7v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

const TOAST_DURATION_MS = 5000;

/**
 * Mounted once in the authenticated shell (not per-page) so every screen
 * below it -- booking confirmation, cancellation, and any future flow --
 * can call useToast() without its own provider or layout changes.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++idRef.current;
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-[22rem] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            // A one-time entrance animation (fade + small upward settle),
            // not an exit one -- Radix's Presence (Dialog/Popover) can
            // delay unmounting for a real close animation, but these are
            // plain divs on a timer with no such primitive underneath, and
            // building that coordination solely for a toast's exit isn't
            // worth the added lifecycle complexity.
            className="flex items-start gap-2.5 rounded-md border border-border bg-surface px-3.5 py-3 text-sm text-ink shadow-lg animate-[premium-toast-in_220ms_var(--ease-premium)]"
          >
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                ICON_CHIP_CLASSES[toast.variant],
              )}
            >
              <ToastIcon variant={toast.variant} />
            </span>
            <p className="min-w-0 pt-0.5">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
