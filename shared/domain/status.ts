/**
 * สถานะการจองและกฎการเปลี่ยนสถานะ (ข้อกำหนด 5.8)
 *
 * ความหมายของแต่ละสถานะ:
 *  - pending   : รออนุมัติ — "ถือล็อกเวลาไว้แล้ว" คนอื่นแทรกไม่ได้
 *  - confirmed : ยืนยันแล้ว ใช้ห้องได้
 *  - rejected  : ผู้ดูแลปฏิเสธ — ปล่อยล็อกคืนทันที
 *  - cancelled : ผู้จองหรือผู้ดูแลยกเลิก — ปล่อยล็อกคืนทันที
 *  - completed : เลยเวลาสิ้นสุดแล้วและเคยเป็น confirmed (ระบบปิดงานเอง ไม่ใช่คนกด)
 */

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABEL_TH: Record<BookingStatus, string> = {
  pending: 'รออนุมัติ',
  confirmed: 'ยืนยันแล้ว',
  rejected: 'ถูกปฏิเสธ',
  cancelled: 'ยกเลิกแล้ว',
  completed: 'เสร็จสิ้น',
};

/** สถานะปลายทางที่อนุญาต — สถานะที่ไม่มีทางออกคือสถานะสุดท้าย ย้อนกลับไม่ได้ */
const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['cancelled', 'completed'],
  rejected: [],
  cancelled: [],
  completed: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `เปลี่ยนสถานะจาก "${BOOKING_STATUS_LABEL_TH[from]}" เป็น "${BOOKING_STATUS_LABEL_TH[to]}" ไม่ได้`,
    );
  }
}

/** สถานะที่ยัง "จับจอง" เวลาไว้ — มีแค่สองสถานะนี้ที่ถูกเก็บใน roomDayIndex */
export const LOCK_HOLDING_STATUSES: readonly BookingStatus[] = ['pending', 'confirmed'];

export function holdsRoomLock(status: BookingStatus): boolean {
  return LOCK_HOLDING_STATUSES.includes(status);
}

export function isFinalStatus(status: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** สถานะที่นับเป็น "การใช้ห้องจริง" ตอนทำรายงาน/utilization */
export const USAGE_STATUSES: readonly BookingStatus[] = ['confirmed', 'completed'];

export function countsAsUsage(status: BookingStatus): boolean {
  return USAGE_STATUSES.includes(status);
}
