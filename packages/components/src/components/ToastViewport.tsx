import { useEffect, useSyncExternalStore } from 'react';
import { dismissToast, getToasts, subscribeToasts, type Toast } from './toast-store.js';

const KIND_ICON: Record<Toast['kind'], string> = {
  info: 'ⓘ',
  success: '✓',
  error: '⚠',
};

function ToastCard({ toast }: { toast: Toast }) {
  useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration]);

  return (
    <div className={`sd-toast sd-toast--${toast.kind}`} role="status" aria-live="polite">
      <span className="sd-toast__icon" aria-hidden="true">
        {KIND_ICON[toast.kind]}
      </span>
      <div className="sd-toast__body">
        <strong className="sd-toast__title">{toast.title}</strong>
        {toast.message ? <span className="sd-toast__message">{toast.message}</span> : null}
        {toast.href ? (
          <a className="sd-toast__link" href={toast.href} target="_blank" rel="noreferrer">
            {toast.hrefLabel ?? 'View'}
          </a>
        ) : null}
      </div>
      <button
        type="button"
        className="sd-toast__close"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Renders active toasts from the shared store. Mount once near the app root.
 * Reads the store via `useSyncExternalStore`, so any `pushToast(...)` anywhere
 * updates it.
 */
export function ToastViewport() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (toasts.length === 0) return null;
  return (
    <div className="sd-toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
