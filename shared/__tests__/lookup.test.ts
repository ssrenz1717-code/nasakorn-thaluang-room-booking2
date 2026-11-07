import { describe, expect, it } from 'vitest';
import {
  activeLookups, defaultLookups, lookupLabel, newLookupKey, unknownLookupKeys, validateLookupInput, type LookupItem,
} from '../schemas/lookup';
import { REQUEST_FACILITIES } from '../schemas/booking';
import { validateRoomInput, ROOM_IMAGE_MAX_CHARS } from '../schemas/room';

describe('ข้อมูลตั้งต้นที่ผู้ดูแลแก้ได้ (Lookups)', () => {
  const items = defaultLookups();

  it('ชุดเริ่มต้นใช้รหัสเดิมของระบบ การจองเก่าจึงยังแสดงชื่อถูก', () => {
    expect(activeLookups(items, 'facility').map((item) => item.key)).toEqual([...REQUEST_FACILITIES]);
    expect(new Set(items.map((item) => item.lookupId)).size).toBe(items.length);
  });

  it('ชื่อที่แสดงตามรายการที่แก้แล้ว และรายการที่ปิดไปแล้วยังแสดงชื่อได้', () => {
    const edited: LookupItem[] = items.map((item) => item.key === 'projector' && item.kind === 'facility'
      ? { ...item, label: 'โปรเจกเตอร์ (ใหม่)', active: false } : item);
    expect(lookupLabel(edited, 'facility', 'projector')).toBe('โปรเจกเตอร์ (ใหม่)');
    expect(activeLookups(edited, 'facility').some((item) => item.key === 'projector')).toBe(false);
    expect(unknownLookupKeys(edited, 'facility', ['projector', 'microphone'])).toEqual(['projector']);
  });

  it('ไม่พบในรายการใช้ชื่อเริ่มต้นในโค้ด แล้วค่อยใช้รหัส', () => {
    expect(lookupLabel([], 'facility', 'internet')).toBe('อินเทอร์เน็ต');
    expect(lookupLabel([], 'meetingType', 'zzz')).toBe('zzz');
  });

  it('เรียงตามลำดับที่ตั้ง', () => {
    const shuffled = items.map((item) => item.kind === 'position' && item.key === 'staff' ? { ...item, sortOrder: 1 } : item);
    expect(activeLookups(shuffled, 'position')[0]?.key).toBe('staff');
  });

  it('รหัสรายการใหม่ไม่ซ้ำของเดิม', () => {
    const first = newLookupKey('department', items, 12345);
    const second = newLookupKey('department', [...items, { ...items[0]!, kind: 'department', key: first }], 12345);
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{1,40}$/);
  });

  it('ตรวจข้อมูลที่ผู้ดูแลกรอก', () => {
    expect(validateLookupInput({ kind: 'department', label: '' }).ok).toBe(false);
    expect(validateLookupInput({ kind: 'unknown', label: 'x' }).ok).toBe(false);
    const ok = validateLookupInput({ kind: 'department', label: ' แผนกใหม่ ', note: 'นายหัวหน้า' });
    expect(ok.ok && ok.value).toMatchObject({ lookupId: '', label: 'แผนกใหม่', note: 'นายหัวหน้า', active: true });
  });
});

describe('รูปห้องประชุม', () => {
  const base = { code: 'R09', name: 'ห้องใหม่', capacity: 10 };
  it('รับรูปที่ย่อแล้วและลิงก์ https', () => {
    expect(validateRoomInput({ ...base, imageUrl: 'data:image/jpeg;base64,AAAA' }).ok).toBe(true);
    expect(validateRoomInput({ ...base, imageUrl: 'https://example.com/a.jpg' }).ok).toBe(true);
  });
  it('ไม่รับไฟล์ชนิดอื่นหรือรูปที่ใหญ่เกินเซลล์', () => {
    expect(validateRoomInput({ ...base, imageUrl: 'data:text/html;base64,AAAA' }).ok).toBe(false);
    expect(validateRoomInput({ ...base, imageUrl: `data:image/jpeg;base64,${'A'.repeat(ROOM_IMAGE_MAX_CHARS)}` }).ok).toBe(false);
  });
  it('อุปกรณ์ประจำห้องรับรหัสที่ผู้ดูแลเพิ่มเอง แต่ไม่รับค่าที่มีจุลภาค', () => {
    expect(validateRoomInput({ ...base, equipment: ['roo-abc'] }).ok).toBe(true);
    expect(validateRoomInput({ ...base, equipment: ['a,b'] }).ok).toBe(false);
  });
});
