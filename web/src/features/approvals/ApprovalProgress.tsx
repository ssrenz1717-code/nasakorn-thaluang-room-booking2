import { Check, X } from 'lucide-react';
import { APPROVAL_STEPS, currentApprovalStep, type ApprovalEntry } from '@shared/domain/approval';
import { cn } from '../../lib/cn';

const signedDate = (iso: string) =>
  new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).format(new Date(iso));

/** ระยะห่างระหว่างขั้นตอนแอนิเมชันตอนเปิด: วงกลมขั้นที่ 1 → เส้น → วงกลมขั้นที่ 2 → ... */
const STEP_MS = 450;

/**
 * แถบความคืบหน้าการอนุมัติ 3 ขั้น: ใครลงนามแล้ว (เมื่อไร) และตอนนี้รอใคร
 * แสดงเฉพาะรายการที่ต้องผ่านการอนุมัติ — รายการที่ระบบยืนยันทันที (ปิดระบบอนุมัติ) ไม่มีแถบนี้
 */
export function ApprovalProgress({
  booking, className,
}: {
  booking: { status: string; approvalStep?: number; approvalLog?: ApprovalEntry[] };
  className?: string;
}) {
  const log = booking.approvalLog ?? [];
  const waiting = currentApprovalStep(booking);
  if (waiting === 0 && log.length === 0) return null;

  return (
    <ol aria-label="ขั้นตอนการอนุมัติ" className={cn('grid grid-cols-3 gap-2', className)}>
      {APPROVAL_STEPS.map((step, index) => {
        const entry = log.find((item) => item.step === step.step);
        const state = entry ? (entry.decision === 'approve' ? 'done' : 'rejected') : waiting === step.step ? 'current' : 'todo';
        const stateText = { done: 'ผ่านแล้ว', rejected: 'ไม่อนุมัติ', current: 'กำลังรอ', todo: 'ยังไม่ถึง' }[state];
        return (
          <li key={step.step} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                style={{ animationDelay: `${index * STEP_MS}ms` }}
                className={cn(
                  'step-pop grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  state === 'done' && 'bg-ok text-ink-inverse',
                  state === 'rejected' && 'bg-danger text-ink-inverse',
                  state === 'current' && 'bg-warn-soft text-warn ring-2 ring-warn',
                  state === 'todo' && 'bg-surface-sunken text-ink-subtle ring-1 ring-line',
                )}
              >
                {state === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : state === 'rejected' ? <X className="size-3.5" strokeWidth={3} /> : step.step}
              </span>
              <span aria-hidden="true" className="h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                {/* เส้นเขียววิ่งจากซ้ายไปขวาหลังวงกลมขั้นนั้นโผล่ ทีละขั้นจนครบ */}
                {state === 'done' && (
                  <span className="grow-x-step block h-full origin-left bg-ok" style={{ animationDelay: `${index * STEP_MS + 150}ms` }} />
                )}
              </span>
            </div>
            <p className={cn('mt-1 text-xs font-medium', state === 'todo' ? 'text-ink-subtle' : 'text-ink')}>
              {step.action}
              <span className="sr-only">: {stateText}</span>
            </p>
            {entry ? (
              <p className="truncate text-[11px] leading-tight text-ink-muted" title={entry.name}>
                {entry.name}
                <br />
                {signedDate(entry.at)}
              </p>
            ) : (
              state === 'current' && <p className="text-[11px] leading-tight text-warn">{step.waiting}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
