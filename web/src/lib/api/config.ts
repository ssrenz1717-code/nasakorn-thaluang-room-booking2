/**
 * ค่าตั้งค่าของหน้าเว็บ อ่านจากตัวแปรสภาพแวดล้อมตอน build
 *
 * ถ้ายังไม่ได้ตั้งค่า (เช่น เปิดดูจาก GitHub Pages ก่อนตั้ง Apps Script เสร็จ)
 * ระบบจะเข้าโหมดสาธิตโดยอัตโนมัติ และบอกผู้ใช้ตรง ๆ ว่ายังไม่ได้เชื่อมต่อ
 * ไม่ใช่แสดงข้อมูลตัวอย่างเนียน ๆ เหมือนเป็นข้อมูลจริง
 */

export interface AppConfig {
  apiUrl: string;
  googleClientId: string;
  /** เชื่อมต่อ server จริงได้หรือยัง */
  isConnected: boolean;
  /** ผู้ใช้ขอโหมดสาธิตเองผ่าน ?demo=1 */
  isDemoRequested: boolean;
}

const PLACEHOLDER_HINTS = ['xxxxxxxx', 'ใส่', 'your-', 'example'];

function isPlaceholder(value: string): boolean {
  if (value.trim() === '') return true;
  const lowered = value.toLowerCase();
  return PLACEHOLDER_HINTS.some((hint) => lowered.includes(hint));
}

export function readAppConfig(): AppConfig {
  const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim();
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

  const isDemoRequested =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('demo') === '1';

  return {
    apiUrl,
    googleClientId,
    isConnected: !isPlaceholder(apiUrl) && !isPlaceholder(googleClientId),
    isDemoRequested,
  };
}
