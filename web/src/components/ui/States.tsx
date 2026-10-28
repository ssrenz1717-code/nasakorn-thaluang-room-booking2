import type { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Spinner } from './Spinner';

/** กำลังโหลด — ใช้เมื่อยังไม่รู้ว่าจะได้ข้อมูลหรือไม่ */
export function LoadingState({ message = 'กำลังโหลดข้อมูล' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-ink-muted">
      <Spinner size="lg" className="text-brand" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/**
 * ไม่มีข้อมูล — ต้องบอกด้วยว่า "ทำอะไรต่อได้"
 * หน้าจอว่างที่ไม่บอกทางไปต่อ ทำให้ผู้ใช้คิดว่าระบบพัง
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full bg-neutral-soft text-ink-subtle"
      >
        {icon ?? <Inbox className="size-6" />}
      </span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {description !== undefined && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {action !== undefined && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** เกิดข้อผิดพลาด — ต้องมีปุ่มลองใหม่ ไม่ใช่ปล่อยให้ผู้ใช้รีเฟรชเอง */
export function ErrorState({
  title = 'โหลดข้อมูลไม่สำเร็จ',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger"
      >
        <AlertCircle className="size-6" />
      </span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{message}</p>
      </div>
      {onRetry !== undefined && (
        <Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} onClick={onRetry}>
          ลองอีกครั้ง
        </Button>
      )}
    </div>
  );
}

/** โครงร่างสีเทาตอนโหลด ใช้แทน spinner เมื่อรู้รูปร่างข้อมูลล่วงหน้า ลดอาการหน้ากระตุก */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-inner bg-neutral-soft', className)}
    />
  );
}
