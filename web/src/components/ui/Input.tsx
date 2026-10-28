import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** ป้ายกำกับที่มองเห็นได้ — ห้ามใช้ placeholder แทน label */
  label: string;
  /** ซ่อน label ไว้ให้โปรแกรมอ่านหน้าจออ่าน ใช้เฉพาะช่องค้นหาที่มีไอคอนสื่อความหมายชัด */
  hideLabel?: boolean;
  error?: string;
  help?: string;
  leading?: ReactNode;
}

export function Input({
  label,
  hideLabel = false,
  error,
  help,
  leading,
  className,
  ...rest
}: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  const describedBy =
    [error !== undefined ? errorId : null, help !== undefined ? helpId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className={cn(
          'mb-1.5 block text-sm font-medium text-ink',
          hideLabel && 'sr-only-focusable',
        )}
      >
        {label}
      </label>

      <div className="relative">
        {leading !== undefined && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle"
          >
            {leading}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-11 w-full rounded-control bg-surface px-3 text-[15px] text-ink',
            'ring-1 ring-line transition-[box-shadow] duration-150',
            'placeholder:text-ink-subtle',
            'hover:ring-line-strong focus:ring-2 focus:ring-brand focus:outline-none',
            'disabled:bg-surface-sunken disabled:text-ink-subtle',
            leading !== undefined && 'pl-9',
            error !== undefined && 'ring-danger focus:ring-danger',
            className,
          )}
          {...rest}
        />
      </div>

      {/* aria-live ให้โปรแกรมอ่านหน้าจอประกาศข้อผิดพลาดทันทีที่โผล่ */}
      {error !== undefined && (
        <p id={errorId} aria-live="polite" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
      {help !== undefined && error === undefined && (
        <p id={helpId} className="mt-1.5 text-sm text-ink-muted">
          {help}
        </p>
      )}
    </div>
  );
}
