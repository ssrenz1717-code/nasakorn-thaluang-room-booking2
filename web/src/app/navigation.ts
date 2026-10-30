import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  ClipboardCheck,
  DoorOpen,
  LayoutDashboard,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { UserRole } from '@shared/schemas/user';

export interface NavItem {
  /** บนมือถือ: 'bar' = ปุ่มบนเมนูด้านล่าง, ไม่ระบุ = อยู่ในแผ่น "เพิ่มเติม" */
  mobile?: 'bar';
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** สิทธิ์ที่เห็นเมนูนี้ได้ ไม่ระบุ = ทุกคน */
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'ภาพรวม', icon: LayoutDashboard, mobile: 'bar' },
  { path: '/book', label: 'จองห้องประชุม', icon: CalendarPlus, mobile: 'bar' },
  { path: '/calendar', label: 'ปฏิทินการจอง', icon: CalendarDays, mobile: 'bar' },
  { path: '/my-bookings', label: 'รายการจองของฉัน', icon: ClipboardList, mobile: 'bar' },
  { path: '/rooms', label: 'ห้องประชุม', icon: DoorOpen },
  { path: '/approvals', label: 'อนุมัติการใช้ห้อง', icon: ClipboardCheck, roles: ['admin', 'inspector', 'endorser', 'director'] },
  { path: '/reports', label: 'พิมพ์แบบฟอร์ม A4', icon: ClipboardList },
];

export function visibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles === undefined || item.roles.includes(role));
}
