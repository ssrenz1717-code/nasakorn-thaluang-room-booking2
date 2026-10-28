import type { ReactNode } from 'react';
import { CheckCircle2, CircleSlash, Clock, XCircle, CircleCheck } from 'lucide-react';
import { BOOKING_STATUS_LABEL_TH, type BookingStatus } from '@shared/domain/status';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-ink-muted ring-line',
  brand: 'bg-brand-soft text-brand ring-brand-border',
  ok: 'bg-ok-soft text-ok ring-ok-border',
  warn: 'bg-warn-soft text-warn ring-warn-border',
  danger: 'bg-danger-soft text-danger ring-danger-border',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {icon !== undefined && (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * ป้ายสถานะการจอง
 *
 * ทุกสถานะมีทั้งไอคอนและข้อความไทย ไม่ใช้สีสื่อความหมายเพียงอย่างเดียว
 * เพราะผู้ใช้ที่ตาบอดสีจะแยกเขียวกับแดงไม่ออก
 */
const STATUS_STYLE: Record<BookingStatus, { tone: Tone; icon: ReactNode }> = {
  pending: { tone: 'warn', icon: <Clock className="size-3.5" /> },
  confirmed: { tone: 'ok', icon: <CheckCircle2 className="size-3.5" /> },
  rejected: { tone: 'danger', icon: <XCircle className="size-3.5" /> },
  cancelled: { tone: 'neutral', icon: <CircleSlash className="size-3.5" /> },
  completed: { tone: 'brand', icon: <CircleCheck className="size-3.5" /> },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <Badge tone={style.tone} icon={style.icon}>
      {BOOKING_STATUS_LABEL_TH[status]}
    </Badge>
  );
}
