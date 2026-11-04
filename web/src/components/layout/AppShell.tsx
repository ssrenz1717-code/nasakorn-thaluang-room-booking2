import { Outlet } from 'react-router-dom';
import { useApp } from '../../app/providers/AppProvider';
import { usePendingApprovals } from '../../lib/hooks/usePendingApprovals';
import { BottomNav } from './BottomNav';
import { Topbar } from './Topbar';

/**
 * โครงหน้าเว็บ: จอใหญ่ใช้เมนูแถบบน (หุบ/กางได้ ดู TopNav) / มือถือใช้เมนูด้านล่าง
 */
export function AppShell() {
  const { user } = useApp();
  const pendingApprovals = usePendingApprovals();
  const badges = { '/approvals': pendingApprovals };

  if (user === null) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ลิงก์ข้ามไปเนื้อหาหลัก — เป็นสิ่งแรกที่คนใช้คีย์บอร์ดจะเจอ */}
      <a href="#main" className="sr-only-focusable">
        ข้ามไปที่เนื้อหาหลัก
      </a>

      <Topbar badges={badges} />

      {/* เว้นที่ด้านล่างเท่าเมนูด้านล่าง + ขอบ iPhone เนื้อหาบรรทัดสุดท้ายจะได้ไม่ถูกเมนูบัง */}
      <main id="main" className="flex-1 px-4 pt-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1.5rem)] lg:px-6 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      <BottomNav role={user.role} badges={badges} />
    </div>
  );
}
