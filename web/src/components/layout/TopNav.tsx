import { NavLink } from 'react-router-dom';
import { CalendarCheck2 } from 'lucide-react';
import type { UserRole } from '@shared/schemas/user';
import { visibleNavItems } from '../../app/navigation';
import { cn } from '../../lib/cn';

/** ชื่อสั้นบนแถบบน (เมนูต้องพอดีแถวเดียว) — ชื่อเต็มอยู่ใน aria-label และ title */
const TOP_LABEL: Record<string, string> = {
  '/': 'ภาพรวม',
  '/book': 'จองห้อง',
  '/calendar': 'ปฏิทิน',
  '/my-bookings': 'ของฉัน',
  '/rooms': 'ห้อง',
  '/approvals': 'อนุมัติ',
  '/reports': 'พิมพ์ฟอร์ม',
  '/users': 'ผู้ใช้',
  '/manage': 'ตั้งค่า',
};

/**
 * เมนูหลักแถบบน (จอใหญ่) — แสดงชื่อทุกเมนูตลอด ไม่ต้องชี้เมาส์หรือกดกาง
 *  - จอ lg: ไอคอนอยู่บนชื่อ (ตัวเล็ก) ให้ครบทุกเมนูในแถวเดียว
 *  - จอกว้างพอ: ไอคอนกับชื่ออยู่บรรทัดเดียวกัน
 */
export function TopNav({ role, badges }: { role: UserRole; badges: Record<string, number> }) {
  const items = visibleNavItems(role);

  return (
    <>
      <span
        aria-hidden="true"
        className="hidden size-10 shrink-0 place-items-center rounded-inner bg-brand-gradient text-ink-inverse shadow-[var(--shadow-3d-brand)] lg:grid"
      >
        <CalendarCheck2 className="size-5" />
      </span>

      <nav aria-label="เมนูหลัก" className="hidden min-w-0 flex-1 justify-center lg:flex">
        <ul className="flex items-center gap-1 rounded-pill bg-gradient-to-b from-surface to-surface-sunken p-1.5 ring-1 ring-line shadow-[var(--shadow-3d-bar)] 2xl:gap-1.5">
          {items.map((item) => {
            const badge = badges[item.path] ?? 0;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  title={item.label}
                  aria-label={badge > 0 ? `${item.label} (มี ${badge} รายการ)` : item.label}
                  className={({ isActive }) => cn(
                    'relative flex min-h-11 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-pill px-3 text-xs font-medium',
                    '2xl:min-h-10 2xl:flex-row 2xl:gap-2 2xl:px-4 2xl:text-sm',
                    'transition-[background-color,color,box-shadow,transform] duration-150 ease-out',
                    isActive
                      ? 'bg-brand-gradient text-ink-inverse shadow-[var(--shadow-3d-brand)] active:translate-y-0.5 active:shadow-[var(--shadow-3d-brand-pressed)]'
                      : 'text-ink-muted hover:bg-brand-soft hover:text-brand active:translate-y-px',
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  <span aria-hidden="true">{TOP_LABEL[item.path] ?? item.label}</span>
                  {badge > 0 && (
                    <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[11px] font-semibold leading-none text-ink ring-2 ring-surface motion-safe:animate-[pop_200ms_var(--ease-out)_both] 2xl:static 2xl:ring-0">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
