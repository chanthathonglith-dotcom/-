export type ToastVariant = 'loading' | 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs: number;
  createdAt: number;
}

export interface CreateToastInput {
  id?: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
  now?: number;
}

export const MAX_VISIBLE_TOASTS = 4;

export const DEFAULT_TOAST_DURATIONS: Record<ToastVariant, number> = {
  loading: 0,
  success: 4000,
  info: 4000,
  error: 6000,
};

export function createToastId(now: number = Date.now()): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `toast-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `toast-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createToastItem(input: CreateToastInput): ToastItem {
  const now = input.now ?? Date.now();
  return {
    id: input.id || createToastId(now),
    variant: input.variant,
    title: input.title,
    description: input.description,
    durationMs:
      typeof input.durationMs === 'number'
        ? input.durationMs
        : DEFAULT_TOAST_DURATIONS[input.variant],
    createdAt: now,
  };
}

export function upsertToast(
  list: ToastItem[],
  nextToast: ToastItem,
  maxVisible: number = MAX_VISIBLE_TOASTS
): ToastItem[] {
  const existingIndex = list.findIndex((item) => item.id === nextToast.id);
  if (existingIndex !== -1) {
    const updated = [...list];
    updated[existingIndex] = nextToast;
    return updated;
  }

  const combined = [...list, nextToast];
  if (combined.length <= maxVisible) {
    return combined;
  }
  return combined.slice(combined.length - maxVisible);
}

export function dismissToast(list: ToastItem[], id: string): ToastItem[] {
  return list.filter((item) => item.id !== id);
}
