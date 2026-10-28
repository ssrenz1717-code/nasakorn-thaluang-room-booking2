import { describe, expect, it } from 'vitest';
import {
  BANGKOK_TZ,
  addDaysToDateKey,
  countDaysInclusive,
  dateKeyRange,
  dayOfWeekOfDateKey,
  formatTimeOfDay,
  fromDateKeyAndMinutes,
  parseTimeOfDay,
  toDateKey,
  toMinutesOfDay,
  tzOffsetMinutes,
} from '../time/bangkok';

describe('เวลาไทย', () => {
  it('ประเทศไทยเป็น UTC+7 ตลอดปี ไม่มี DST', () => {
    expect(tzOffsetMinutes(new Date('2026-01-15T00:00:00Z'), BANGKOK_TZ)).toBe(420);
    expect(tzOffsetMinutes(new Date('2026-07-15T00:00:00Z'), BANGKOK_TZ)).toBe(420);
  });

  it('เที่ยงคืนเวลาไทย ตรงกับ 17:00Z ของวันก่อนหน้า', () => {
    expect(fromDateKeyAndMinutes('2026-10-28', 0).toISOString()).toBe('2026-10-27T17:00:00.000Z');
  });

  it('09:00 เวลาไทย ตรงกับ 02:00Z วันเดียวกัน', () => {
    expect(fromDateKeyAndMinutes('2026-10-28', 9 * 60).toISOString()).toBe(
      '2026-10-28T02:00:00.000Z',
    );
  });

  it('instant ที่อยู่ "วันก่อนหน้า" ตาม UTC ต้องให้ dateKey ของวันไทยที่ถูกต้อง', () => {
    // 17:30Z ของวันที่ 27 = 00:30 ของวันที่ 28 ตามเวลาไทย
    const instant = new Date('2026-10-27T17:30:00Z');
    expect(toDateKey(instant)).toBe('2026-10-28');
    expect(toMinutesOfDay(instant)).toBe(30);
  });

  it('instant ที่อยู่ "วันเดียวกัน" ตาม UTC แต่ดึกแล้วตามเวลาไทย', () => {
    // 16:59Z ของวันที่ 27 = 23:59 ของวันที่ 27 ตามเวลาไทย (ยังไม่ข้ามวัน)
    const instant = new Date('2026-10-27T16:59:00Z');
    expect(toDateKey(instant)).toBe('2026-10-27');
    expect(toMinutesOfDay(instant)).toBe(23 * 60 + 59);
  });

  it('แปลงไปกลับได้ค่าเดิมทุกครึ่งชั่วโมงของวัน', () => {
    for (let minutes = 0; minutes < 1440; minutes += 30) {
      const instant = fromDateKeyAndMinutes('2026-10-28', minutes);
      expect(toDateKey(instant)).toBe('2026-10-28');
      expect(toMinutesOfDay(instant)).toBe(minutes);
    }
  });

  it('parse/format เวลาในวัน', () => {
    expect(parseTimeOfDay('09:30')).toBe(570);
    expect(parseTimeOfDay('00:00')).toBe(0);
    expect(parseTimeOfDay('23:59')).toBe(1439);
    expect(formatTimeOfDay(570)).toBe('09:30');
    expect(formatTimeOfDay(0)).toBe('00:00');
    expect(formatTimeOfDay(1440)).toBe('24:00');
  });

  it('ปฏิเสธรูปแบบเวลาและวันที่ที่ผิด', () => {
    expect(() => parseTimeOfDay('9:30')).toThrow();
    expect(() => parseTimeOfDay('25:00')).toThrow();
    expect(() => formatTimeOfDay(1441)).toThrow();
    expect(() => formatTimeOfDay(-1)).toThrow();
    expect(() => fromDateKeyAndMinutes('28-10-2026', 0)).toThrow();
    expect(() => fromDateKeyAndMinutes('2026-13-01', 0)).toThrow();
    expect(() => fromDateKeyAndMinutes('2026-10-28', 10.5)).toThrow();
  });

  it('บวกวันข้ามเดือนและข้ามปีได้', () => {
    expect(addDaysToDateKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysToDateKey('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('นับวันแบบรวมหัวท้าย', () => {
    expect(countDaysInclusive('2026-10-28', '2026-10-28')).toBe(1);
    expect(countDaysInclusive('2026-10-28', '2026-10-30')).toBe(3);
    expect(countDaysInclusive('2026-10-30', '2026-10-28')).toBe(-1);
    expect(dateKeyRange('2026-10-30', '2026-10-28')).toEqual([]);
    expect(dateKeyRange('2026-10-30', '2026-11-01')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
  });

  it('หาวันในสัปดาห์ได้ถูกต้อง', () => {
    expect(dayOfWeekOfDateKey('2026-10-28')).toBe(3); // พุธ
    expect(dayOfWeekOfDateKey('2026-10-31')).toBe(6); // เสาร์
    expect(dayOfWeekOfDateKey('2026-11-01')).toBe(0); // อาทิตย์
  });
});
