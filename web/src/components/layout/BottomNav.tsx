import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import type { UserRole } from '@shared/schemas/user';
import { visibleNavItems, type NavItem } from '../../app/navigation';
import { cn } from '../../lib/cn';

/** ชื่อสั้นบนเมนูด้านล่าง — ชื่อเต็มยาวเกินช่องกว้าง ~75px บนมือถือ */
const SHORT_LABEL: Record<string, string> = {
  '/': 'ภาพรวม',
  '/calendar': 'ปฏิทิน',
  '/book': 'จองห้อง',
  '/my-bookings': 'ของฉัน',
};

/** ลำดับบนแถบ: งานหลัก (จองห้อง) อยู่ตรงกลาง ที่นิ้วโป้งเอื้อมถึงง่ายที่สุด */
const BAR_ORDER = ['/', '/calendar', '/book', '/my-bookings'];

/**
 * เมนูด้านล่างสำหรับมือถือ/แท็บเล็ตแนวตั้ง (ซ่อนบนจอคอมที่มีเมนูซ้ายแล้ว)
 * 4 ปุ่มหลัก + "เพิ่มเติม" รวมเป็น 5 ช่อง ตามหลักที่ว่าเมนูด้านล่างไม่ควรเกิน 5
 */
export function BottomNav({
  role,
  badges = {},
}: {
  role: UserRole;
  badges?: Record<string, number>;
}) {
  const items = visibleNavItems(role);
  const barItems = BAR_ORDER.map((path) => items.find((item) => item.path === path)).filter(
    (item): item is NavItem => item !== undefined,
  );
  const moreItems = items.filter((item) => item.mobile !== 'bar');
  const moreBadge = moreItems.reduce((sum, item) => sum + (badges[item.path] ?? 0), 0);

  const { pathname } = useLocation();
  const moreActive = moreItems.some((item) => pathname.startsWith(item.path));
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  // เปลี่ยนหน้าแล้วปิดแผ่นเมนูเสมอ
  useEffect(() => setSheetOpen(false), [pathname]);

  return (
    <>
      <nav
        aria-label="เมนูด้านล่าง"
        className="fixed inset-x-0 bottom-0 z-[30] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid h-[var(--bottom-nav-height)] max-w-lg grid-cols-5">
          {barItems.map((item) => (
            <li key={item.path} className="flex">
              {item.path === '/book' ? (
                <NavLink
                  to={item.path}
                  className="group flex flex-1 flex-col items-center justify-end gap-1 pb-2 text-xs font-semibold text-brand"
                >
                  <span
                    aria-hidden="true"
                    className="-mt-5 grid size-12 place-items-center rounded-full bg-brand-gradient text-ink-inverse shadow-brand ring-4 ring-surface transition-transform duration-150 group-active:scale-95"
                  >
                    <item.icon className="size-6" />
                  </span>
                  {SHORT_LABEL[item.path] ?? item.label}
                </NavLink>
              ) : (
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150',
                      isActive ? 'text-brand' : 'text-ink-muted active:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid h-7 w-12 place-items-center rounded-full transition-colors duration-150',
                          isActive && 'bg-brand-soft',
                        )}
                      >
                        <item.icon className="size-5" />
                      </span>
                      {SHORT_LABEL[item.path] ?? item.label}
                    </>
                  )}
                </NavLink>
              )}
            </li>
          ))}

          {moreItems.length > 0 && (
            <li className="flex">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150',
                  moreActive || sheetOpen ? 'text-brand' : 'text-ink-muted active:text-ink',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative grid h-7 w-12 place-items-center rounded-full transition-colors duration-150',
                    (moreActive || sheetOpen) && 'bg-brand-soft',
                  )}
                >
                  <LayoutGrid className="size-5" />
                  {moreBadge > 0 && <Badge count={moreBadge} className="absolute -right-0.5 -top-1" />}
                </span>
                เพิ่มเติม
                {moreBadge > 0 && <span className="sr-only-focusable">{` (มี ${moreBadge} รายการรออนุมัติ)`}</span>}
              </button>
            </li>
          )}
        </ul>
      </nav>

      {sheetOpen && (
        <MoreSheet items={moreItems} badges={badges} onClose={closeSheet} />
      )}
    </>
  );
}

function Badge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold leading-none text-ink-inverse ring-2 ring-surface',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** แผ่นเมนูเลื่อนขึ้นจากด้านล่าง — มาตรฐานบนมือถือแทน dropdown ที่ต้องเอื้อมไปกดด้านบน */
function MoreSheet({
  items,
  badges,
  onClose,
}: {
  items: NavItem[];
  badges: Record<string, number>;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // จำปุ่มที่เปิดไว้ เพื่อคืนโฟกัสให้ตอนปิด (คนใช้คีย์บอร์ด/โปรแกรมอ่านหน้าจอจะไม่หลงตำแหน่ง)
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('a')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[40] lg:hidden">
      <button
        type="button"
        aria-label="ปิดเมนูเพิ่มเติม"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 motion-safe:animate-[pop_150ms_var(--ease-out)_both]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-overlay motion-safe:animate-[rise_220ms_var(--ease-out)_both]"
      >
        <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line-strong" />
        <h2 id="more-sheet-title" className="px-2 pb-2 text-base font-semibold text-ink">
          เมนูเพิ่มเติม
        </h2>
        <ul className="space-y-1">
          {items.map((item) => {
            const badge = badges[item.path] ?? 0;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-14 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition-colors duration-150',
                      isActive ? 'bg-brand-soft text-brand' : 'text-ink active:bg-neutral-soft',
                    )
                  }
                >
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"
                  >
                    <item.icon className="size-5" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <>
                      <Badge count={badge} />
                      <span className="sr-only-focusable">{` (มี ${badge} รายการ)`}</span>
                    </>
                  )}
                  <ChevronRight className="size-4 text-ink-subtle" aria-hidden="true" />
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
