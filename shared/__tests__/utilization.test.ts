import { describe, expect, it } from 'vitest';
import { computeUtilization, formatUtilization } from '../domain/utilization';

describe('อัตราการใช้ห้องประชุม', () => {
  it('คำนวณตามสูตร นาทีที่จอง / (ห้อง × นาทีทำการ × วัน)', () => {
    const result = computeUtilization({
      bookedMinutes: 1200,
      activeRoomCount: 2,
      bookableMinutesPerDay: 600,
      bookableDayCount: 5,
    });
    expect(result.capacityMinutes).toBe(6000);
    expect(result.rate).toBeCloseTo(0.2);
  });

  it('ไม่มีห้อง / ไม่มีวันที่เปิดให้จอง ต้องได้ null ไม่ใช่ NaN หรือ 0', () => {
    const noRoom = computeUtilization({
      bookedMinutes: 0,
      activeRoomCount: 0,
      bookableMinutesPerDay: 600,
      bookableDayCount: 5,
    });
    expect(noRoom.rate).toBeNull();
    expect(formatUtilization(noRoom.rate)).toBe('–');

    const noDay = computeUtilization({
      bookedMinutes: 0,
      activeRoomCount: 3,
      bookableMinutesPerDay: 600,
      bookableDayCount: 0,
    });
    expect(noDay.rate).toBeNull();
  });

  it('ตัดที่ 100% ไม่แสดงตัวเลขเกินจริง', () => {
    const result = computeUtilization({
      bookedMinutes: 9999,
      activeRoomCount: 1,
      bookableMinutesPerDay: 600,
      bookableDayCount: 1,
    });
    expect(result.rate).toBe(1);
    expect(formatUtilization(result.rate)).toBe('100.0%');
  });

  it('จัดรูปแบบตัวเลข', () => {
    expect(formatUtilization(0)).toBe('0.0%');
    expect(formatUtilization(0.4567)).toBe('45.7%');
    expect(formatUtilization(0.4567, 0)).toBe('46%');
    expect(formatUtilization(null)).toBe('–');
  });
});
