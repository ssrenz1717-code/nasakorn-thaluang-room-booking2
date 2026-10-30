import type { UserRole } from '../schemas/user';

/**
 * การอนุมัติ 3 ขั้นตามแบบคำขอใช้ห้องประชุม แต่ละขั้นลงนามโดยบัญชีคนละคน
 *   1. เจ้าหน้าที่ตรวจสอบห้อง (inspector) → 2. ผู้รับรอง (endorser) → 3. ผู้อนุมัติ (director)
 * ขั้นไหนไม่อนุมัติ คำขอจบที่ "ถูกปฏิเสธ" ทันที / ขั้น 3 อนุมัติ = ยืนยันแล้ว ใช้ห้องได้
 */
/**
 * printedName / printedPosition = ชื่อและตำแหน่งที่พิมพ์ไว้ในแบบฟอร์มต้นฉบับ
 * ใช้พิมพ์ใต้ช่องลงชื่อเมื่อขั้นนั้นยังไม่มีคนลงนามในระบบ (ลงนามแล้วจะใช้ชื่อจากบัญชีที่ลงนามจริง)
 */
export const APPROVAL_STEPS = [
  {
    step: 1, role: 'inspector', action: 'ตรวจสอบห้อง', signer: 'เจ้าหน้าที่ผู้ตรวจสอบห้อง', waiting: 'รอเจ้าหน้าที่ตรวจห้อง',
    printedName: 'นายวัชรพงศ์ โสภา', printedPosition: 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร',
  },
  {
    step: 2, role: 'endorser', action: 'รับรอง', signer: 'หัวหน้างาน / ผู้รับรอง', waiting: 'รอผู้รับรอง',
    printedName: 'นายเอกราช เขียวทอง', printedPosition: 'หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร',
  },
  {
    step: 3, role: 'director', action: 'อนุมัติ', signer: 'ผู้พิจารณาอนุมัติ', waiting: 'รอผู้อนุมัติ',
    printedName: 'นายชาตรี เริงชัยภูมิ', printedPosition: 'รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน',
  },
] as const satisfies readonly {
  step: number; role: UserRole; action: string; signer: string; waiting: string; printedName: string; printedPosition: string;
}[];

export type ApprovalStepNumber = (typeof APPROVAL_STEPS)[number]['step'];

export interface ApprovalEntry {
  step: number;
  decision: 'approve' | 'reject';
  email: string;
  name: string;
  at: string;
  reason: string;
}

export interface ApprovalState {
  status: string;
  /** ขั้นที่รออยู่ 1–3 (0 = ไม่ได้รออนุมัติ) */
  approvalStep: number;
  approvalLog: ApprovalEntry[];
}

/** ขั้นที่คำขอนี้รออยู่ — รายการเก่าที่ยังไม่มีข้อมูลขั้นถือว่ารอขั้นที่ 1 */
export function currentApprovalStep(booking: { status: string; approvalStep?: unknown }): number {
  if (booking.status !== 'pending') return 0;
  const step = Number(booking.approvalStep);
  return Number.isInteger(step) && step >= 1 && step <= APPROVAL_STEPS.length ? step : 1;
}

/** role ที่ลงนามขั้นนี้ได้ */
export function roleForStep(step: number): UserRole | null {
  return APPROVAL_STEPS.find((item) => item.step === step)?.role ?? null;
}

/** ขั้นที่ role นี้รับผิดชอบ (0 = ไม่ได้เป็นผู้อนุมัติ) */
export function stepForRole(role: UserRole): number {
  return APPROVAL_STEPS.find((item) => item.role === role)?.step ?? 0;
}

/** ผู้ดูแลและผู้อนุมัติทุกขั้นเห็นการจองของทุกคน ผู้ใช้ทั่วไปเห็นเฉพาะของตัวเอง */
export function canSeeAllBookings(role: UserRole): boolean {
  return role !== 'staff';
}

/** คำขอที่รอ "คนนี้" ลงนามอยู่ตอนนี้ */
export function isAwaitingRole(booking: { status: string; approvalStep?: unknown }, role: UserRole): boolean {
  const step = currentApprovalStep(booking);
  return step > 0 && roleForStep(step) === role;
}

/** อ่านประวัติการลงนามจากชีต (เก็บเป็น JSON) — ข้อมูลเสียให้ถือว่ายังไม่มีใครลงนาม */
export function parseApprovalLog(raw: unknown): ApprovalEntry[] {
  if (Array.isArray(raw)) return raw as ApprovalEntry[];
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw.replace(/^'/, ''));
    return Array.isArray(parsed) ? (parsed as ApprovalEntry[]) : [];
  } catch {
    return [];
  }
}

export type DecideResult =
  | { ok: true; next: ApprovalState; finished: boolean; nextStep: number }
  | { ok: false; code: 'CONFLICT' | 'FORBIDDEN' | 'VALIDATION'; message: string };

/**
 * ลงนามขั้นปัจจุบัน — ใช้ทั้งฝั่ง server และโหมดข้อมูลในเบราว์เซอร์ กฎจึงตรงกันเสมอ
 */
export function decideApprovalStep(
  booking: ApprovalState,
  actor: { email: string; displayName: string; role: UserRole },
  decision: 'approve' | 'reject',
  reason: string,
  nowIso: string,
): DecideResult {
  const step = currentApprovalStep(booking);
  if (step === 0) return { ok: false, code: 'CONFLICT', message: 'รายการนี้ไม่ได้อยู่ระหว่างรออนุมัติ' };
  const stepInfo = APPROVAL_STEPS[step - 1]!;
  if (actor.role !== stepInfo.role) {
    return { ok: false, code: 'FORBIDDEN', message: `ขั้นนี้ (${stepInfo.action}) ต้องลงนามโดย${stepInfo.signer}` };
  }
  const email = actor.email.toLowerCase();
  if (booking.approvalLog.some((entry) => entry.email.toLowerCase() === email)) {
    return { ok: false, code: 'FORBIDDEN', message: 'บัญชีนี้ลงนามในขั้นก่อนหน้าแล้ว แต่ละขั้นต้องเป็นคนละบัญชี' };
  }
  const trimmed = reason.trim();
  if (decision === 'reject' && trimmed === '') {
    return { ok: false, code: 'VALIDATION', message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' };
  }
  const entry: ApprovalEntry = { step, decision, email: actor.email, name: actor.displayName, at: nowIso, reason: trimmed };
  const approvalLog = [...booking.approvalLog, entry];
  if (decision === 'reject') {
    return { ok: true, next: { status: 'rejected', approvalStep: 0, approvalLog }, finished: true, nextStep: 0 };
  }
  if (step === APPROVAL_STEPS.length) {
    return { ok: true, next: { status: 'confirmed', approvalStep: 0, approvalLog }, finished: true, nextStep: 0 };
  }
  return { ok: true, next: { status: 'pending', approvalStep: step + 1, approvalLog }, finished: false, nextStep: step + 1 };
}
