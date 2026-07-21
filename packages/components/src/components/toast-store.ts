/**
 * A minimal, dependency-free toast store shared across the app. It is a
 * module-level singleton exposing an external store (compatible with React's
 * `useSyncExternalStore`) so any component can `pushToast(...)` and a single
 * `ToastViewport` renders them. Kept framework-agnostic on purpose.
 */

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  /** Optional link (e.g. a block-explorer transaction URL). */
  href?: string;
  hrefLabel?: string;
  /** Auto-dismiss delay in ms; `0` keeps it until dismissed. */
  duration: number;
}

export interface ToastInput {
  kind?: ToastKind;
  title: string;
  message?: string;
  href?: string;
  hrefLabel?: string;
  duration?: number;
  /** Replace an existing toast with the same id (e.g. tx submitted → confirmed). */
  id?: string;
}

const DEFAULT_DURATION: Record<ToastKind, number> = {
  info: 6000,
  success: 6000,
  error: 10000,
};

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let counter = 0;

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): Toast[] {
  return toasts;
}

/** Push (or replace, when `id` is provided) a toast. Returns its id. */
export function pushToast(input: ToastInput): string {
  const kind = input.kind ?? 'info';
  const id = input.id ?? `toast-${++counter}`;
  const toast: Toast = {
    id,
    kind,
    title: input.title,
    ...(input.message !== undefined ? { message: input.message } : {}),
    ...(input.href !== undefined ? { href: input.href } : {}),
    ...(input.hrefLabel !== undefined ? { hrefLabel: input.hrefLabel } : {}),
    duration: input.duration ?? DEFAULT_DURATION[kind],
  };
  const existing = toasts.findIndex((t) => t.id === id);
  toasts = existing >= 0 ? toasts.map((t) => (t.id === id ? toast : t)) : [...toasts, toast];
  emit();
  return id;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function clearToasts(): void {
  toasts = [];
  emit();
}
