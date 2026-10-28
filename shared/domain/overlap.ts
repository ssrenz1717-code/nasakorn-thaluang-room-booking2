/**
 * ตรรกะช่วงเวลาทับซ้อน — หัวใจของการกันจองซ้ำ
 *
 * ทุกช่วงเวลาเป็นนาทีจากเที่ยงคืน (จำนวนเต็ม) และเป็นช่วงเปิดปลาย [start, end)
 * แปลว่าการจอง 09:00-10:00 กับ 10:00-11:00 "ไม่ทับกัน" — ต่อกันพอดีจองได้
 */

export interface Interval {
  startMin: number;
  endMin: number;
}

export interface BookedInterval extends Interval {
  bookingId: string;
}

/**
 * ทับซ้อนหรือไม่ — สูตรเดียวที่ใช้ทั้งระบบ
 * ใช้ < ไม่ใช่ <= เพื่อให้ช่วงที่ต่อกันพอดี (10:00 จบ / 10:00 เริ่ม) ไม่ถือว่าชน
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/**
 * หารายการที่ชนกับช่วงที่ขอ
 * excludeBookingId ใช้ตอน "แก้ไขการจอง" เพื่อไม่ให้รายการของตัวเองนับเป็นคู่ชน
 */
export function findConflicts(
  requested: Interval,
  existing: readonly BookedInterval[],
  excludeBookingId?: string,
): BookedInterval[] {
  return existing.filter(
    (slot) => slot.bookingId !== excludeBookingId && overlaps(requested, slot),
  );
}

/** รวมช่วงที่ทับ/ต่อกันให้เป็นก้อนเดียว และเรียงตามเวลา */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startMin - b.startMin);
  const merged: Interval[] = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, current.endMin);
    } else {
      merged.push({ startMin: current.startMin, endMin: current.endMin });
    }
  }
  return merged;
}

/** ช่วงว่างที่เหลือภายในกรอบเวลาทำการ หลังหักช่วงที่ถูกจองไปแล้ว */
export function freeGaps(busy: readonly Interval[], window: Interval): Interval[] {
  if (window.endMin <= window.startMin) return [];

  const clipped = mergeIntervals(
    busy
      .map((slot) => ({
        startMin: Math.max(slot.startMin, window.startMin),
        endMin: Math.min(slot.endMin, window.endMin),
      }))
      .filter((slot) => slot.endMin > slot.startMin),
  );

  const gaps: Interval[] = [];
  let cursor = window.startMin;

  for (const slot of clipped) {
    if (slot.startMin > cursor) gaps.push({ startMin: cursor, endMin: slot.startMin });
    cursor = Math.max(cursor, slot.endMin);
  }
  if (cursor < window.endMin) gaps.push({ startMin: cursor, endMin: window.endMin });

  return gaps;
}

/**
 * เสนอช่วงเวลาอื่นที่ว่างจริง เมื่อห้องไม่ว่างตามที่ขอ (ข้อกำหนด 5.7)
 *
 * เลือกช่วงที่ "ใกล้เวลาที่ผู้ใช้อยากได้ที่สุด" ก่อน เพราะคนจองประชุมมักยืดหยุ่นได้
 * ไม่กี่สิบนาที ไม่ใช่ยินดีย้ายไปตอนเย็น
 */
export function suggestAlternatives(
  requested: Interval,
  busy: readonly Interval[],
  window: Interval,
  options: { stepMin?: number; limit?: number } = {},
): Interval[] {
  const stepMin = options.stepMin ?? 15;
  const limit = options.limit ?? 3;
  const durationMin = requested.endMin - requested.startMin;
  if (durationMin <= 0 || stepMin <= 0) return [];

  const candidates: Interval[] = [];
  for (const gap of freeGaps(busy, window)) {
    // ปัดจุดเริ่มขึ้นไปให้ลงตัวตาม stepMin เพื่อไม่เสนอเวลาแปลก ๆ เช่น 09:07
    const first = Math.ceil(gap.startMin / stepMin) * stepMin;
    for (let start = first; start + durationMin <= gap.endMin; start += stepMin) {
      candidates.push({ startMin: start, endMin: start + durationMin });
    }
  }

  // ใกล้เวลาที่ขอที่สุดมาก่อน และถ้าห่างเท่ากัน เสนอ "เลื่อนออกไปทีหลัง" ก่อน
  // เพราะขอให้ผู้เข้าร่วมมาช้ากว่าเดิม ทำได้ง่ายกว่าขอให้ทุกคนมาเร็วขึ้น
  const distance = (slot: Interval): number => Math.abs(slot.startMin - requested.startMin);
  const isLater = (slot: Interval): number => (slot.startMin >= requested.startMin ? 0 : 1);

  return candidates
    .sort(
      (a, b) => distance(a) - distance(b) || isLater(a) - isLater(b) || a.startMin - b.startMin,
    )
    .slice(0, limit);
}

/** นาทีรวมของช่วงเวลาที่ถูกจอง หลังตัดส่วนที่ล้นออกนอกกรอบเวลาทำการ */
export function bookedMinutesWithin(busy: readonly Interval[], window: Interval): number {
  return mergeIntervals(busy)
    .map((slot) => Math.min(slot.endMin, window.endMin) - Math.max(slot.startMin, window.startMin))
    .filter((minutes) => minutes > 0)
    .reduce((sum, minutes) => sum + minutes, 0);
}
