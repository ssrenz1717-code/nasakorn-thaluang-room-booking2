import { describe, expect, it } from 'vitest';
import {
  BOOKING_STATUSES,
  type BookingStatus,
  assertTransition,
  canTransition,
  countsAsUsage,
  holdsRoomLock,
  isFinalStatus,
} from '../domain/status';

describe('สถานะการจอง', () => {
  it('เส้นทางที่อนุญาต', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('pending', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'completed')).toBe(true);
  });

  it('ห้ามย้อนกลับจากสถานะสุดท้าย', () => {
    const finals: BookingStatus[] = ['rejected', 'cancelled', 'completed'];
    for (const from of finals) {
      expect(isFinalStatus(from)).toBe(true);
      for (const to of BOOKING_STATUSES) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  it('ห้ามข้ามขั้นหรือวนกลับ', () => {
    expect(canTransition('confirmed', 'pending')).toBe(false);
    expect(canTransition('confirmed', 'rejected')).toBe(false);
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('pending', 'pending')).toBe(false);
  });

  it('assertTransition โยน error เป็นภาษาไทย', () => {
    expect(() => assertTransition('cancelled', 'confirmed')).toThrowError(/ยกเลิกแล้ว/);
    expect(() => assertTransition('pending', 'confirmed')).not.toThrow();
  });

  it('มีแค่ รออนุมัติ และ ยืนยันแล้ว ที่ถือล็อกเวลาห้องไว้', () => {
    expect(holdsRoomLock('pending')).toBe(true);
    expect(holdsRoomLock('confirmed')).toBe(true);
    expect(holdsRoomLock('rejected')).toBe(false);
    expect(holdsRoomLock('cancelled')).toBe(false);
    expect(holdsRoomLock('completed')).toBe(false);
  });

  it('นับเป็นการใช้ห้องจริงเฉพาะ ยืนยันแล้ว และ เสร็จสิ้น', () => {
    expect(countsAsUsage('confirmed')).toBe(true);
    expect(countsAsUsage('completed')).toBe(true);
    expect(countsAsUsage('pending')).toBe(false);
    expect(countsAsUsage('cancelled')).toBe(false);
    expect(countsAsUsage('rejected')).toBe(false);
  });
});
