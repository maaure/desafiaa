import { writable } from "svelte/store";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const toasts = writable<Toast[]>([]);

const DURATION_MS = 4000;
let nextId = 1;

function push(kind: ToastKind, message: string) {
  const id = nextId++;
  toasts.update((list) => [...list, { id, kind, message }]);
  setTimeout(() => dismiss(id), DURATION_MS);
}

function dismiss(id: number) {
  toasts.update((list) => list.filter((t) => t.id !== id));
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
  dismiss,
};

export { toasts };
