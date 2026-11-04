import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarCheck2 } from 'lucide-react';
import type { UserRole } from '@shared/schemas/user';
import { visibleNavItems } from '../../app/navigation';
import { cn } from '../../lib/cn';
import { readLocal, writeLocal } from '../../lib/storage';

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
};

/**
 * เมนูหลักแถบบน (จอใหญ่) — หุบ/เด้งออกแบบเดียวกับเมนูซ้ายเดิม:
 *  - เปิดมาหุบ: เห็นไอคอน + ชื่อเฉพาะหน้าที่อยู่
 *  - เอาเมาส์วาง/ใช้คีย์บอร์ดเข้าไป -> ชื่อทุกเมนูเลื่อนออกมา, เอาออก/กด Esc -> หุบเอง
 *  - กดโลโก้ปฏิทิน -> ปักให้กางค้าง (จำค่าไว้) กดอีกครั้งเลิกปัก
 * จอ lg ที่แคบกว่า xl กางไม่พอ จึงเห็นแค่ไอคอน (ชี้แล้วมีชื่อขึ้นจาก title)
 */
const PINNED_KEY = 'mrb.sidebar.pinned';
const PEEK_OPEN_DELAY_MS = 120;
const PEEK_CLOSE_DELAY_MS = 220;

export function TopNav({ role, badges }: { role: UserRole; badges: Record<string, number> }) {
  const items = visibleNavItems(role);
  const [pinned, setPinned] = useState(() => readLocal(PINNED_KEY) === '1');
  const [peek, setPeek] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const schedulePeek = (open: boolean) => {
    window.clearTimeout(timer.current);
    // หน่วงเล็กน้อยทั้งตอนเปิดและปิด ลากเมาส์ผ่านเฉย ๆ เมนูจะได้ไม่กะพริบ
    timer.current = window.setTimeout(() => setPeek(open), open ? PEEK_OPEN_DELAY_MS : PEEK_CLOSE_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!peek) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setPeek(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [peek]);
  const togglePinned = () => {
    window.clearTimeout(timer.current);
    setPeek(false);
    setPinned((current) => {
      writeLocal(PINNED_KEY, current ? '0' : '1');
      return !current;
    });
  };
  const expanded = pinned || peek;

  return (
    <>
      <button
        type="button"
        onClick={togglePinned}
        aria-label={pinned ? 'ย่อเมนู' : 'ขยายเมนูค้างไว้'}
        aria-pressed={pinned}
        title={pinned ? 'ย่อเมนู' : 'ขยายเมนูค้างไว้'}
        className="hidden size-10 shrink-0 place-items-center rounded-inner bg-brand-gradient text-ink-inverse shadow-[var(--shadow-3d-brand)] transition-[filter,transform,box-shadow] duration-150 hover:brightness-110 active:translate-y-0.5 active:shadow-[var(--shadow-3d-brand-pressed)] lg:grid"
      >
        <CalendarCheck2 className="size-5" aria-hidden="true" />
      </button>

      <nav
        aria-label="เมนูหลัก"
        data-expanded={expanded}
        onMouseEnter={() => schedulePeek(true)}
        onMouseLeave={() => schedulePeek(false)}
        onFocus={() => { window.clearTimeout(timer.current); setPeek(true); }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) schedulePeek(false); }}
        className="hidden min-w-0 flex-1 justify-center lg:flex"
      >
        {/* แถบนูน 3 มิติ: ขอบทึบด้านล่าง กางแล้วช่องไฟกว้างขึ้นให้แถบยาวออก */}
        <ul className={cn(
          'flex items-center rounded-pill bg-gradient-to-b from-surface to-surface-sunken ring-1 ring-line shadow-[var(--shadow-3d-bar)] transition-[padding,gap] duration-200 ease-out',
          expanded ? 'gap-1.5 p-2 xl:gap-2' : 'gap-1 p-1.5',
        )}>
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
                    'flex min-h-10 items-center whitespace-nowrap rounded-pill text-sm font-medium',
                    'transition-[background-color,color,box-shadow,transform,padding] duration-200 ease-out',
                    expanded ? 'px-3 xl:px-4' : 'px-3',
                    isActive
                      ? '-translate-y-px bg-brand-gradient text-ink-inverse shadow-[var(--shadow-3d-brand)] active:translate-y-0.5 active:shadow-[var(--shadow-3d-brand-pressed)]'
                      : 'text-ink-muted hover:-translate-y-px hover:bg-brand-soft hover:text-brand hover:shadow-[var(--shadow-3d-chip)] active:translate-y-0 active:shadow-none',
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="size-4 shrink-0" aria-hidden="true" />
                      {/*
                        ชื่อเมนูเลื่อนออก/หุบด้วยคอลัมน์ grid 0fr -> 1fr (ไม่ต้องรู้ความกว้างจริงของข้อความ)
                        หน้าที่อยู่เห็นชื่อเสมอ ที่เหลือเห็นเมื่อกางเมนู (จอ xl ขึ้นไป)
                      */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid transition-[grid-template-columns,opacity] duration-200 ease-out',
                          isActive ? 'grid-cols-[1fr]' : expanded ? 'grid-cols-[0fr] opacity-0 xl:grid-cols-[1fr] xl:opacity-100' : 'grid-cols-[0fr] opacity-0',
                        )}
                      >
                        <span className="overflow-hidden pl-2">{TOP_LABEL[item.path] ?? item.label}</span>
                      </span>
                      {badge > 0 && (
                        <span aria-hidden="true" className="ml-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[11px] font-semibold leading-none text-ink motion-safe:animate-[pop_200ms_var(--ease-out)_both]">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </>
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
