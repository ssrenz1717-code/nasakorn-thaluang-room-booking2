import { describe, expect, it } from 'vitest';
import { DEFAULT_SYSTEM_SETTINGS, validateSystemSettings } from '../schemas/settings';
import { validateRoomInput } from '../schemas/room';
import { validateBookingRequest, validateDecideBookingInput } from '../schemas/booking';
import { validateSetUserRoleInput } from '../schemas/user';
import type { FieldIssue } from '../validate/check';

const fields = (issues: FieldIssue[]): string[] => issues.map((issue) => issue.field).sort();

describe('ตรวจค่าตั้งค่าระบบ', () => {
  it('ค่าเริ่มต้นผ่านการตรวจของตัวเอง', () => {
    const result = validateSystemSettings(DEFAULT_SYSTEM_SETTINGS);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(DEFAULT_SYSTEM_SETTINGS);
  });

  it('เวลาปิดก่อนเวลาเปิดไม่ผ่าน', () => {
    const result = validateSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS,
      businessHoursStart: '18:00',
      businessHoursEnd: '08:00',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(fields(result.issues)).toContain('businessHoursEnd');
  });

  it('ความยาวขั้นต่ำต้องลงตัวตามความละเอียดเวลา', () => {
    const result = validateSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS,
      slotMinutes: 30,
      minBookingMinutes: 15,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(fields(result.issues)).toContain('minBookingMinutes');
  });

  it('ปฏิเสธรูปแบบเวลาที่ผิด', () => {
    for (const bad of ['8:00', '08:0', '24:00', '08-00', '', null, 830]) {
      const result = validateSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS,
        businessHoursStart: bad,
      });
      expect(result.ok, `ควรปฏิเสธค่า ${JSON.stringify(bad)}`).toBe(false);
    }
  });

  it('ต้องเลือกวันที่เปิดให้จองอย่างน้อย 1 วัน และตัดวันซ้ำออก', () => {
    expect(validateSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, bookableWeekdays: [] }).ok).toBe(
      false,
    );
    expect(validateSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, bookableWeekdays: [7] }).ok).toBe(
      false,
    );
    const dup = validateSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS,
      bookableWeekdays: [1, 1, 2],
    });
    expect(dup.ok).toBe(true);
    if (dup.ok) expect(dup.value.bookableWeekdays).toEqual([1, 2]);
  });

  it('ข้อมูลที่ไม่ใช่ object ก็ไม่ทำให้ระบบล้ม', () => {
    for (const bad of [null, undefined, 'ข้อความ', 42, []]) {
      expect(validateSystemSettings(bad).ok).toBe(false);
    }
  });
});

