import { Check, type ValidationResult, asRecord } from '../validate/check';

/**
 * staff = ผู้ใช้ทั่วไป (ครู/บุคลากร) จองห้องได้
 * inspector / endorser / director = ผู้ลงนามอนุมัติขั้นที่ 1 / 2 / 3 (ดู domain/approval.ts)
 * admin = ผู้ดูแลระบบ จัดการประกาศและดูภาพรวม แต่ไม่ได้ลงนามแทนผู้อนุมัติ
 */
export const USER_ROLES = ['admin', 'staff', 'inspector', 'endorser', 'director'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABEL_TH: Record<UserRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  staff: 'ผู้ใช้งาน',
  inspector: 'เจ้าหน้าที่ตรวจห้อง',
  endorser: 'ผู้รับรอง',
  director: 'ผู้อนุมัติ',
};

/** ค่า role จากชีต Users ที่สะกดผิดหรือว่าง ให้เป็นผู้ใช้ทั่วไป (สิทธิ์ต่ำสุด) เสมอ */
export function normalizeUserRole(raw: unknown): UserRole {
  const value = String(raw ?? '').trim();
  return (USER_ROLES as readonly string[]).includes(value) ? (value as UserRole) : 'staff';
}

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABEL_TH: Record<UserStatus, string> = {
  active: 'ใช้งานได้',
  disabled: 'ปิดการใช้งาน',
};

export interface UserProfileInput {
  displayName: string;
  department: string;
}

export function validateUserProfileInput(raw: unknown): ValidationResult<UserProfileInput> {
  const input = asRecord(raw);
  const check = new Check();
  return check.result({
    displayName: check.string('displayName', input.displayName, {
      label: 'ชื่อ-นามสกุล',
      max: 100,
    }),
    department: check.string('department', input.department, {
      label: 'แผนก',
      max: 100,
      fallback: '',
    }),
  });
}

/**
 * role และ status เปลี่ยนได้จากฟังก์ชันฝั่ง server เท่านั้น
 * หน้าเว็บส่งได้แค่สองฟิลด์ใน validateUserProfileInput ข้างบน
 */
export interface SetUserRoleInput {
  email: string;
  role: UserRole;
}

export function validateSetUserRoleInput(raw: unknown): ValidationResult<SetUserRoleInput> {
  const input = asRecord(raw);
  const check = new Check();
  return check.result({
    email: check.string('email', input.email, {
      label: 'อีเมล',
      max: 200,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'อีเมลไม่ถูกต้อง',
    }),
    role: check.oneOf('role', input.role, USER_ROLES, { label: 'สิทธิ์การใช้งาน' }),
  });
}

export interface SetUserStatusInput {
  email: string;
  status: UserStatus;
}

export function validateSetUserStatusInput(raw: unknown): ValidationResult<SetUserStatusInput> {
  const input = asRecord(raw);
  const check = new Check();
  return check.result({
    email: check.string('email', input.email, {
      label: 'อีเมล',
      max: 200,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'อีเมลไม่ถูกต้อง',
    }),
    status: check.oneOf('status', input.status, USER_STATUSES, { label: 'สถานะผู้ใช้' }),
  });
}
