import { describe, expect, it } from 'vitest';
import {
  busySlotsFor,
  conflictingSlots,
  isEndBlocked,
  isStartBlocked,
} from '../domain/availability';
import { normalizeDateKey, fromDateKeyAndMinutes } from '../time/bangkok';
import { objectToRow, readString } from '../store/table';
import { validateAvailabilityInput } from '../schemas/booking';

const rows = [
  { bookingId: 'b1', roomId: 'r1', dateKey: '2026-10-28', startMin: 540, endMin: 630, status: 'confirmed' },
  { bookingId: 'b2', roomId: 'r1', dateKey: '2026-10-28', startMin: 780, endMin: 840, status: 'pending' },
  { bookingId: 'b3', roomId: 'r1', dateKey: '2026-10-28', startMin: 600, endMin: 660, status: 'cancelled' },
  { bookingId: 'b4', roomId: 'r2', dateKey: '2026-10-28', startMin: 540, endMin: 600, status: 'confirmed' },
  { bookingId: 'b5', roomId: 'r1', dateKey: '2026-10-29', startMin: 540, endMin: 600, status: 'confirmed' },
];

describe('ช่วงที่ห้องไม่ว่าง', () => {
  it('นับเฉพาะห้องและวันนั้น ที่ยังถือล็อกอยู่ (รออนุมัติก็นับ ยกเลิกไม่นับ) เรียงตามเวลา', () => {
    expect(busySlotsFor(rows, 'r1', '2026-10-28')).toEqual([
      { startMin: 540, endMin: 630, status: 'confirmed' },
      { startMin: 780, endMin: 840, status: 'pending' },
    ]);
  });

  it('ไม่นับรายการที่กำลังแก้ไขอยู่', () => {
    expect(busySlotsFor(rows, 'r1', '2026-10-28', 'b1')).toEqual([
      { startMin: 780, endMin: 840, status: 'pending' },
    ]);
  });

  it('ยังเจอการจองแม้ชีตคืน dateKey มาเป็นค่าวันที่ (ต้นเหตุของการจองซ้ำบนชีตจริง)', () => {
    const fromSheet = [{ ...rows[0]!, dateKey: fromDateKeyAndMinutes('2026-10-28', 0) }];
    expect(busySlotsFor(fromSheet, 'r1', '2026-10-28')).toHaveLength(1);
  });

  it('ตรวจการชน และบล็อกเวลาเริ่ม/สิ้นสุดที่ใช้ไม่ได้', () => {
    const busy = busySlotsFor(rows, 'r1', '2026-10-28');
    expect(conflictingSlots({ startMin: 600, endMin: 660 }, busy)).toHaveLength(1);
    expect(conflictingSlots({ startMin: 630, endMin: 690 }, busy)).toHaveLength(0); // ต่อกันพอดีไม่ชน
    expect(isStartBlocked(540, 15, busy)).toBe(true);
    expect(isStartBlocked(615, 15, busy)).toBe(true); // 10:15-10:30 ยังชน
    expect(isStartBlocked(630, 15, busy)).toBe(false);
    expect(isEndBlocked(630, 780, busy)).toBe(false); // 10:30-13:00 ว่างพอดี
    expect(isEndBlocked(630, 795, busy)).toBe(true); // เลยเข้าไปในช่วงรออนุมัติ
  });
});

describe('อ่าน/เขียนวันที่กับชีต', () => {
  it('normalizeDateKey รับได้ทั้ง Date ข้อความ ข้อความที่มีเครื่องหมายกันสูตร และเวลา ISO', () => {
    expect(normalizeDateKey(fromDateKeyAndMinutes('2026-10-28', 0))).toBe('2026-10-28');
    expect(normalizeDateKey('2026-10-28')).toBe('2026-10-28');
    expect(normalizeDateKey("'2026-10-28")).toBe('2026-10-28');
    expect(normalizeDateKey('2026-10-28T02:00:00.000Z')).toBe('2026-10-28');
    expect(normalizeDateKey(null)).toBe('');
  });

  it('เขียนวันที่และเลขที่ขึ้นต้นด้วย 0 ลงชีตเป็นข้อความล้วน แล้วอ่านกลับได้ค่าเดิม', () => {
    const [dateCell, phoneCell, plainCell] = objectToRow(
      { dateKey: '2026-10-28', phone: '0812345678', name: 'ห้องใหญ่' },
      ['dateKey', 'phone', 'name'],
    );
    expect(dateCell).toBe("'2026-10-28");
    expect(phoneCell).toBe("'0812345678");
    expect(plainCell).toBe('ห้องใหญ่');
    expect(readString({ v: dateCell ?? '' }, 'v')).toBe('2026-10-28');
    expect(readString({ v: phoneCell ?? '' }, 'v')).toBe('0812345678');
  });

  it('ตรวจข้อมูลคำขอดูห้องว่าง', () => {
    expect(validateAvailabilityInput({ roomId: 'r1', dateKey: '2026-10-28' }).ok).toBe(true);
    expect(validateAvailabilityInput({ roomId: '', dateKey: '2026-10-28' }).ok).toBe(false);
    expect(validateAvailabilityInput({ roomId: 'r1', dateKey: '28/10/2026' }).ok).toBe(false);
  });
});
