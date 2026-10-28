/**
 * Session token ของระบบ
 *
 * ทำไมต้องมี token ของเราเอง: พนักงานใช้บัญชี Gmail ส่วนตัว ไม่ใช่ Google Workspace
 * ขององค์กร ทำให้ Session.getActiveUser() ของ Apps Script คืนค่าว่าง (Apps Script
 * เปิดเผยอีเมลผู้ใช้ให้เฉพาะคนในโดเมนเดียวกับเจ้าของสคริปต์)
 * จึงต้องให้หน้าเว็บ login ด้วย Google Sign-In แล้วเอา ID token มาให้ server ตรวจ
 * กับ Google หนึ่งครั้ง จากนั้นออก token ของเราเองไว้ใช้ในคำขอต่อ ๆ ไป
 *
 * รูปแบบ token: email|role|tokenVersion|expiresAt|signature
 * ไม่ใช้ base64/JWT เพราะ shared ห้ามพึ่ง dependency และ Apps Script กับเบราว์เซอร์
 * มี API เข้ารหัส base64 ไม่เหมือนกัน — รูปแบบนี้อ่านด้วยตาได้ตอน debug ด้วย
 *
 * tokenVersion คือกลไกถอนสิทธิ์ทันที: เมื่อผู้ดูแลลดสิทธิ์หรือปิดบัญชีใคร
 * เราบวก tokenVersion ของคนนั้นในชีต token ทุกใบที่ออกไปแล้วจะใช้ไม่ได้ทันที
 * โดยไม่ต้องรอหมดอายุ และไม่ต้องเก็บรายการ token ไว้ที่ไหนเลย
 */

import type { UserRole } from '../schemas/user';
import { USER_ROLES } from '../schemas/user';

/** ฟังก์ชันเซ็นข้อความ — ฉีดเข้ามาเพราะ Apps Script และ Node มี API ไม่เหมือนกัน */
export type HmacFn = (message: string, secret: string) => string;

export interface SessionPayload {
  email: string;
  role: UserRole;
  tokenVersion: number;
  /** เวลาหมดอายุเป็นมิลลิวินาที epoch */
  expiresAt: number;
}

export type SessionFailureReason = 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED';

export type SessionVerifyResult =
  | { ok: true; payload: SessionPayload }
  | { ok: false; reason: SessionFailureReason };

const SEPARATOR = '|';

function payloadString(payload: SessionPayload): string {
  return [payload.email, payload.role, String(payload.tokenVersion), String(payload.expiresAt)].join(
    SEPARATOR,
  );
}

export function createSessionToken(
  payload: SessionPayload,
  secret: string,
  hmac: HmacFn,
): string {
  if (payload.email.includes(SEPARATOR)) {
    throw new Error('อีเมลมีอักขระที่ใช้ไม่ได้');
  }
  if (secret === '') {
    throw new Error('ยังไม่ได้ตั้งค่ากุญแจลับของระบบ');
  }
  const body = payloadString(payload);
  return `${body}${SEPARATOR}${hmac(body, secret)}`;
}

/**
 * ตรวจ token — ตรวจลายเซ็นก่อนเชื่อข้อมูลข้างในทุกครั้ง
 * ผู้เรียกยังต้องเทียบ tokenVersion กับค่าในชีตอีกชั้น เพราะ token ที่ลายเซ็นถูก
 * อาจเป็นใบเก่าของคนที่เพิ่งถูกถอนสิทธิ์
 */
export function verifySessionToken(
  token: string,
  secret: string,
  hmac: HmacFn,
  nowMs: number,
): SessionVerifyResult {
  if (typeof token !== 'string' || token === '' || secret === '') {
    return { ok: false, reason: 'MALFORMED' };
  }

  const lastSeparator = token.lastIndexOf(SEPARATOR);
  if (lastSeparator <= 0) return { ok: false, reason: 'MALFORMED' };

  const body = token.substring(0, lastSeparator);
  const signature = token.substring(lastSeparator + 1);
  const parts = body.split(SEPARATOR);
  if (parts.length !== 4 || signature === '') return { ok: false, reason: 'MALFORMED' };

  const [email, role, tokenVersionRaw, expiresAtRaw] = parts;
  if (
    email === undefined ||
    email === '' ||
    role === undefined ||
    !(USER_ROLES as readonly string[]).includes(role) ||
    tokenVersionRaw === undefined ||
    expiresAtRaw === undefined
  ) {
    return { ok: false, reason: 'MALFORMED' };
  }

  const tokenVersion = Number(tokenVersionRaw);
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isInteger(tokenVersion) || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: 'MALFORMED' };
  }

  // เทียบลายเซ็นก่อนดูวันหมดอายุ เพื่อไม่บอกใบ้ว่า token ปลอมใบนี้ "หมดอายุ" หรือ "ลายเซ็นผิด"
  if (!constantTimeEquals(signature, hmac(body, secret))) {
    return { ok: false, reason: 'BAD_SIGNATURE' };
  }

  if (nowMs >= expiresAt) return { ok: false, reason: 'EXPIRED' };

  return {
    ok: true,
    payload: { email, role: role as UserRole, tokenVersion, expiresAt },
  };
}

/**
 * เทียบข้อความแบบใช้เวลาคงที่
 * การเทียบด้วย === จะหยุดทันทีที่พบตัวอักษรต่าง ทำให้ผู้โจมตีวัดเวลาเพื่อเดาลายเซ็นทีละตัวได้
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function sessionExpiryFrom(nowMs: number, ttlMs: number): number {
  return nowMs + ttlMs;
}
