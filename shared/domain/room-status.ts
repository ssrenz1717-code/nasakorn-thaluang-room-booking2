/**
 * สถานะห้องตอนนี้ (กำลังใช้ / ว่าง / ปิด) — ใช้ในหน้าภาพรวม
 *
 * นับเฉพาะรายการที่อนุมัติแล้ว: คำขอที่ยังรออนุมัติอาจไม่ได้ใช้จริง จึงยังไม่ถือว่า "กำลังใช้"
 * ข้อมูลที่ส่งให้หน้าเว็บมีแค่ห้องและช่วงเวลา ไม่มีชื่อหรือหัวข้อ — พนักงานทุกคนดูได้
 */

import { normalizeDateKey } from '../time/bangkok';
import { REPORT_COUNTED_STATUSES } from './report';
import type { BookingRowLike } from './availability';

export interface DaySlot {
  roomId: string;
  startMin: number;
  endMin: number;
}

/** ช่วงที่อนุมัติแล้วของทุกห้องในวันนั้น เรียงตามเวลา */
export function approvedSlotsOn(rows: readonly BookingRowLike[], dateKey: string): DaySlot[] {
  return rows
    .filter((row) => normalizeDateKey(row.dateKey) === dateKey && REPORT_COUNTED_STATUSES.includes(String(row.status)))
    .map((row) => ({ roomId: String(row.roomId), startMin: Number(row.startMin), endMin: Number(row.endMin) }))
    .filter((slot) => Number.isFinite(slot.startMin) && Number.isFinite(slot.endMin) && slot.endMin > slot.startMin)
    .sort((a, b) => a.startMin - b.startMin);
}

export type LiveRoomState =
  | { kind: 'closed' }
  /** untilMin รวมรายการที่ต่อกันติด ๆ แล้ว (ประชุมต่อเนื่องจะเห็นเวลาว่างจริง) */
  | { kind: 'busy'; untilMin: number }
  | { kind: 'free'; nextStartMin: number | null };

export function liveRoomState(room: { roomId: string; status: string }, slots: readonly DaySlot[], nowMin: number): LiveRoomState {
  if (room.status !== 'active') return { kind: 'closed' };
  const mine = slots.filter((slot) => slot.roomId === room.roomId).sort((a, b) => a.startMin - b.startMin);
  const current = mine.find((slot) => slot.startMin <= nowMin && nowMin < slot.endMin);
  if (current !== undefined) {
    let untilMin = current.endMin;
    for (const slot of mine) {
      if (slot.startMin <= untilMin && slot.endMin > untilMin) untilMin = slot.endMin;
    }
    return { kind: 'busy', untilMin };
  }
  const next = mine.find((slot) => slot.startMin > nowMin);
  return { kind: 'free', nextStartMin: next?.startMin ?? null };
}
