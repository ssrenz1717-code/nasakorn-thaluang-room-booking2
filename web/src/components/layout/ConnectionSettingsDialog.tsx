import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { CircleCheck, ExternalLink, Info, Settings, X } from 'lucide-react';
import {
  clearConnectionSettings, extractConnectionId, readConnectionSettings, saveConnectionSettings,
  validateConnectionField, type ConnectionField,
} from '../../lib/connectionSettings';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

const FIELDS: { field: ConnectionField; label: string; placeholder: string; help: string; idLabel: string }[] = [
  {
    field: 'endpointUrl',
    label: 'Google Apps Script Web App URL (Endpoint)',
    placeholder: 'https://script.google.com/macros/s/AKfycb.../exec',
    help: 'นำ URL ที่ได้จากการกด "การทำให้ใช้งานได้" (Deploy as Web App) ใน Apps Script ของ Google Sheets มาวางที่นี่',
    idLabel: 'รหัส Web App',
  },
  {
    field: 'sheetUrl',
    label: 'ลิงก์ Google Sheets (ฐานข้อมูล)',
    placeholder: 'https://docs.google.com/spreadsheets/d/.../edit',
    help: 'เปิดชีตที่ใช้เก็บข้อมูลการจอง แล้วคัดลอกลิงก์จากแถบที่อยู่ของเบราว์เซอร์',
    idLabel: 'รหัสชีต',
  },
  {
    field: 'driveUrl',
    label: 'ลิงก์โฟลเดอร์ Google Drive (เก็บไฟล์)',
    placeholder: 'https://drive.google.com/drive/folders/...',
    help: 'โฟลเดอร์สำหรับเก็บไฟล์แนบและแบบฟอร์ม — คลิกขวาที่โฟลเดอร์ > แชร์ > คัดลอกลิงก์',
    idLabel: 'รหัสโฟลเดอร์',
  },
];

type Values = Record<ConnectionField, string>;

/**
 * หน้าต่างตั้งค่าลิงก์เชื่อมต่อ Google (เฉพาะผู้ดูแลระบบ)
 * ตอนนี้แค่บันทึกไว้ — การเชื่อมจริงจะทำภายหลัง ระบบจึงยังทำงานด้วยข้อมูลในเบราว์เซอร์ตามเดิม
 */
export function ConnectionSettingsDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [saved, setSaved] = useState(readConnectionSettings);
  const [values, setValues] = useState<Values>({ endpointUrl: saved.endpointUrl, sheetUrl: saved.sheetUrl, driveUrl: saved.driveUrl });
  // แสดงข้อผิดพลาดหลังออกจากช่อง หรือหลังกดบันทึก — ไม่เตือนแดงระหว่างที่ยังพิมพ์/วางไม่เสร็จ
  const [touched, setTouched] = useState<Record<ConnectionField, boolean>>({ endpointUrl: false, sheetUrl: false, driveUrl: false });

  const errors = Object.fromEntries(FIELDS.map(({ field }) => [field, validateConnectionField(field, values[field])])) as Values;
  const hasError = FIELDS.some(({ field }) => errors[field] !== '');
  const dirty = FIELDS.some(({ field }) => values[field].trim() !== saved[field]);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab' || panelRef.current === null) return;
    // วนโฟกัสอยู่ในหน้าต่าง ไม่หลุดไปปุ่มด้านหลัง
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const save = () => {
    setTouched({ endpointUrl: true, sheetUrl: true, driveUrl: true });
    if (hasError) return;
    setSaved(saveConnectionSettings(values));
    toast.success('บันทึกลิงก์การเชื่อมต่อแล้ว');
    onClose();
  };

  const clear = () => {
    clearConnectionSettings();
    setSaved(readConnectionSettings());
    setValues({ endpointUrl: '', sheetUrl: '', driveUrl: '' });
    setTouched({ endpointUrl: false, sheetUrl: false, driveUrl: false });
    toast.info('ล้างลิงก์การเชื่อมต่อแล้ว');
  };

  const savedAtText = saved.savedAt
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(saved.savedAt))
    : '';

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-ink/40 sm:place-items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={onKeyDown}>
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-overlay motion-safe:animate-[rise_220ms_var(--ease-out)_both] sm:max-w-2xl sm:rounded-card"
      >
        <header className="flex items-center gap-3 bg-panel px-5 py-5 text-ink-inverse sm:px-7">
          <Settings className="size-6 shrink-0 text-gold" aria-hidden="true" />
          <h2 id={titleId} className="flex-1 text-lg font-semibold sm:text-xl">การตั้งค่าเชื่อมต่อระบบ &amp; API</h2>
          <button type="button" onClick={onClose} aria-label="ปิดหน้าต่าง" className="grid size-10 shrink-0 place-items-center rounded-control text-ink-inverse/75 transition-colors hover:bg-ink-inverse/10 hover:text-ink-inverse focus-visible:outline-2 focus-visible:outline-gold">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
          <p className="flex gap-2.5 rounded-control bg-surface-sunken p-3 text-sm text-ink-muted ring-1 ring-inset ring-line">
            <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>ใส่ลิงก์เก็บไว้ก่อน ระบบยังไม่เชื่อมต่อจนกว่าจะตั้งค่าเชื่อมในขั้นถัดไป ระหว่างนี้ข้อมูลการจองยังเก็บในเบราว์เซอร์เหมือนเดิม</span>
          </p>

          {FIELDS.map(({ field, label, placeholder, help, idLabel }) => {
            const inputId = `connection-${field}`;
            const error = touched[field] ? errors[field] : '';
            const detected = errors[field] === '' ? extractConnectionId(field, values[field]) : '';
            return (
              <div key={field}>
                <label htmlFor={inputId} className="mb-2 block text-[15px] font-semibold text-ink">{label}</label>
                <input
                  id={inputId}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={values[field]}
                  placeholder={placeholder}
                  onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
                  onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
                  aria-invalid={error !== ''}
                  aria-describedby={`${inputId}-help`}
                  className={cn(
                    'min-h-12 w-full rounded-control border bg-surface px-4 font-mono text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-subtle focus:ring-2',
                    error ? 'border-danger focus:ring-danger/20' : 'border-line-strong focus:border-brand focus:ring-brand/20',
                  )}
                />
                <p id={`${inputId}-help`} className={cn('mt-2 text-sm', error ? 'font-medium text-danger' : 'text-ink-muted')}>
                  {error || help}
                </p>
                {detected && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ok">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <CircleCheck className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{idLabel}: <span className="font-mono">{detected}</span></span>
                    </span>
                    <a href={values[field].trim()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 font-medium text-brand hover:underline">
                      เปิดลิงก์<ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (เปิดแท็บใหม่)</span>
                    </a>
                  </p>
                )}
              </div>
            );
          })}

          <p className="text-xs text-ink-subtle">
            ลิงก์เหล่านี้บันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น{savedAtText && ` · บันทึกล่าสุด ${savedAtText}`}
          </p>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-7 sm:pb-4">
          <Button variant="ghost" onClick={clear} disabled={!saved.savedAt && !FIELDS.some(({ field }) => values[field] !== '')}>ล้างค่าทั้งหมด</Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={save} disabled={!dirty}>บันทึก</Button>
        </footer>
      </section>
    </div>
  );
}
