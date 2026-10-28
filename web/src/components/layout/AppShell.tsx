import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from '../../app/providers/AppProvider';
import { cn } from '../../lib/cn';
import { usePendingApprovals } from '../../lib/hooks/usePendingApprovals';
import { readLocal, writeLocal } from '../../lib/storage';
import { BottomNav } from './BottomNav';
import { SidebarContent } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * เมนูซ้ายบนจอใหญ่: เปิดมาหุบเหลือแต่ไอคอน
 *  - เอาเมาส์วาง/ใช้คีย์บอร์ดเข้าไป -> ขยายออกมา "ทับ" เนื้อหา (ไม่ดันหน้าให้กระตุก)
 *  - เอาเมาส์ออก/โฟกัสออก/กด Esc -> หุบเอง
 *  - กดโลโก้ปฏิทิน -> ปักให้ขยายค้าง (จำค่าไว้) กดอีกครั้งเลิกปัก
 */
const SIDEBAR_PINNED_KEY = 'mrb.sidebar.pinned';
const PEEK_OPEN_DELAY_MS = 120;
const PEEK_CLOSE_DELAY_MS = 220;

export function AppShell() {
  const { user } = useApp();
  const [pinned, setPinned] = useState(() => readLocal(SIDEBAR_PINNED_KEY) === '1');
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<number | undefined>(undefined);
  const schedulePeek = (open: boolean) => {
    window.clearTimeout(peekTimer.current);
    // หน่วงเล็กน้อยทั้งตอนเปิดและปิด ลากเมาส์ผ่านเฉย ๆ เมนูจะได้ไม่กะพริบ
    peekTimer.current = window.setTimeout(() => setPeek(open), open ? PEEK_OPEN_DELAY_MS : PEEK_CLOSE_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);
  const togglePinned = () => {
    window.clearTimeout(peekTimer.current);
    setPeek(false);
    setPinned((current) => {
      writeLocal(SIDEBAR_PINNED_KEY, current ? '0' : '1');
      return !current;
    });
  };
  const expanded = pinned || peek;
  const pendingApprovals = usePendingApprovals();
  const badges = { '/approvals': pendingApprovals };

  // กด Esc ตอนเมนูเด้งออกมา -> หุบกลับ
  useEffect(() => {
    if (!peek) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPeek(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [peek]);

  if (user === null) return null;

  return (
    <div className={cn('min-h-dvh lg:grid lg:transition-[grid-template-columns] lg:duration-200', pinned ? 'lg:grid-cols-[272px_1fr]' : 'lg:grid-cols-[76px_1fr]')}>
      {/* ลิงก์ข้ามไปเนื้อหาหลัก — เป็นสิ่งแรกที่คนใช้คีย์บอร์ดจะเจอ */}
      <a href="#main" className="sr-only-focusable">
        ข้ามไปที่เนื้อหาหลัก
      </a>

      <aside className="hidden lg:sticky lg:top-0 lg:z-[30] lg:block lg:h-dvh">
        {/* แผงลอยอยู่ใน aside ที่กว้างเท่าแถบไอคอน ตอนเด้งออกจึงทับเนื้อหาแทนการดัน */}
        <div
          data-expanded={expanded}
          onMouseEnter={() => schedulePeek(true)}
          onMouseLeave={() => schedulePeek(false)}
          onFocus={() => {
            window.clearTimeout(peekTimer.current);
            setPeek(true);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) schedulePeek(false);
          }}
          className={cn(
            'absolute inset-y-0 left-0 overflow-hidden transition-[width,box-shadow] duration-200 ease-out',
            expanded ? 'w-[272px]' : 'w-[76px]',
            peek && !pinned && 'shadow-overlay',
          )}
        >
          <SidebarContent
            role={user.role}
            collapsed={!expanded}
            pinned={pinned}
            onTogglePinned={togglePinned}
            badges={badges}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <Topbar />

        {/* เว้นที่ด้านล่างเท่าเมนูด้านล่าง + ขอบ iPhone เนื้อหาบรรทัดสุดท้ายจะได้ไม่ถูกเมนูบัง */}
        <main id="main" className="flex-1 px-4 pt-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1.5rem)] lg:px-6 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav role={user.role} badges={badges} />
    </div>
  );
}
