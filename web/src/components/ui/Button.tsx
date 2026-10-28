import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-gradient text-ink-inverse shadow-brand hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface text-ink ring-1 ring-line hover:bg-surface-sunken hover:ring-line-strong',
  ghost: 'text-ink-muted hover:bg-neutral-soft hover:text-ink',
  danger: 'bg-danger text-ink-inverse hover:bg-danger-hover shadow-card',
};

const SIZES: Record<Size, string> = {
  // ความสูงขั้นต่ำ 44px ตามเกณฑ์พื้นที่กดบนมือถือ ยกเว้น sm ที่ใช้ในแถวตารางบนจอใหญ่
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-[15px] gap-2',
  lg: 'min-h-12 px-6 text-base gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** ข้อความที่แสดงแทนตอนกำลังทำงาน — บอกผู้ใช้ว่าระบบทำอะไรอยู่ */
  loadingLabel?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-control font-medium',
        // ระบุ property ที่เปลี่ยนชัดเจน ไม่ใช้ transition-all ซึ่งทำให้เบราว์เซอร์ทำงานเกินจำเป็น
        'transition-[background-color,box-shadow,transform,color,filter] duration-150 ease-out',
        'motion-safe:active:scale-[0.98]',
        'disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner size="sm" label="กำลังดำเนินการ" />
          <span>{loadingLabel ?? 'กำลังดำเนินการ'}</span>
        </>
      ) : (
        <>
          {icon !== undefined && (
            <span aria-hidden="true" className="shrink-0">
              {icon}
            </span>
          )}
          {children}
        </>
      )}
    </button>
  );
}