describe('ตรวจข้อมูลห้องประชุม', () => {
  it('เติมค่าเริ่มต้นให้ฟิลด์ที่ไม่บังคับ', () => {
    const result = validateRoomInput({ code: 'MR-01', name: 'ห้องประชุมใหญ่', capacity: 20 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        code: 'MR-01',
        name: 'ห้องประชุมใหญ่',
        description: '',
        location: '',
        capacity: 20,
        equipment: [],
        imageUrl: null,
        status: 'active',
      });
    }
  });

  it('ตัดช่องว่างหัวท้ายและตัดอุปกรณ์ซ้ำ', () => {
    const result = validateRoomInput({
      code: 'MR-02',
      name: '  ห้องเล็ก  ',
      capacity: 4,
      equipment: ['tv', 'tv', 'projector'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('ห้องเล็ก');
      expect(result.value.equipment).toEqual(['tv', 'projector']);
    }
  });

  it('ปฏิเสธค่าที่ผิดและรายงานทุกฟิลด์ที่ผิดพร้อมกัน', () => {
    const result = validateRoomInput({
      code: 'MR 03',
      name: '',
      capacity: 2.5,
      equipment: ['ไม่มีจริง'],
      imageUrl: 'ไม่ใช่ลิงก์',
      status: 'ปิดบ้าง',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(fields(result.issues)).toEqual([
        'capacity',
        'code',
        'equipment',
        'imageUrl',
        'name',
        'status',
      ]);
    }
  });

  it('รับลิงก์รูปภาพที่ถูกต้อง และยอมรับค่าว่างเป็น null', () => {
    const withImage = validateRoomInput({
      code: 'MR-04',
      name: 'x',
      capacity: 4,
      imageUrl: 'https://example.com/a.png',
    });
    expect(withImage.ok && withImage.value.imageUrl).toBe('https://example.com/a.png');
    const blank = validateRoomInput({ code: 'MR-05', name: 'x', capacity: 4, imageUrl: '' });
    expect(blank.ok && blank.value.imageUrl).toBeNull();
  });
});

describe('ตรวจคำขอจอง', () => {
  const valid = {
    bookerName: 'อ.สมชาย ใจดี',
    roomId: 'room-1',
    dateKey: '2026-10-28',
    startMin: 600,
    endMin: 660,
    attendees: 5,
    title: 'ประชุมครูประจำแผนก',
    department: 'แผนกวิชาการบัญชี',
    requesterPosition: 'ครู',
    requesterPhone: '081-234-5678',
  };

  it('ต้องมีชื่อ ตำแหน่ง หน่วยงาน เบอร์โทร และเรื่อง ครบตามแบบคำขอ', () => {
    const { bookerName: _omit, ...withoutName } = valid;
    expect(validateBookingRequest(withoutName).ok).toBe(false);
    for (const field of ['title', 'department', 'requesterPosition', 'requesterPhone'] as const) {
      expect(validateBookingRequest({ ...valid, [field]: '  ' }).ok).toBe(false);
    }
    const result = validateBookingRequest(valid);
    expect(result.ok && result.value.bookerName).toBe('อ.สมชาย ใจดี');
  });

  it('เบอร์โทรรับเบอร์มือถือและเบอร์ภายใน แต่ไม่รับตัวอักษร', () => {
    expect(validateBookingRequest({ ...valid, requesterPhone: '0812345678' }).ok).toBe(true);
    expect(validateBookingRequest({ ...valid, requesterPhone: '036-123456 ต่อ 12' }).ok).toBe(true);
    expect(validateBookingRequest({ ...valid, requesterPhone: 'ไม่มี' }).ok).toBe(false);
  });

  it('คำขอที่ถูกต้องผ่านและเติมค่าเริ่มต้น', () => {
    const result = validateBookingRequest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.note).toBe('');
      expect(result.value.equipment).toEqual([]);
    }
  });

  it('เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด', () => {
    expect(validateBookingRequest({ ...valid, startMin: 660, endMin: 600 }).ok).toBe(false);
    expect(validateBookingRequest({ ...valid, startMin: 600, endMin: 600 }).ok).toBe(false);
  });

  it('ปฏิเสธเวลาที่หลุดขอบวัน (กันจองข้ามเที่ยงคืน)', () => {
    expect(validateBookingRequest({ ...valid, startMin: -15 }).ok).toBe(false);
    expect(validateBookingRequest({ ...valid, endMin: 1441 }).ok).toBe(false);
    expect(validateBookingRequest({ ...valid, startMin: 1430, endMin: 1440 }).ok).toBe(true);
  });

  it('ปฏิเสธวันที่ผิดรูปแบบ ชื่อผู้จองว่าง และจำนวนผู้เข้าร่วมที่ไม่ใช่จำนวนเต็ม', () => {
    expect(validateBookingRequest({ ...valid, dateKey: '28/10/2026' }).ok).toBe(false);
    expect(validateBookingRequest({ ...valid, bookerName: '   ' }).ok).toBe(false);
    expect(validateBookingRequest({ ...valid, attendees: 0 }).ok).toBe(false);
    expect(validateBookingRequest({ ...valid, attendees: 2.5 }).ok).toBe(false);
    expect(validateBookingRequest({ ...valid, attendees: '5' }).ok).toBe(false);
  });

  it('การตัดสินอนุมัติรับได้แค่ approve/reject', () => {
    expect(validateDecideBookingInput({ bookingId: 'b1', decision: 'approve' }).ok).toBe(true);
    expect(validateDecideBookingInput({ bookingId: 'b1', decision: 'maybe' }).ok).toBe(false);
    expect(validateDecideBookingInput({ bookingId: '', decision: 'approve' }).ok).toBe(false);
  });
});

describe('ตรวจการตั้งสิทธิ์ผู้ใช้', () => {
  it('รับอีเมลที่ถูกต้องและสิทธิ์ที่มีอยู่จริง', () => {
    expect(validateSetUserRoleInput({ email: 'a@b.co', role: 'admin' }).ok).toBe(true);
    expect(validateSetUserRoleInput({ email: 'a@b.co', role: 'superadmin' }).ok).toBe(false);
    expect(validateSetUserRoleInput({ email: 'ไม่ใช่อีเมล', role: 'staff' }).ok).toBe(false);
  });
});
