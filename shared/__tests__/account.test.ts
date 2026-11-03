import { describe, expect, it } from 'vitest';
import {
  canUseRoom,
  constantTimeEqual,
  lastAdminProblem,
  passwordProblem,
  pinProblem,
  validateLoginInput,
  validatePinLoginInput,
  validateResetPasswordInput,
  validateResetPinInput,
  validateUserAccountInput,
} from '../schemas/user';

describe('PIN', () => {
  it('รับเลข 6 หลักที่ไม่เดาง่าย', () => {
    expect(pinProblem('240617')).toBeNull();
    expect(pinProblem('135790')).toBeNull();
  });
  it('ไม่รับความยาวผิด ตัวอักษร เลขซ้ำ และเลขเรียง', () => {
    expect(pinProblem('12345')).not.toBeNull();
    expect(pinProblem('12a456')).not.toBeNull();
    expect(pinProblem('000000')).not.toBeNull();
    expect(pinProblem('123456')).not.toBeNull();
    expect(pinProblem('654321')).not.toBeNull();
    expect(pinProblem(123456)).not.toBeNull();
  });
});

describe('รหัสผ่าน', () => {
  it('ต้องยาว 8 ตัวขึ้นไป มีทั้งตัวอักษรและตัวเลข ไม่มีช่องว่าง', () => {
    expect(passwordProblem('Thaluang2026')).toBeNull();
    expect(passwordProblem('abc123')).not.toBeNull();
    expect(passwordProblem('abcdefgh')).not.toBeNull();
    expect(passwordProblem('12345678')).not.toBeNull();
    expect(passwordProblem('abcd 1234')).not.toBeNull();
  });
});

describe('ฟอร์มบัญชีผู้ใช้', () => {
  const base = { username: ' Shoyu ', displayName: 'shoyu', role: 'admin', pin: '240617', password: 'Thaluang2026' };

  it('ทำชื่อผู้ใช้เป็นตัวเล็กและตัดช่องว่าง', () => {
    const result = validateUserAccountInput(base, { requirePin: true });
    expect(result.ok && result.value.username).toBe('shoyu');
  });
  it('ชื่อผู้ใช้มีอักขระแปลกหรือสั้นเกินไม่ผ่าน', () => {
    expect(validateUserAccountInput({ ...base, username: 'ab' }, { requirePin: true }).ok).toBe(false);
    expect(validateUserAccountInput({ ...base, username: 'ชื่อไทย' }, { requirePin: true }).ok).toBe(false);
    expect(validateUserAccountInput({ ...base, username: 'a|b|c' }, { requirePin: true }).ok).toBe(false);
  });
  it('สร้างใหม่ต้องมีทั้งรหัสผ่านและ PIN แต่แก้ไขไม่ต้อง', () => {
    expect(validateUserAccountInput({ ...base, pin: '' }, { requirePin: true }).ok).toBe(false);
    expect(validateUserAccountInput({ ...base, password: '' }, { requirePin: true }).ok).toBe(false);
    expect(validateUserAccountInput({ ...base, pin: '', password: '' }, { requirePin: false }).ok).toBe(true);
  });
  it('สิทธิ์ที่ไม่มีอยู่จริงไม่ผ่าน', () => {
    expect(validateUserAccountInput({ ...base, role: 'superadmin' }, { requirePin: true }).ok).toBe(false);
  });
  it('รายการห้องตัดค่าซ้ำ และไม่รับค่าที่ไม่ใช่ข้อความ', () => {
    const ok = validateUserAccountInput({ ...base, allowedRoomIds: ['R01', 'R01', 'R02'] }, { requirePin: true });
    expect(ok.ok && ok.value.allowedRoomIds).toEqual(['R01', 'R02']);
    expect(validateUserAccountInput({ ...base, allowedRoomIds: [1] }, { requirePin: true }).ok).toBe(false);
  });
  it('เข้าสู่ระบบ/รีเซ็ต ตรวจช่องว่างและค่าใหม่', () => {
    expect(validateLoginInput({ username: '', password: '' }).ok).toBe(false);
    expect(validateLoginInput({ username: 'shoyu', password: 'x' }).ok).toBe(true);
    expect(validatePinLoginInput({ pin: '24061' }).ok).toBe(false);
    expect(validatePinLoginInput({ pin: '240617' }).ok).toBe(true);
    expect(validateResetPasswordInput({ username: 'abc', password: 'short1' }).ok).toBe(false);
    expect(validateResetPasswordInput({ username: 'abc', password: 'longenough1' }).ok).toBe(true);
    expect(validateResetPinInput({ username: 'a', pin: '111111' }).ok).toBe(false);
    expect(validateResetPinInput({ username: 'abc', pin: '240617' }).ok).toBe(true);
  });
});

describe('สิทธิ์ห้อง', () => {
  it('รายการว่าง = ทุกห้อง, มีรายการ = เฉพาะห้องนั้น, แอดมินได้ทุกห้อง', () => {
    expect(canUseRoom({ role: 'staff', allowedRoomIds: [] }, 'R01')).toBe(true);
    expect(canUseRoom({ role: 'staff', allowedRoomIds: ['R02'] }, 'R01')).toBe(false);
    expect(canUseRoom({ role: 'staff', allowedRoomIds: ['R02'] }, 'R02')).toBe(true);
    expect(canUseRoom({ role: 'admin', allowedRoomIds: ['R02'] }, 'R01')).toBe(true);
  });
});

describe('ผู้ดูแลคนสุดท้าย', () => {
  const users = [
    { username: 'shoyu', role: 'admin', status: 'active' },
    { username: 'staff1', role: 'staff', status: 'active' },
  ];
  it('ลบ ปิด หรือลดสิทธิ์แอดมินคนสุดท้ายไม่ได้', () => {
    expect(lastAdminProblem(users, 'shoyu', null)).not.toBeNull();
    expect(lastAdminProblem(users, 'shoyu', { role: 'admin', status: 'disabled' })).not.toBeNull();
    expect(lastAdminProblem(users, 'shoyu', { role: 'staff', status: 'active' })).not.toBeNull();
  });
  it('มีแอดมินอีกคนแล้วทำได้', () => {
    const two = [...users, { username: 'admin2', role: 'admin', status: 'active' }];
    expect(lastAdminProblem(two, 'shoyu', null)).toBeNull();
    expect(lastAdminProblem(users, 'staff1', null)).toBeNull();
  });
});

describe('เทียบ hash', () => {
  it('เท่ากันเมื่อเหมือนกันทุกตัวเท่านั้น', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
