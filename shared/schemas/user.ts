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

/* ---------- บัญชีผู้ใช้ (ชื่อผู้ใช้ + รหัสผ่าน แล้วยืนยัน PIN อีกหน้า) ---------- */

/** ชื่อผู้ใช้: a-z 0-9 . _ - ยาว 3–32 ตัว ไม่สนตัวพิมพ์เล็กใหญ่ (เก็บเป็นตัวเล็กเสมอ) */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

export const PIN_LENGTH = 6;

/**
 * ตรวจ PIN ใหม่ — คืนข้อความไทยเมื่อใช้ไม่ได้, null เมื่อผ่าน
 * กัน PIN ที่คนเดาก่อนเสมอ: เลขซ้ำทั้งหมด (000000) และเลขเรียง (123456, 654321)
 */
export function pinProblem(pin: unknown): string | null {
  if (typeof pin !== 'string' || !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
    return `PIN ต้องเป็นตัวเลข ${PIN_LENGTH} หลัก`;
  }
  if (/^(\d)\1+$/.test(pin)) return 'PIN ห้ามเป็นเลขเดียวกันทั้งหมด';
  const steps = new Set<number>();
  for (let i = 1; i < pin.length; i += 1) steps.add(Number(pin[i]) - Number(pin[i - 1]));
  if (steps.size === 1 && (steps.has(1) || steps.has(-1))) return 'PIN ห้ามเป็นเลขเรียงกัน';
  return null;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** ตรวจรหัสผ่านใหม่ — อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข, null เมื่อผ่าน */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัว`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) return `รหัสผ่านยาวได้ไม่เกิน ${PASSWORD_MAX_LENGTH} ตัว`;
  if (/\s/.test(password)) return 'รหัสผ่านห้ามมีช่องว่าง';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'รหัสผ่านต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลข';
  return null;
}

/** ข้อความที่นำไป HMAC เป็นค่า hash ของรหัสผ่าน — คนละรูปแบบกับ PIN เพื่อไม่ให้ hash สลับกันใช้ได้ */
export function passwordDigestMessage(username: string, salt: string, password: string): string {
  return `password|${normalizeUsername(username)}|${salt}|${password}`;
}

/** ข้อความที่นำไป HMAC เป็นค่า hash ของ PIN — ใช้รูปแบบเดียวกันทั้ง Apps Script และโหมดทดลอง */
export function pinDigestMessage(username: string, salt: string, pin: string): string {
  return `pin|${normalizeUsername(username)}|${salt}|${pin}`;
}

/** เทียบสตริงโดยใช้เวลาเท่ากันทุกกรณี กันการเดา hash จากเวลาที่ตอบ */
export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** ผิดกี่ครั้งติดกันแล้วล็อกบัญชี (นับรวมทั้งรหัสผ่านและ PIN) และล็อกนานเท่าไร */
export const PIN_MAX_FAILURES = 5;
export const PIN_LOCK_MINUTES = 15;

/** ห้องที่ผู้ใช้จองได้ — รายการว่าง = ทุกห้อง / ผู้ดูแลเห็นทุกห้องเสมอ */
export function canUseRoom(user: { role: UserRole; allowedRoomIds?: readonly string[] }, roomId: string): boolean {
  if (user.role === 'admin') return true;
  const allowed = user.allowedRoomIds ?? [];
  return allowed.length === 0 || allowed.includes(roomId);
}

export interface LoginInput {
  username: string;
  password: string;
}

/** ขั้นที่ 1: ชื่อผู้ใช้ + รหัสผ่าน */
export function validateLoginInput(raw: unknown): ValidationResult<LoginInput> {
  const input = asRecord(raw);
  const check = new Check();
  const username = normalizeUsername(input.username);
  if (username === '') check.fail('username', 'กรุณากรอกชื่อผู้ใช้');
  const password = typeof input.password === 'string' ? input.password : '';
  if (password === '') check.fail('password', 'กรุณากรอกรหัสผ่าน');
  return check.result({ username, password });
}

/** ขั้นที่ 2: ตั๋วจากขั้นที่ 1 + PIN */
export function validatePinStepInput(raw: unknown): ValidationResult<{ challenge: string; pin: string }> {
  const input = asRecord(raw);
  const check = new Check();
  const challenge = typeof input.challenge === 'string' ? input.challenge : '';
  if (challenge === '') check.fail('challenge', 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อน');
  const pin = typeof input.pin === 'string' ? input.pin.trim() : '';
  if (pin === '') check.fail('pin', 'กรุณากรอก PIN');
  return check.result({ challenge, pin });
}

export interface UserAccountInput {
  username: string;
  displayName: string;
  department: string;
  role: UserRole;
  status: UserStatus;
  allowedRoomIds: string[];
}

function roomIdList(check: Check, raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string' || item.trim() === '' || item.includes(',') || item.length > 60)) {
    check.fail('allowedRoomIds', 'รายการห้องไม่ถูกต้อง');
    return [];
  }
  return [...new Set(raw.map((item: string) => item.trim()))];
}

/** เพิ่ม/แก้บัญชี — สร้างใหม่ต้องมีรหัสผ่านและ PIN แรกเข้า, แก้ไขไม่ต้องส่ง */
export function validateUserAccountInput(
  raw: unknown,
  options: { requirePin: boolean },
): ValidationResult<UserAccountInput & { pin: string; password: string }> {
  const input = asRecord(raw);
  const check = new Check();
  const username = normalizeUsername(input.username);
  if (!USERNAME_PATTERN.test(username)) {
    check.fail('username', 'ชื่อผู้ใช้ต้องเป็น a-z, 0-9, จุด, ขีด ยาว 3–32 ตัว');
  }
  const pin = typeof input.pin === 'string' ? input.pin.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (options.requirePin) {
    const pinIssue = pinProblem(pin);
    if (pinIssue !== null) check.fail('pin', pinIssue);
    const passwordIssue = passwordProblem(password);
    if (passwordIssue !== null) check.fail('password', passwordIssue);
  }
  return check.result({
    username,
    displayName: check.string('displayName', input.displayName, { label: 'ชื่อ-นามสกุล', min: 1, max: 100 }),
    department: check.string('department', input.department, { label: 'หน่วยงาน', max: 100, fallback: '' }),
    role: check.oneOf('role', input.role, USER_ROLES, { label: 'สิทธิ์การใช้งาน' }),
    status: check.oneOf('status', input.status, USER_STATUSES, { label: 'สถานะผู้ใช้', fallback: 'active' }),
    allowedRoomIds: roomIdList(check, input.allowedRoomIds),
    pin,
    password,
  });
}

export function validateResetPinInput(raw: unknown): ValidationResult<{ username: string; pin: string }> {
  const input = asRecord(raw);
  const check = new Check();
  const username = normalizeUsername(input.username);
  if (username === '') check.fail('username', 'ไม่ได้ระบุผู้ใช้');
  const pin = typeof input.pin === 'string' ? input.pin.trim() : '';
  const problem = pinProblem(pin);
  if (problem !== null) check.fail('pin', problem);
  return check.result({ username, pin });
}

export function validateResetPasswordInput(raw: unknown): ValidationResult<{ username: string; password: string }> {
  const input = asRecord(raw);
  const check = new Check();
  const username = normalizeUsername(input.username);
  if (username === '') check.fail('username', 'ไม่ได้ระบุผู้ใช้');
  const password = typeof input.password === 'string' ? input.password : '';
  const problem = passwordProblem(password);
  if (problem !== null) check.fail('password', problem);
  return check.result({ username, password });
}

/**
 * กันระบบไม่มีผู้ดูแลเหลือ: คืนข้อความเมื่อการเปลี่ยนนี้ทำให้ไม่เหลือแอดมินที่ใช้งานได้
 * `next` = null หมายถึงลบบัญชีนั้นทิ้ง
 */
export function lastAdminProblem(
  users: readonly { username: string; role: string; status: string }[],
  username: string,
  next: { role: string; status: string } | null,
): string | null {
  const remaining = users.filter((user) => {
    const view = user.username === username ? next : user;
    return view !== null && view.role === 'admin' && view.status === 'active';
  });
  return remaining.length === 0 ? 'ต้องเหลือผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 คน' : null;
}

/**
 * บัญชีตั้งต้นของวิทยาลัย — สคริปต์ติดตั้งสร้างให้ (สุ่มรหัสผ่านและ PIN แล้วพิมพ์ลง log ให้เจ้าของสคริปต์)
 * ชื่อผู้ลงนามตรงกับแบบคำขอใช้ห้องประชุม (domain/approval.ts)
 */
export const COLLEGE_ACCOUNTS: readonly { username: string; displayName: string; department: string; role: UserRole }[] = [
  { username: 'shoyu', displayName: 'shoyu', department: 'ผู้ดูแลระบบ', role: 'admin' },
  { username: 'watcharapong', displayName: 'นายวัชรพงศ์ โสภา', department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร', role: 'inspector' },
  { username: 'ekkarat', displayName: 'นายเอกราช เขียวทอง', department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร', role: 'endorser' },
  { username: 'chatree', displayName: 'นายชาตรี เริงชัยภูมิ', department: 'ฝ่ายพัฒนายุทธศาสตร์และแผนงาน', role: 'director' },
];
