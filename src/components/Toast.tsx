'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';

type Toast = { id: number; message: string; kind: 'success' | 'error' };
const ToastContext = createContext<(message: string, kind?: Toast['kind']) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast toast-center toast-top z-[100] pt-4" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert animate-rise shadow-lg ${t.kind === 'error' ? 'alert-error' : 'bg-neutral text-neutral-content border-0'}`}
          >
            {t.kind === 'error' ? <CircleAlert className="size-5" /> : <CircleCheck className="size-5 text-success" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
