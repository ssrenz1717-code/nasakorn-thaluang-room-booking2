import { NavLink } from 'react-router-dom';
import { CalendarCheck2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { visibleNavItems } from '../../app/navigation';
import type { UserRole } from '@shared/schemas/user';

export function SidebarContent({
  role,
  onNavigate,
  collapsed = false,
  pinned = false,
  onTogglePinned,
  badges = {},
}: {
  role: UserRole;
  onNavigate?: () => void;
  /** ย่อเหลือแต่ไอคอน (ใช้บนจอใหญ่เท่านั้น ลิ้นชักบนมือถือแสดงเต็มเสมอ) */
  collapsed?: boolean;
  /** เมนูถูกปักให้ขยายค้างไว้หรือไม่ — ใช้ตั้งชื่อปุ่มโลโก้ */
  pinned?: boolean;
  /** กดโลโก้ปฏิทินเพื่อปัก/เลิกปักเมนู — ไม่ส่งมา = โลโก้เป็นแค่รูป */
  onTogglePinned?: () => void;
  /** ตัวเลขป้ายแดงต่อเมนู เช่น { '/approvals': 3 } */
  badges?: Record<string, number>;
}) {
  const items = visibleNavItems(role);

  return (
    <div className="bg-brand-gradient flex h-full flex-col text-ink-inverse">
      <div className={cn('flex items-center gap-2.5 py-4', collapsed ? 'justify-center px-2' : 'px-5')}>
        {onTogglePinned !== undefined ? (
          <button
            type="button"
            onClick={onTogglePinned}
            aria-label={pinned ? 'ย่อเมนู' : 'ขยายเมนูค้างไว้'}
            aria-pressed={pinned}
            title={pinned ? 'ย่อเมนู' : 'ขยายเมนูค้างไว้'}
            className="grid size-9 shrink-0 place-items-center rounded-inner bg-white/15 text-ink-inverse ring-1 ring-white/25 transition-colors duration-150 hover:bg-white/25 focus-visible:outline-white"
          >
            <CalendarCheck2 className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-inner bg-white/15 text-ink-inverse ring-1 ring-white/25"
          >
            <CalendarCheck2 className="size-5" />
          </span>
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">ระบบจองห้องประชุม</p>
            <p className="truncate text-xs text-white/80">วิทยาลัยเทคนิคท่าหลวงฯ</p>
          </div>
        )}
      </div>

      <nav aria-label="เมนูหลัก" className={cn('flex-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const badge = badges[item.path] ?? 0;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  end={item.path === '/'}
                  // ตอนย่อ ชี้เมาส์แล้วเห็นชื่อเมนู
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'relative flex min-h-11 items-center gap-3 rounded-control text-[15px] font-medium',
                      // วงแหวนโฟกัสค่าเริ่มต้นเป็นสีน้ำเงิน จะมองไม่เห็นบนพื้นน้ำเงิน จึงเปลี่ยนเป็นสีขาว
                      'transition-colors duration-150 focus-visible:outline-white',
                      collapsed ? 'justify-center' : 'px-3',
                      isActive
                        ? 'bg-white text-brand shadow-card'
                        : 'text-white/85 hover:bg-white/12 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="size-5 shrink-0" aria-hidden="true" />
                      {/* ตอนย่อซ่อนชื่อจากสายตา แต่โปรแกรมอ่านหน้าจอยังอ่านได้ */}
                      <span className={collapsed ? 'sr-only-focusable' : 'flex-1 truncate'}>
                        {item.label}
                      </span>
                      {badge > 0 && (
                        <>
                          <span
                            aria-hidden="true"
                            className={cn(
                              'grid place-items-center rounded-full bg-danger font-semibold leading-none text-white',
                              'motion-safe:animate-[pop_200ms_var(--ease-out)_both]',
                              isActive ? 'ring-2 ring-white' : 'ring-2 ring-white/70',
                              collapsed
                                ? 'absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px]'
                                : 'h-5 min-w-5 px-1.5 text-[11px]',
                            )}
                          >
                            {badge > 99 ? '99+' : badge}
                          </span>
                          <span className="sr-only-focusable">{` (มี ${badge} รายการ)`}</span>
                        </>
                      )}
                      {/* บอกตำแหน่งปัจจุบันด้วยจุด ไม่พึ่งสีอย่างเดียว */}
                      {isActive && !collapsed && (
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
