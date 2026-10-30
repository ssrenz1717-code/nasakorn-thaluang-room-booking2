import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarCheck2, Check, LogOut, Settings } from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../lib/api/demo';
import { USER_ROLE_LABEL_TH } from '@shared/schemas/user';
import { cn } from '../../lib/cn';
import { useApp } from '../../app/providers/AppProvider';
import { ConnectionSettingsDialog } from './ConnectionSettingsDialog';

export function Topbar() {
  const { user, signOut, isDemo, switchDemoAccount } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ปิดเมนูโปรไฟล์เมื่อกด Escape หรือคลิกข้างนอก — พฤติกรรมที่ผู้ใช้คาดหวังจากเมนูทุกตัว
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current !== null && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const initial = (user?.displayName ?? '?').trim().charAt(0) || '?';

  return (
    <header className="sticky top-0 z-[20] border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex min-h-14 items-center gap-3 px-4 pt-[env(safe-area-inset-top)] lg:min-h-16 lg:px-6">
        {/* มือถือไม่มีเมนูซ้าย จึงแสดงชื่อแอปไว้ด้านบนให้รู้ว่าอยู่ที่ไหน */}
        <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-inner bg-brand-gradient text-ink-inverse"
          >
            <CalendarCheck2 className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">ระบบจองห้องประชุม</span>
            <span className="block truncate text-xs text-ink-muted">วิทยาลัยเทคนิคท่าหลวงฯ</span>
          </span>
        </div>

        <div className="flex-1" />

        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-haspopup="dialog"
            aria-label="การตั้งค่าเชื่อมต่อระบบ"
            title="การตั้งค่าเชื่อมต่อระบบ & API"
            className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-neutral-soft hover:text-ink"
          >
            <Settings className="size-5" aria-hidden="true" />
          </button>
        )}

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={cn(
              'flex min-h-11 items-center gap-2.5 rounded-control px-2 transition-colors',
              'hover:bg-neutral-soft',
            )}
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
            >
              {initial}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-[12rem] truncate text-sm font-medium text-ink">
                {user?.displayName ?? '—'}
              </span>
              <span className="block text-xs text-ink-subtle">
                {user === null ? '' : USER_ROLE_LABEL_TH[user.role]}
              </span>
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] max-h-[calc(100dvh-5rem)] w-64 origin-top-right overflow-y-auto rounded-card bg-surface p-1.5 shadow-overlay ring-1 ring-line motion-safe:animate-[pop_150ms_var(--ease-out)_both]"
            >
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium text-ink">{user?.displayName}</p>
                <p className="truncate text-xs text-ink-subtle">{user?.email}</p>
                {user !== null && user.department !== '' && (
                  <p className="mt-0.5 truncate text-xs text-ink-subtle">{user.department}</p>
                )}
              </div>
              <hr className="my-1 border-line" />
              {/* ยังไม่เชื่อม Google: สลับบัญชีตัวอย่างเพื่อลองส่งคำขอ แล้วลงนามทีละขั้นด้วยคนละบัญชี */}
              {isDemo && (
                <>
                  <p className="px-2.5 pb-1 pt-1.5 text-xs text-ink-subtle">สลับบัญชี (ลองขั้นตอนอนุมัติ)</p>
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      role="menuitemradio"
                      aria-checked={account.email === user?.email}
                      onClick={() => {
                        setMenuOpen(false);
                        if (account.email !== user?.email) void switchDemoAccount(account.email);
                      }}
                      className="flex min-h-11 w-full items-center gap-2.5 rounded-inner px-2.5 text-left text-sm transition-colors hover:bg-neutral-soft"
                    >
                      <Check className={cn('size-4 shrink-0 text-brand', account.email === user?.email ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink">{account.displayName}</span>
                        <span className="block truncate text-xs text-ink-subtle">{USER_ROLE_LABEL_TH[account.role]}</span>
                      </span>
                    </button>
                  ))}
                  <hr className="my-1 border-line" />
                </>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-inner px-2.5 text-sm text-ink-muted transition-colors hover:bg-neutral-soft hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden="true" />
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
      {/* ต้องวางนอก header: backdrop-blur ทำให้ fixed ข้างในยึดกรอบ header แทนทั้งจอ */}
      {settingsOpen && createPortal(<ConnectionSettingsDialog onClose={() => setSettingsOpen(false)} />, document.body)}
    </header>
  );
}
