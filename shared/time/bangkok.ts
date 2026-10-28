/**
 * เวลาและวันที่ทั้งระบบผ่านไฟล์นี้ที่เดียว
 *
 * กฎเหล็ก: ห้ามใช้ new Date().getHours() / getDate() ดิบ ๆ ที่ไหนในระบบ
 * เพราะมันอ่านค่าจาก timezone ของเครื่องผู้ใช้ ซึ่งอาจไม่ใช่เวลาไทย
 * (โน้ตบุ๊กที่ตั้ง timezone ผิด หรือ Cloud Functions ที่รันเป็น UTC)
 * ทุกการแปลงต้องระบุ timeZone ชัดเจนผ่านฟังก์ชันในไฟล์นี้
 */

export const BANGKOK_TZ = 'Asia/Bangkok';

/** จำนวนนาทีในหนึ่งวัน — ใช้เป็นขอบบนของ startMin/endMin */
export const MINUTES_PER_DAY = 24 * 60;

/** รูปแบบ dateKey ที่ใช้เป็นคีย์ query ทั้งระบบ */
export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PARTS_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = PARTS_FORMATTER_CACHE.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  PARTS_FORMATTER_CACHE.set(timeZone, formatter);
  return formatter;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`ไม่พบส่วน "${type}" จากการแปลงเวลา timezone ${timeZone}`);
    return Number(part.value);
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

/**
 * offset ของ timezone ณ เวลานั้น ๆ (นาที, บวก = เร็วกว่า UTC)
 * คำนวณจาก Intl จริง ไม่ฮาร์ดโค้ด +7 เพื่อให้ถูกต้องแม้ย้าย timezone หรือเจอ DST
 */
export function tzOffsetMinutes(instant: Date, timeZone: string = BANGKOK_TZ): number {
  const p = zonedParts(instant, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // ตัดเศษมิลลิวินาทีออกทั้งสองฝั่งก่อนลบ เพราะ formatToParts ให้ความละเอียดถึงวินาที
  const instantToSecond = Math.floor(instant.getTime() / 1000) * 1000;
  return (asIfUtc - instantToSecond) / 60_000;
}

/** แยก dateKey "2026-10-28" เป็นตัวเลข — throw ถ้ารูปแบบผิด */
function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    throw new Error(`dateKey ต้องอยู่ในรูปแบบ YYYY-MM-DD แต่ได้รับ "${dateKey}"`);
  }
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`dateKey ไม่ใช่วันที่ที่มีอยู่จริง: "${dateKey}"`);
  }
  return { year, month, day };
}

/** วันที่ตามเวลาไทยของ instant นั้น ในรูปแบบ YYYY-MM-DD */
export function toDateKey(instant: Date, timeZone: string = BANGKOK_TZ): string {
  const p = zonedParts(instant, timeZone);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** นาทีนับจากเที่ยงคืนตามเวลาไทยของ instant นั้น (0-1439) */
export function toMinutesOfDay(instant: Date, timeZone: string = BANGKOK_TZ): number {
  const p = zonedParts(instant, timeZone);
  return p.hour * 60 + p.minute;
}

/**
 * แปลง (วันที่ไทย, นาทีจากเที่ยงคืน) กลับเป็น instant จริง
 *
 * ทำสองรอบเพราะ offset ที่ถูกต้องขึ้นกับ instant ที่เรายังไม่รู้
 * (ไทยไม่มี DST จึงได้คำตอบรอบเดียว แต่เขียนให้ทนไว้เผื่อใช้กับ timezone อื่น)
 */
export function fromDateKeyAndMinutes(
  dateKey: string,
  minutesOfDay: number,
  timeZone: string = BANGKOK_TZ,
): Date {
  if (!Number.isInteger(minutesOfDay)) {
    throw new Error(`minutesOfDay ต้องเป็นจำนวนเต็ม แต่ได้รับ ${minutesOfDay}`);
  }
  const { year, month, day } = parseDateKey(dateKey);
  const naiveUtc = Date.UTC(year, month - 1, day, 0, 0, 0) + minutesOfDay * 60_000;

  const firstGuess = tzOffsetMinutes(new Date(naiveUtc), timeZone);
  let instant = naiveUtc - firstGuess * 60_000;

  const corrected = tzOffsetMinutes(new Date(instant), timeZone);
  if (corrected !== firstGuess) {
    instant = naiveUtc - corrected * 60_000;
  }
  return new Date(instant);
}

/** "09:30" -> 570 */
export function parseTimeOfDay(hhmm: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) throw new Error(`เวลาต้องอยู่ในรูปแบบ HH:mm แต่ได้รับ "${hhmm}"`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`เวลาไม่ถูกต้อง: "${hhmm}"`);
  return hour * 60 + minute;
}

/** 570 -> "09:30" (1440 -> "24:00" เพื่อให้แสดงเวลาปิดทำการได้) */
export function formatTimeOfDay(minutesOfDay: number): string {
  if (!Number.isInteger(minutesOfDay) || minutesOfDay < 0 || minutesOfDay > MINUTES_PER_DAY) {
    throw new Error(`นาทีต้องอยู่ระหว่าง 0-${MINUTES_PER_DAY} แต่ได้รับ ${minutesOfDay}`);
  }
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** บวกวัน (ตามปฏิทินไทย) ให้ dateKey */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** จำนวนวันในช่วง (นับรวมทั้งวันเริ่มและวันจบ) — ใช้คำนวณตัวหารของ utilization */
export function countDaysInclusive(fromDateKey: string, toDateKey_: string): number {
  const a = parseDateKey(fromDateKey);
  const b = parseDateKey(toDateKey_);
  const diff = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
  return Math.floor(diff / 86_400_000) + 1;
}

/** 0 = อาทิตย์ ... 6 = เสาร์ (ตามปฏิทินไทย) */
export function dayOfWeekOfDateKey(dateKey: string): number {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** รายการ dateKey ทุกวันในช่วง (รวมหัวท้าย) */
export function dateKeyRange(fromDateKey: string, toDateKey_: string): string[] {
  const total = countDaysInclusive(fromDateKey, toDateKey_);
  if (total <= 0) return [];
  const keys: string[] = [];
  for (let i = 0; i < total; i += 1) keys.push(addDaysToDateKey(fromDateKey, i));
  return keys;
}
