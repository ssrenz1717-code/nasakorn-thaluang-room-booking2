/**
 * จัดรูปแบบวันที่และเวลาแบบไทย
 *
 * ทุกฟังก์ชันระบุ timeZone: 'Asia/Bangkok' ชัดเจน ไม่พึ่ง timezone ของเครื่องผู้ใช้
 * และแสดงปีเป็น พ.ศ. ผ่านปฏิทินพุทธของ Intl (ข้อมูลในฐานข้อมูลยังเป็น ค.ศ. เสมอ
 * การแปลงเกิดขึ้นตอนแสดงผลที่นี่ที่เดียว)
 */

import { BANGKOK_TZ, formatTimeOfDay, fromDateKeyAndMinutes } from '@shared/time/bangkok';

const THAI_BUDDHIST_LOCALE = 'th-TH-u-ca-buddhist';

const fullDate = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, {
  timeZone: BANGKOK_TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDate = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, {
  timeZone: BANGKOK_TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dayMonth = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, {
  timeZone: BANGKOK_TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const clock = new Intl.DateTimeFormat('th-TH', {
  timeZone: BANGKOK_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const clockWithSeconds = new Intl.DateTimeFormat('th-TH', {
  timeZone: BANGKOK_TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** "พุธที่ 28 ตุลาคม 2569" */
export function formatFullDate(dateKey: string): string {
  return fullDate.format(fromDateKeyAndMinutes(dateKey, 0));
}

/** "28 ต.ค. 2569" */
export function formatShortDate(dateKey: string): string {
  return shortDate.format(fromDateKeyAndMinutes(dateKey, 0));
}

/** "พ. 28 ต.ค." — ใช้ในหัวคอลัมน์ปฏิทินที่พื้นที่แคบ */
export function formatDayMonth(dateKey: string): string {
  return dayMonth.format(fromDateKeyAndMinutes(dateKey, 0));
}

/** "09:00 - 10:30" */
export function formatTimeRange(startMin: number, endMin: number): string {
  return `${formatTimeOfDay(startMin)} - ${formatTimeOfDay(endMin)}`;
}

/** "10:35:12" สำหรับป้าย "อัปเดตล่าสุด" */
export function formatClockWithSeconds(instant: Date): string {
  return clockWithSeconds.format(instant);
}

export function formatClock(instant: Date): string {
  return clock.format(instant);
}

/** "1 ชม. 30 นาที" — อ่านง่ายกว่า "90 นาที" เมื่อยาวเกินหนึ่งชั่วโมง */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ชม.` : `${hours} ชม. ${rest} นาที`;
}

/** "อีก 15 นาที" / "ผ่านไปแล้ว 2 ชม." — ใช้กับรายการที่กำลังจะเริ่ม */
export function formatRelativeToNow(target: Date, now: Date): string {
  const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (diffMinutes === 0) return 'กำลังเริ่ม';
  if (diffMinutes > 0) {
    return diffMinutes < 60
      ? `อีก ${diffMinutes} นาที`
      : `อีก ${formatDuration(diffMinutes)}`;
  }
  const passed = Math.abs(diffMinutes);
  return passed < 60 ? `ผ่านไปแล้ว ${passed} นาที` : `ผ่านไปแล้ว ${formatDuration(passed)}`;
}

/** จำนวนคนแบบมีตัวคั่นหลักพัน */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('th-TH').format(value);
}
