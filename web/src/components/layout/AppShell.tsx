import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { cn } from '../../lib/cn';
import { usePendingApprovals } from '../../lib/hooks/usePendingApprovals';
import { readLocal, writeLocal } from '../../lib/storage';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // กด Esc ตอนเมนูเด้งออกมา -> หุบกลับ
  useEffect(() => {
    if (!peek) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPeek(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [peek]);

  // ลิ้นชักเมนูบนมือถือ: Escape ปิด, ล็อกการเลื่อนพื้นหลัง, ย้ายโฟกัสเข้าไปในลิ้นชัก
  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

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

      {drawerOpen && (
        <div className="fixed inset-0 z-[40] lg:hidden">
          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/40 motion-safe:animate-[pop_150ms_var(--ease-out)_both]"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="เมนูหลัก"
            className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] shadow-overlay motion-safe:animate-[rise_200ms_var(--ease-out)_both]"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="ปิดเมนู"
              className="absolute right-2 top-3 z-10 grid size-11 place-items-center rounded-control text-white hover:bg-white/15 focus-visible:outline-white"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SidebarContent role={user.role} onNavigate={() => setDrawerOpen(false)} badges={badges} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />

        <main id="main" className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
