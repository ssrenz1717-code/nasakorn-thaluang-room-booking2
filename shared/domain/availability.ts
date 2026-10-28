/**
 * ห้องว่าง/ไม่ว่าง — ใช้ร่วมกันระหว่างหน้าเว็บ (บอกผู้ใช้ตั้งแต่ตอนกรอก)
 * ข้อมูลตัวอย่าง และ Apps Script (คำสั่ง availability)
 *
 * ส่งกลับเฉพาะช่วงเวลาและสถานะ ไม่มีชื่อผู้จองหรือหัวข้อ
 * เพื่อให้พนักงานทุกคนดูได้โดยไม่เห็นข้อมูลของคนอื่น
 */

import { LOCK_HOLDING_STATUSES, type BookingStatus } from './status';
import { overlaps, type Interval } from './overlap';
import { normalizeDateKey } from '../time/bangkok';

export interface BusySlot extends Interval {
  /** รออนุมัติก็ถือว่าล็อกเวลาไว้แล้ว คนอื่นจองทับไม่ได้ */
  status: 'pending' | 'confirmed';
}

export interface BookingRowLike {
  bookingId?: unknown;
  roomId: unknown;
  dateKey: unknown;
  startMin: unknown;
  endMin: unknown;
  status: unknown;
}

/** ช่วงที่ห้องนี้ถูกจองไว้ในวันนั้น เรียงตามเวลา (ข้ามรายการที่กำลังแก้ไขได้) */
export function busySlotsFor(
  rows: readonly BookingRowLike[],
  roomId: string,
  dateKey: string,
  excludeBookingId?: string,
): BusySlot[] {
  return rows
    .filter(
      (row) =>
        String(row.roomId) === roomId &&
        normalizeDateKey(row.dateKey) === dateKey &&
        (LOCK_HOLDING_STATUSES as readonly string[]).includes(String(row.status)) &&
        (excludeBookingId === undefined || String(row.bookingId) !== excludeBookingId),
    )
    .map((row) => ({
      startMin: Number(row.startMin),
      endMin: Number(row.endMin),
      status: String(row.status) as BookingStatus as BusySlot['status'],
    }))
    .filter((slot) => Number.isFinite(slot.startMin) && Number.isFinite(slot.endMin))
    .sort((a, b) => a.startMin - b.startMin);
}

/** ช่วงที่ขอชนกับช่วงไม่ว่างช่วงไหนบ้าง */
export function conflictingSlots(requested: Interval, busy: readonly BusySlot[]): BusySlot[] {
  return busy.filter((slot) => overlaps(requested, slot));
}

/**
 * เวลาเริ่มนี้เลือกได้ไหม: ต้องมีอย่างน้อยความยาวขั้นต่ำที่ว่างต่อจากมัน
 * (ถ้าเริ่มตรงนี้แล้วไม่มีเวลาสิ้นสุดไหนว่าง ก็ไม่ควรให้เลือก)
 */
export function isStartBlocked(startMin: number, minBookingMinutes: number, busy: readonly BusySlot[]): boolean {
  return conflictingSlots({ startMin, endMin: startMin + minBookingMinutes }, busy).length > 0;
}

/** เวลาสิ้นสุดนี้เลือกได้ไหม เมื่อเริ่มที่ startMin */
export function isEndBlocked(startMin: number, endMin: number, busy: readonly BusySlot[]): boolean {
  return conflictingSlots({ startMin, endMin }, busy).length > 0;
}
