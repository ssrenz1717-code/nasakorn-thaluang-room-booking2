/**
 * ชั้นรับส่งข้อมูลกับ Apps Script
 *
 * สองเรื่องที่ต้องทำให้ถูก ไม่ใช่เรื่องสไตล์:
 *
 * 1. Content-Type ต้องเป็น text/plain ไม่ใช่ application/json
 *    เพราะ Apps Script ตั้ง CORS header เองไม่ได้ ถ้าส่ง application/json
 *    เบราว์เซอร์จะยิง preflight OPTIONS ก่อน ซึ่ง Apps Script ตอบไม่ได้
 *    → คำขอถูกบล็อกด้วย CORS error ทั้งที่ server ทำงานปกติ
 *    text/plain เป็น "simple request" เบราว์เซอร์จึงส่งตรงไม่ต้อง preflight
 *
 * 2. ต้องยอมให้ตาม redirect
 *    Apps Script ตอบ 302 ไปที่ script.googleusercontent.com ก่อนเสมอ
 *    fetch ตาม redirect ให้เองโดยค่าเริ่มต้น จึงไม่ต้องตั้งอะไร แต่ห้ามตั้งเป็น 'error'
 *
 * อีกข้อ: Apps Script ตอบ HTTP 200 เสมอแม้งานล้มเหลว จึงต้องดูฟิลด์ ok ในเนื้อหา
 * ไม่ใช่ดู response.status
 */

import { ApiError, type ApiEnvelope, type Transport, type VersionResult } from './types';

const TIMEOUT_MS = 30_000;

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    throw new ApiError(
      'NETWORK',
      aborted
        ? 'เชื่อมต่อนานเกินไป ระบบอาจมีคนใช้งานพร้อมกันมาก กรุณาลองอีกครั้ง'
        : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง',
    );
  } finally {
    window.clearTimeout(timer);
  }

  const text = await response.text();
  let envelope: ApiEnvelope<T>;
  try {
    envelope = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    // ปกติเกิดเมื่อ URL ผิด หรือ deployment ยังไม่ให้สิทธิ์ "Anyone" แล้ว Google ส่งหน้า HTML ล็อกอินกลับมา
    throw new ApiError(
      'NETWORK',
      'เซิร์ฟเวอร์ตอบกลับมาในรูปแบบที่อ่านไม่ได้ — ตรวจว่า URL ถูกต้องและ deploy ด้วยสิทธิ์ Anyone',
    );
  }

  if (envelope.ok) return envelope.data;

  throw new ApiError(
    normalizeCode(envelope.error.code),
    envelope.error.message || 'เกิดข้อผิดพลาด',
    envelope.error.issues ?? [],
  );
}

function normalizeCode(code: string): ApiError['code'] {
  const known = [
    'BAD_REQUEST',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'VALIDATION',
    'BUSY',
    'NOT_CONFIGURED',
    'INTERNAL',
  ];
  return (known.includes(code) ? code : 'INTERNAL') as ApiError['code'];
}

export function createHttpTransport(apiUrl: string): Transport {
  return {
    kind: 'http',

    call<T>(action: string, payload: unknown = {}, token = ''): Promise<T> {
      return requestJson<T>(apiUrl, {
        method: 'POST',
        // ห้ามเปลี่ยนเป็น application/json — อ่านเหตุผลในหัวข้อ 1 ด้านบนของไฟล์นี้
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token, payload }),
      });
    },

    version(): Promise<VersionResult> {
      const separator = apiUrl.includes('?') ? '&' : '?';
      return requestJson<VersionResult>(`${apiUrl}${separator}action=version`, { method: 'GET' });
    },
  };
}
