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
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** สิทธิ์ที่เห็นเมนูนี้ได้ ไม่ระบุ = ทุกคน */
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'ภาพรวม', icon: LayoutDashboard },
  { path: '/book', label: 'จองห้องประชุม', icon: CalendarPlus },
  { path: '/calendar', label: 'ปฏิทินการจอง', icon: CalendarDays },
  { path: '/my-bookings', label: 'รายการจองของฉัน', icon: ClipboardList },
  { path: '/rooms', label: 'ห้องประชุม', icon: DoorOpen },
  { path: '/approvals', label: 'รออนุมัติ', icon: ClipboardCheck, roles: ['admin'] },
  { path: '/reports', label: 'พิมพ์แบบฟอร์ม A4', icon: ClipboardList },
];

export function visibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles === undefined || item.roles.includes(role));
}
