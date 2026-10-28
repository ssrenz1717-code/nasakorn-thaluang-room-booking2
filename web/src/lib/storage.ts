/**
 * อ่าน/เขียน localStorage แบบไม่ทำให้แอปล้ม
 *
 * localStorage พังได้จริงในโหมดส่วนตัว หรือเมื่อผู้ใช้ปิดการเก็บข้อมูลเว็บไซต์
 * (การเข้าถึงจะ throw ไม่ใช่คืน null) จึงต้องหุ้ม try/catch ทุกครั้ง
 */

export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // เก็บไม่ได้ก็ไม่เป็นไร ผู้ใช้แค่ต้องเข้าสู่ระบบใหม่เมื่อรีเฟรช
  }
}

export function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // เงียบไว้ — การลบล้มเหลวไม่กระทบการทำงานหลัก
  }
}
