import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  type HmacFn,
  type SessionPayload,
  constantTimeEquals,
  createSessionToken,
  sessionExpiryFrom,
  verifySessionToken,
} from '../auth/session';

/** ในเทสใช้ crypto ของ Node — บน Apps Script ใช้ Utilities.computeHmacSha256Signature */
const hmac: HmacFn = (message, secret) =>
  createHmac('sha256', secret).update(message).digest('base64');

const SECRET = 'กุญแจลับสำหรับเทส-0123456789';
const NOW = Date.UTC(2026, 9, 28, 2, 0, 0);

const payload: SessionPayload = {
  email: 'somchai@gmail.com',
  role: 'staff',
  tokenVersion: 3,
  expiresAt: NOW + 12 * 60 * 60 * 1000,
};

describe('session token', () => {
  it('ออก token แล้วตรวจกลับได้ค่าเดิม', () => {
    const token = createSessionToken(payload, SECRET, hmac);
    const result = verifySessionToken(token, SECRET, hmac, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload).toEqual(payload);
  });

  it('แก้ข้อมูลใน token แม้ตัวเดียว ลายเซ็นต้องไม่ผ่าน', () => {
    const token = createSessionToken(payload, SECRET, hmac);

    const elevated = token.replace('|staff|', '|admin|');
    expect(verifySessionToken(elevated, SECRET, hmac, NOW)).toEqual({
      ok: false,
      reason: 'BAD_SIGNATURE',
    });

    const otherUser = token.replace('somchai@', 'boss@');
    expect(verifySessionToken(otherUser, SECRET, hmac, NOW).ok).toBe(false);

    const longerLife = createSessionToken(payload, SECRET, hmac).replace(
      String(payload.expiresAt),
      String(payload.expiresAt + 86_400_000),
    );
    expect(verifySessionToken(longerLife, SECRET, hmac, NOW).ok).toBe(false);
  });

  it('token ที่เซ็นด้วยกุญแจอื่นใช้ไม่ได้', () => {
    const token = createSessionToken(payload, 'กุญแจของคนอื่น', hmac);
    expect(verifySessionToken(token, SECRET, hmac, NOW)).toEqual({
      ok: false,
      reason: 'BAD_SIGNATURE',
    });
  });

  it('หมดอายุแล้วใช้ไม่ได้ และหมดอายุพอดีวินาทีนั้นก็ใช้ไม่ได้', () => {
    const token = createSessionToken(payload, SECRET, hmac);
    expect(verifySessionToken(token, SECRET, hmac, payload.expiresAt)).toEqual({
      ok: false,
      reason: 'EXPIRED',
    });
    expect(verifySessionToken(token, SECRET, hmac, payload.expiresAt + 1)).toEqual({
      ok: false,
      reason: 'EXPIRED',
    });
    expect(verifySessionToken(token, SECRET, hmac, payload.expiresAt - 1).ok).toBe(true);
  });

  it('token รูปแบบเพี้ยนไม่ทำให้ระบบล้ม', () => {
    for (const bad of ['', 'abc', 'a|b', 'a|b|c|d', 'a|staff|x|y|sig', '|||']) {
      const result = verifySessionToken(bad, SECRET, hmac, NOW);
      expect(result.ok, `ค่า "${bad}"`).toBe(false);
    }
  });

  it('สิทธิ์ที่ไม่มีอยู่จริงใน token ถูกปฏิเสธก่อนเทียบลายเซ็น', () => {
    const fake: SessionPayload = { ...payload, role: 'superadmin' as never };
    const token = createSessionToken(fake, SECRET, hmac);
    expect(verifySessionToken(token, SECRET, hmac, NOW)).toEqual({
      ok: false,
      reason: 'MALFORMED',
    });
  });

  it('ไม่มีกุญแจลับ = ออก token ไม่ได้ และตรวจไม่ผ่าน', () => {
    expect(() => createSessionToken(payload, '', hmac)).toThrowError(/กุญแจลับ/);
    const token = createSessionToken(payload, SECRET, hmac);
    expect(verifySessionToken(token, '', hmac, NOW).ok).toBe(false);
  });

  it('อีเมลที่มีอักขระคั่นข้อมูลถูกปฏิเสธตอนออก token', () => {
    expect(() =>
      createSessionToken({ ...payload, email: 'a|b@x.com' }, SECRET, hmac),
    ).toThrowError(/อีเมล/);
  });

  it('เทียบข้อความแบบเวลาคงที่', () => {
    expect(constantTimeEquals('abc', 'abc')).toBe(true);
    expect(constantTimeEquals('abc', 'abd')).toBe(false);
    expect(constantTimeEquals('abc', 'ab')).toBe(false);
    expect(constantTimeEquals('', '')).toBe(true);
  });

  it('คำนวณเวลาหมดอายุ', () => {
    expect(sessionExpiryFrom(1000, 500)).toBe(1500);
  });
});
