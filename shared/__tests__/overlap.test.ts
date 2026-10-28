import { describe, expect, it } from 'vitest';
import {
  type BookedInterval,
  bookedMinutesWithin,
  findConflicts,
  freeGaps,
  mergeIntervals,
  overlaps,
  suggestAlternatives,
} from '../domain/overlap';

const at = (start: number, end: number) => ({ startMin: start, endMin: end });
const booked = (id: string, start: number, end: number): BookedInterval => ({
  bookingId: id,
  startMin: start,
  endMin: end,
});

describe('ตรวจช่วงเวลาทับซ้อน', () => {
  it('ช่วงที่ต่อกันพอดีไม่ถือว่าชน (10:00 จบ / 10:00 เริ่ม)', () => {
    expect(overlaps(at(540, 600), at(600, 660))).toBe(false);
    expect(overlaps(at(600, 660), at(540, 600))).toBe(false);
  });

  it('จับได้ทุกรูปแบบการชน', () => {
    const target = at(540, 660); // 09:00-11:00
    expect(overlaps(target, at(600, 720))).toBe(true); // คาบท้าย
    expect(overlaps(target, at(480, 570))).toBe(true); // คาบหัว
    expect(overlaps(target, at(570, 600))).toBe(true); // อยู่ข้างใน
    expect(overlaps(target, at(480, 720))).toBe(true); // ครอบทั้งหมด
    expect(overlaps(target, at(540, 660))).toBe(true); // ตรงกันเป๊ะ
    expect(overlaps(target, at(660, 720))).toBe(false); // หลังพอดี
    expect(overlaps(target, at(480, 540))).toBe(false); // ก่อนพอดี
  });

  it('ตอนแก้ไขการจอง ต้องไม่นับรายการของตัวเองเป็นคู่ชน', () => {
    const existing = [booked('b1', 540, 600), booked('b2', 660, 720)];
    expect(findConflicts(at(540, 630), existing).map((c) => c.bookingId)).toEqual(['b1']);
    expect(findConflicts(at(540, 630), existing, 'b1')).toEqual([]);
    expect(findConflicts(at(540, 700), existing, 'b1').map((c) => c.bookingId)).toEqual(['b2']);
  });

  it('รวมช่วงที่ทับและต่อกัน', () => {
    expect(mergeIntervals([at(600, 660), at(540, 600), at(555, 570)])).toEqual([at(540, 660)]);
    expect(mergeIntervals([at(540, 570), at(600, 660)])).toEqual([at(540, 570), at(600, 660)]);
    expect(mergeIntervals([])).toEqual([]);
  });

  it('หาช่วงว่างในกรอบเวลาทำการ', () => {
    const window = at(480, 1080); // 08:00-18:00
    expect(freeGaps([at(540, 600)], window)).toEqual([at(480, 540), at(600, 1080)]);
    expect(freeGaps([], window)).toEqual([window]);
    expect(freeGaps([at(480, 1080)], window)).toEqual([]);
    // การจองที่ล้นออกนอกกรอบต้องถูกตัดก่อน ไม่ทำให้ช่วงว่างติดลบ
    expect(freeGaps([at(400, 540)], window)).toEqual([at(540, 1080)]);
    expect(freeGaps([at(540, 600)], at(600, 600))).toEqual([]);
  });

  it('เสนอเวลาอื่นที่ว่างจริง เรียงตามความใกล้เวลาที่ผู้ใช้ขอ', () => {
    const window = at(480, 1080);
    const busy = [at(540, 600)]; // 09:00-10:00 ไม่ว่าง
    const suggestions = suggestAlternatives(at(540, 600), busy, window, { limit: 2 });
    expect(suggestions).toEqual([at(600, 660), at(480, 540)]);
  });

  it('เวลาที่เสนอต้องลงตัวตามความละเอียดเวลา และยาวเท่าที่ขอ', () => {
    const suggestions = suggestAlternatives(at(545, 605), [at(480, 547)], at(480, 1080), {
      stepMin: 15,
      limit: 3,
    });
    expect(suggestions.length).toBe(3);
    for (const slot of suggestions) {
      expect(slot.startMin % 15).toBe(0);
      expect(slot.endMin - slot.startMin).toBe(60);
      expect(slot.startMin).toBeGreaterThanOrEqual(547);
    }
  });

  it('ไม่เสนออะไรเลยถ้าไม่มีช่วงว่างพอ', () => {
    expect(suggestAlternatives(at(540, 600), [at(480, 1080)], at(480, 1080))).toEqual([]);
    expect(suggestAlternatives(at(600, 600), [], at(480, 1080))).toEqual([]);
  });

  it('นับนาทีที่ถูกจองโดยตัดส่วนที่ล้นนอกเวลาทำการ และไม่นับซ้ำช่วงที่ทับกัน', () => {
    const window = at(480, 1080);
    expect(bookedMinutesWithin([at(540, 600)], window)).toBe(60);
    expect(bookedMinutesWithin([at(420, 540)], window)).toBe(60); // ล้นหัว 1 ชม. ถูกตัด
    expect(bookedMinutesWithin([at(1020, 1200)], window)).toBe(60); // ล้นท้ายถูกตัด
    expect(bookedMinutesWithin([at(540, 600), at(570, 630)], window)).toBe(90); // ทับกันนับครั้งเดียว
    expect(bookedMinutesWithin([], window)).toBe(0);
  });
});
