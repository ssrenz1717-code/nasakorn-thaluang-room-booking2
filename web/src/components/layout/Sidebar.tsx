import { NavLink } from 'react-router-dom';
import { CalendarCheck2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { visibleNavItems } from '../../app/navigation';
import type { UserRole } from '@shared/schemas/user';

export function SidebarContent({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const items = visibleNavItems(role);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-inner bg-brand text-ink-inverse"
        >
          <CalendarCheck2 className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">ระบบจองห้องประชุม</p>
          <p className="truncate text-xs text-ink-subtle">ภายในองค์กร</p>
        </div>
      </div>

      <nav aria-label="เมนูหลัก" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium',
                      'transition-colors duration-150',
                      isActive
                        ? 'bg-brand-soft text-brand'
                        : 'text-ink-muted hover:bg-neutral-soft hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {/* บอกตำแหน่งปัจจุบันด้วยแถบสี ไม่พึ่งสีข้อความอย่างเดียว */}
                      {isActive && (
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                      )}
                    </>
                  )}
                </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
