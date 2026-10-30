import { describe, expect, it } from 'vitest';
import { currentApprovalStep, decideApprovalStep, isAwaitingRole, parseApprovalLog, type ApprovalState } from '../domain/approval';
import { normalizeUserRole } from '../schemas/user';

const NOW = '2026-10-30T09:00:00.000Z';
const inspector = { email: 'watcharapong@college.ac.th', displayName: 'นายวัชรพงศ์ โสภา', role: 'inspector' as const };
const endorser = { email: 'ekkarat@college.ac.th', displayName: 'นายเอกราช เขียวทอง', role: 'endorser' as const };
const director = { email: 'chatree@college.ac.th', displayName: 'นายชาตรี เริงชัยภูมิ', role: 'director' as const };
const fresh: ApprovalState = { status: 'pending', approvalStep: 1, approvalLog: [] };

function approve(state: ApprovalState, actor: typeof inspector | typeof endorser | typeof director) {
  const result = decideApprovalStep(state, actor, 'approve', '', NOW);
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe('อนุมัติ 3 ขั้น', () => {
  it('ตรวจห้อง -> รับรอง -> อนุมัติ แล้วจึงยืนยัน พร้อมประวัติผู้ลงนามครบ', () => {
    const one = approve(fresh, inspector);
    expect(one.next).toMatchObject({ status: 'pending', approvalStep: 2 });
    expect(one.nextStep).toBe(2);
    expect(isAwaitingRole(one.next, 'endorser')).toBe(true);
    expect(isAwaitingRole(one.next, 'inspector')).toBe(false);

    const two = approve(one.next, endorser);
    expect(two.next).toMatchObject({ status: 'pending', approvalStep: 3 });

    const three = approve(two.next, director);
    expect(three.finished).toBe(true);
    expect(three.next).toMatchObject({ status: 'confirmed', approvalStep: 0 });
    expect(three.next.approvalLog.map((entry) => entry.name)).toEqual(['นายวัชรพงศ์ โสภา', 'นายเอกราช เขียวทอง', 'นายชาตรี เริงชัยภูมิ']);
  });

  it('ข้ามขั้นไม่ได้: ผู้อนุมัติกดก่อนเจ้าหน้าที่ตรวจห้องไม่ได้', () => {
    const result = decideApprovalStep(fresh, director, 'approve', '', NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe('FORBIDDEN');
  });

  it('บัญชีเดียวลงนามสองขั้นไม่ได้ แม้จะถูกเปลี่ยนสิทธิ์ภายหลัง', () => {
    const one = approve(fresh, inspector);
    const sameAccount = { ...inspector, role: 'endorser' as const };
    const result = decideApprovalStep(one.next, sameAccount, 'approve', '', NOW);
    expect(result.ok).toBe(false);
  });

  it('ไม่อนุมัติขั้นไหนก็จบที่ถูกปฏิเสธ และต้องมีเหตุผล', () => {
    const one = approve(fresh, inspector);
    expect(decideApprovalStep(one.next, endorser, 'reject', '  ', NOW).ok).toBe(false);
    const rejected = decideApprovalStep(one.next, endorser, 'reject', 'ห้องมีกิจกรรมของวิทยาลัย', NOW);
    expect(rejected.ok && rejected.next).toMatchObject({ status: 'rejected', approvalStep: 0 });
  });

  it('รายการเก่าที่ไม่มีข้อมูลขั้นถือว่ารอขั้นที่ 1 และอ่านประวัติจากชีตได้', () => {
    expect(currentApprovalStep({ status: 'pending' })).toBe(1);
    expect(currentApprovalStep({ status: 'confirmed', approvalStep: 2 })).toBe(0);
    expect(parseApprovalLog("'[{\"step\":1}]")).toEqual([{ step: 1 }]);
    expect(parseApprovalLog('เสีย')).toEqual([]);
    expect(normalizeUserRole('director')).toBe('director');
    expect(normalizeUserRole('superuser')).toBe('staff');
  });
});
