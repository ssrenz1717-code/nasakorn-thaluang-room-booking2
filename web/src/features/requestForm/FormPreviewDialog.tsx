import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { RequestFormSheet, type RequestFormData } from './RequestFormSheet';
import { ScaledSheet } from './ScaledSheet';

/** ดูแบบฟอร์มที่กำลังกรอกก่อนกดส่ง — หน้าตาเดียวกับที่จะพิมพ์ */
export function FormPreviewDialog({ data, roomCode, roomName, onClose }: {
  data: RequestFormData;
  roomCode: string;
  roomName?: string | undefined;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; trigger?.focus(); };
  }, [onClose]);

  return createPortal(
    <div className="no-print fixed inset-0 z-50 grid place-items-center bg-ink/50 p-2 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="form-preview-title" className="flex max-h-full w-full max-w-[880px] flex-col overflow-hidden rounded-card bg-surface shadow-overlay motion-safe:animate-[rise_220ms_var(--ease-out)_both]">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="form-preview-title" className="font-semibold text-ink">ตัวอย่างแบบคำขอ</h2>
            <p className="text-sm text-ink-muted">ยังไม่ได้ยื่น — กดส่งคำขอแล้วจะพิมพ์ได้จากรายการจองของฉัน</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="ปิดตัวอย่าง" className="grid size-10 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft hover:text-ink">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto bg-surface-sunken p-2 sm:p-5">
          <ScaledSheet>
            <RequestFormSheet data={data} roomCode={roomCode} roomName={roomName} className="shadow-raised" />
          </ScaledSheet>
        </div>
      </section>
    </div>,
    document.body,
  );
}
