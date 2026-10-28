/**
 * ต่อ class ของ Tailwind แบบรองรับค่า false/undefined
 * เขียนเองสิบบรรทัดแทนการเพิ่ม dependency เพราะใช้แค่เท่านี้จริง ๆ
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
