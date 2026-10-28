import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { SidebarContent } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const { user } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      {/* ลิงก์ข้ามไปเนื้อหาหลัก — เป็นสิ่งแรกที่คนใช้คีย์บอร์ดจะเจอ */}
      <a href="#main" className="sr-only-focusable">
        ข้ามไปที่เนื้อหาหลัก
      </a>

      <aside className="hidden border-r border-line lg:sticky lg:top-0 lg:block lg:h-dvh">
        <SidebarContent role={user.role} />
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
              className="absolute right-2 top-3 z-10 grid size-11 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SidebarContent role={user.role} onNavigate={() => setDrawerOpen(false)} />
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
