import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

type ToastTone = 'ok' | 'danger' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLE: Record<ToastTone, { box: string; icon: ReactNode }> = {
  ok: { box: 'bg-ok text-ink-inverse', icon: <CheckCircle2 className="size-5" /> },
  danger: { box: 'bg-danger text-ink-inverse', icon: <XCircle className="size-5" /> },
  info: { box: 'bg-ink text-ink-inverse', icon: <Info className="size-5" /> },
};

const DISMISS_AFTER_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => remove(id), DISMISS_AFTER_MS);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('ok', message),
      error: (message) => push('danger', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/*
        aria-live="polite" ทำให้โปรแกรมอ่านหน้าจออ่านข้อความที่โผล่มา
        โดยไม่ขัดจังหวะสิ่งที่ผู้ใช้กำลังฟังอยู่
      */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[1000] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card px-4 py-3 shadow-overlay',
              'motion-safe:animate-[rise_200ms_var(--ease-out)_both]',
              TONE_STYLE[toast.tone].box,
            )}
          >
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              {TONE_STYLE[toast.tone].icon}
            </span>
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              aria-label="ปิดการแจ้งเตือนนี้"
              className="-m-1 shrink-0 rounded p-1 opacity-80 transition-opacity hover:opacity-100"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (context === null) throw new Error('useToast ต้องอยู่ภายใน ToastProvider');
  return context;
}
