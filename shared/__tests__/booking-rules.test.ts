import { describe, expect, it } from 'vitest';
import {
  type BookingRuleCode,
  type BookingRuleContext,
  type BookingRuleInput,
  bookableDayCount,
  businessWindow,
  canCancelBooking,
  validateBookingRules,
} from '../domain/booking-rules';
import { DEFAULT_SYSTEM_SETTINGS, type SystemSettings } from '../schemas/settings';
import { fromDateKeyAndMinutes } from '../time/bangkok';

/** พุธ 28 ต.ค. 2026 เวลา 09:00 ตามเวลาไทย */
const NOW = new Date('2026-10-28T02:00:00Z');

const room = {
  capacity: 10,
  equipment: ['projector', 'tv'] as const,
  status: 'active' as const,
};

function context(overrides: Partial<BookingRuleContext> = {}): BookingRuleContext {
  return {
    settings: DEFAULT_SYSTEM_SETTINGS,
    room,
    now: NOW,
    isAdmin: false,
    activeBookingCount: 0,
    ...overrides,
  };
}

function request(overrides: Partial<BookingRuleInput> = {}): BookingRuleInput {
  return {
    dateKey: '2026-10-28',
    startMin: 10 * 60,
    endMin: 11 * 60,
    attendees: 5,
    equipment: [],
    ...overrides,
  };
}

function codes(input: BookingRuleInput, ctx = context()): BookingRuleCode[] {
  const result = validateBookingRules(input, ctx);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

describe('กฎการตรวจคำขอจอง', () => {
  it('คำขอที่ถูกต้องผ่านทุกกฎ', () => {
    expect(validateBookingRules(request(), context())).toEqual({ ok: true });
  });

  it('เวลาสิ้นสุดก่อนหรือเท่าเวลาเริ่ม = ผิดข้อเดียวแล้วหยุดตรวจ', () => {
    expect(codes(request({ startMin: 600, endMin: 600 }))).toEqual(['TIME_ORDER']);
    expect(codes(request({ startMin: 660, endMin: 600 }))).toEqual(['TIME_ORDER']);
  });

  it('เวลาต้องลงตัวตามความละเอียด 15 นาที', () => {
    expect(codes(request({ startMin: 607, endMin: 667 }))).toContain('TIME_NOT_ALIGNED');
  });

  it('สั้นเกินและยาวเกินข้อกำหนด', () => {
    const shortSettings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS, minBookingMinutes: 30 };
    expect(codes(request({ startMin: 600, endMin: 615 }), context({ settings: shortSettings })))
      .toContain('DURATION_TOO_SHORT');
    expect(codes(request({ startMin: 480, endMin: 1080 }))).toContain('DURATION_TOO_LONG');
  });

  it('จองนอกเวลาทำการไม่ได้', () => {
    expect(codes(request({ startMin: 420, endMin: 480 }))).toContain('OUTSIDE_BUSINESS_HOURS');
    expect(codes(request({ startMin: 1020, endMin: 1140 }))).toContain('OUTSIDE_BUSINESS_HOURS');
  });

  it('จองวันเสาร์-อาทิตย์ไม่ได้ตามค่าเริ่มต้น', () => {
    expect(codes(request({ dateKey: '2026-10-31' }))).toContain('DAY_NOT_BOOKABLE');
    expect(codes(request({ dateKey: '2026-11-01' }))).toContain('DAY_NOT_BOOKABLE');
  });

  it('พนักงานจองย้อนหลังไม่ได้ แต่ผู้ดูแลทำได้เมื่อเปิดสิทธิ์', () => {
    const past = request({ dateKey: '2026-10-27', startMin: 600, endMin: 660 });
    expect(codes(past)).toContain('IN_THE_PAST');
    expect(codes(past, context({ isAdmin: true }))).not.toContain('IN_THE_PAST');

    const noBackdate: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS, allowAdminBackdate: false };
    expect(codes(past, context({ isAdmin: true, settings: noBackdate }))).toContain('IN_THE_PAST');
  });

  it('เวลาที่ผ่านไปแล้วของ "วันนี้" ก็ถือว่าย้อนหลัง', () => {
    // ตอนนี้ 09:00 ของวันที่ 28 — จอง 08:00 วันเดียวกันคือย้อนหลัง
    expect(codes(request({ startMin: 480, endMin: 540 }))).toContain('IN_THE_PAST');
  });

  it('บังคับจองล่วงหน้าตามค่าที่ตั้ง', () => {
    const lead: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS, minLeadMinutes: 60 };
    // 09:30 ห่างจากตอนนี้ 30 นาที ยังไม่ถึง 60 นาที
    expect(codes(request({ startMin: 570, endMin: 630 }), context({ settings: lead }))).toContain(
      'LEAD_TIME_TOO_SHORT',
    );
    // ผู้ดูแลข้ามได้
    expect(
      codes(request({ startMin: 570, endMin: 630 }), context({ settings: lead, isAdmin: true })),
    ).not.toContain('LEAD_TIME_TOO_SHORT');
  });

  it('ผู้เข้าร่วมเกินความจุห้อง และอุปกรณ์ที่ห้องไม่มี', () => {
    const result = validateBookingRules(
      request({ attendees: 20, equipment: ['whiteboard', 'videoConference'] }),
      context(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const byCode = new Map(result.issues.map((issue) => [issue.code, issue.message]));
    expect(byCode.get('ATTENDEES_EXCEED_CAPACITY')).toContain('10 คน');
    expect(byCode.get('EQUIPMENT_UNAVAILABLE')).toContain('ไวท์บอร์ด');
    expect(byCode.get('EQUIPMENT_UNAVAILABLE')).toContain('ระบบประชุมทางไกล');
  });

  it('ห้องปิดปรับปรุงหรือไม่เปิดให้จอง', () => {
    expect(codes(request(), context({ room: { ...room, status: 'maintenance' } }))).toContain(
      'ROOM_NOT_BOOKABLE',
    );
    expect(codes(request(), context({ room: { ...room, status: 'disabled' } }))).toContain(
      'ROOM_NOT_BOOKABLE',
    );
  });

  it('จำกัดจำนวนการจองค้างต่อคน แต่ไม่จำกัดผู้ดูแล', () => {
    expect(codes(request(), context({ activeBookingCount: 20 }))).toContain('QUOTA_EXCEEDED');
    expect(codes(request(), context({ activeBookingCount: 20, isAdmin: true }))).not.toContain(
      'QUOTA_EXCEEDED',
    );
  });

  it('คืนข้อผิดพลาดทุกข้อพร้อมกัน ไม่หยุดที่ข้อแรก', () => {
    const found = codes(
      request({
        dateKey: '2026-10-31',
        startMin: 427,
        endMin: 1147,
        attendees: 99,
        equipment: ['hdmi'],
      }),
      context({ activeBookingCount: 99, room: { ...room, status: 'disabled' } }),
    );
    expect(found).toEqual(
      expect.arrayContaining([
        'ROOM_NOT_BOOKABLE',
        'TIME_NOT_ALIGNED',
        'DURATION_TOO_LONG',
        'OUTSIDE_BUSINESS_HOURS',
        'DAY_NOT_BOOKABLE',
        'ATTENDEES_EXCEED_CAPACITY',
        'EQUIPMENT_UNAVAILABLE',
        'QUOTA_EXCEEDED',
      ]),
    );
  });
});

