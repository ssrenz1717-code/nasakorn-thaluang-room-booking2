import { cn } from '../../lib/cn';

/** ตัวหมุนบอกว่ากำลังโหลด — มี aria-label เสมอเพื่อให้โปรแกรมอ่านหน้าจอบอกผู้ใช้ได้ */
export function Spinner({
  size = 'md',
  label = 'กำลังโหลด',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}) {
  const dimension = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-10 border-[3px]' }[
    size
  ];

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block shrink-0 rounded-full border-current border-t-transparent',
        'motion-safe:animate-[spin-slow_700ms_linear_infinite]',
        dimension,
        className,
      )}
    />
  );
}
