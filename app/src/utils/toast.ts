export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

type Listener = (toast: ToastMessage) => void;

let nextId = 1;
const listeners = new Set<Listener>();

function show(type: ToastType, title: string, message?: string) {
  const entry: ToastMessage = { id: nextId++, type, title, message };
  listeners.forEach((listener) => listener(entry));
}

/**
 * App-wide notifications, rendered by <ToastHost /> at the root of the app.
 * Unlike Alert.alert this also works on web (react-native-web stubs Alert as
 * a no-op) and survives navigator changes such as signing in or out.
 */
export const toast = {
  success: (title: string, message?: string) => show("success", title, message),
  error: (title: string, message?: string) => show("error", title, message),
  info: (title: string, message?: string) => show("info", title, message),
};

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