describe('นโยบายการยกเลิก', () => {
  const settings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS, cancelCutoffMinutes: 60 };

  it('ยกเลิกได้เมื่อเหลือเวลามากกว่าเกณฑ์', () => {
    const startInstant = fromDateKeyAndMinutes('2026-10-28', 11 * 60); // อีก 2 ชม.
    expect(canCancelBooking({ startInstant, now: NOW, settings, isAdmin: false })).toEqual({
      ok: true,
    });
  });

  it('ยกเลิกช้ากว่าเกณฑ์ไม่ได้', () => {
    const startInstant = fromDateKeyAndMinutes('2026-10-28', 9 * 60 + 30); // อีก 30 นาที
    const result = canCancelBooking({ startInstant, now: NOW, settings, isAdmin: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('60 นาที');
  });

  it('ประชุมเริ่มแล้ว พนักงานยกเลิกเองไม่ได้ แต่ผู้ดูแลทำได้', () => {
    const startInstant = fromDateKeyAndMinutes('2026-10-28', 8 * 60);
    const staff = canCancelBooking({ startInstant, now: NOW, settings, isAdmin: false });
    expect(staff.ok).toBe(false);
    if (!staff.ok) expect(staff.message).toContain('ผู้ดูแลระบบ');
    expect(canCancelBooking({ startInstant, now: NOW, settings, isAdmin: true })).toEqual({
      ok: true,
    });
  });
});

describe('ตัวหารของอัตราการใช้ห้อง', () => {
  it('กรอบเวลาทำการเป็นนาที', () => {
    expect(businessWindow(DEFAULT_SYSTEM_SETTINGS)).toEqual({ startMin: 480, endMin: 1080 });
  });

  it('นับเฉพาะวันที่เปิดให้จอง', () => {
    // 26 ต.ค. (จ) ถึง 1 พ.ย. (อา) = 7 วัน แต่เปิดจองแค่ จ-ศ = 5 วัน
    expect(bookableDayCount('2026-10-26', '2026-11-01', DEFAULT_SYSTEM_SETTINGS)).toBe(5);
    expect(bookableDayCount('2026-10-31', '2026-11-01', DEFAULT_SYSTEM_SETTINGS)).toBe(0);
    expect(bookableDayCount('2026-10-28', '2026-10-28', DEFAULT_SYSTEM_SETTINGS)).toBe(1);
    // ช่วงวันที่กลับหัวกลับหาง ต้องได้ 0 ไม่ใช่ติดลบ
    expect(bookableDayCount('2026-11-01', '2026-10-26', DEFAULT_SYSTEM_SETTINGS)).toBe(0);
  });
});
