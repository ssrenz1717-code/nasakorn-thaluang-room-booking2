import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * หน้าต่างซ้อน: มือถือเลื่อนขึ้นจากด้านล่าง จอใหญ่อยู่กลางจอ
 * Escape / คลิกพื้นหลังเพื่อปิด, โฟกัสกลับไปที่ปุ่มที่เปิดเมื่อปิด
 */
export function Dialog({
  title, description, onClose, children, footer, labelId,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  labelId: string;
}) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('input:not([disabled]), select, textarea, button[data-autofocus]')?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); trigger?.focus(); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 grid items-end bg-ink/40 sm:place-items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={labelId} className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-surface shadow-overlay motion-safe:animate-[rise_220ms_var(--ease-out)_both] sm:max-w-lg sm:rounded-card">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={labelId} className="text-lg font-semibold text-ink">{title}</h2>
            {description !== undefined && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-10 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft hover:text-ink">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer !== undefined && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</footer>
        )}
      </section>
    </div>,
    document.body,
  );
}
