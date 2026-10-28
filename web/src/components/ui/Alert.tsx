import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

type Tone = 'info' | 'ok' | 'warn' | 'danger';

const TONES: Record<Tone, { box: string; icon: ReactNode }> = {
  info: {
    box: 'bg-brand-soft text-brand ring-brand-border',
    icon: <Info className="size-5" />,
  },
  ok: {
    box: 'bg-ok-soft text-ok ring-ok-border',
    icon: <CheckCircle2 className="size-5" />,
  },
  warn: {
    box: 'bg-warn-soft text-warn ring-warn-border',
    icon: <AlertTriangle className="size-5" />,
  },
  danger: {
    box: 'bg-danger-soft text-danger ring-danger-border',
    icon: <XCircle className="size-5" />,
  },
};

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const style = TONES[tone];

  return (
    <div
      className={cn('rounded-card px-4 py-3 ring-1 ring-inset', style.box, className)}
      // ข้อความเตือนที่โผล่มาระหว่างใช้งาน ต้องให้โปรแกรมอ่านหน้าจอประกาศด้วย
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <div className="flex gap-3">
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          {style.icon}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {title !== undefined && <p className="font-semibold">{title}</p>}
          {children !== undefined && (
            <div className={cn('text-ink-muted', title !== undefined && 'mt-1')}>{children}</div>
          )}
        </div>
        {action !== undefined && <div className="shrink-0 self-center">{action}</div>}
      </div>
    </div>
  );
}
