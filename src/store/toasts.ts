import { create } from 'zustand';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  action?: { label: string; run: () => void };
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastStore>()((set) => ({
  toasts: [],
  push: (toast) => set((s) => ({ toasts: [{ ...toast, id: nextId++ }, ...s.toasts].slice(0, 3) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (t: Omit<Toast, 'id'>) => useToasts.getState().push(t);
