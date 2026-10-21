import { useCallback, useRef, useState, type ReactNode } from "react";
import { ToastContext } from "./useToast";

//a success message bottom-right that clears itself, so an action never finishes in silence
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((text: string) => {
    clearTimeout(timer.current); //a newer message replaces the old one and restarts the clock
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50">
        {message && (
          <p className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">✓ {message}</p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
