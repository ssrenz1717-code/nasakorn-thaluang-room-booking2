import { describe, expect, it } from 'vitest';
import {
  BOOKING_HOT_COLUMNS,
  SHEET_BOOKINGS,
  SHEET_SPECS,
  readSettingsOrDefault,
  rowsToSettings,
  settingsToRows,
  sheetSpec,
} from '../store/schema';
import { DEFAULT_SYSTEM_SETTINGS } from '../schemas/settings';
import { buildHeaderMap, missingColumns } from '../store/table';

describe('โครงสร้างชีต', () => {
  it('ทุกชีตมีชื่อไม่ซ้ำและมีคอลัมน์ไม่ซ้ำกันภายในชีต', () => {
    const names = SHEET_SPECS.map((spec) => spec.name);
    expect(new Set(names).size).toBe(names.length);

    for (const spec of SHEET_SPECS) {
      expect(new Set(spec.headers).size, `ชีต ${spec.name} มีคอลัมน์ซ้ำ`).toBe(
        spec.headers.length,
      );
      expect(spec.headers.length).toBeGreaterThan(0);
    }
  });

  it('คอลัมน์ที่ใช้เป็นรหัสอ้างอิง ต้องมีอยู่ในหัวตารางจริง', () => {
    for (const spec of SHEET_SPECS) {
      if (spec.keyColumn !== undefined) {
        expect(spec.headers, `ชีต ${spec.name}`).toContain(spec.keyColumn);
      }
    }
  });

  it('6 คอลัมน์แรกของ Bookings ต้องเป็นคอลัมน์ที่ใช้ตรวจเวลาทับซ้อน (ห้ามสลับ)', () => {
    const bookings = sheetSpec(SHEET_BOOKINGS);
    expect(bookings.headers.slice(0, BOOKING_HOT_COLUMNS)).toEqual([
      'bookingId',
      'roomId',
      'dateKey',
      'startMin',
      'endMin',
      'status',
    ]);
  });

  it('หาชีตที่ไม่มีอยู่ต้องโยน error ชัดเจน', () => {
    expect(() => sheetSpec('ชีตที่ไม่มีจริง')).toThrowError(/ไม่รู้จักชีต/);
  });

  it('หัวตารางที่ประกาศไว้ ใช้สร้าง header map ได้ครบทุกคอลัมน์', () => {
    for (const spec of SHEET_SPECS) {
      const map = buildHeaderMap(spec.headers);
      expect(Object.keys(map).length).toBe(spec.headers.length);
      expect(missingColumns(spec.headers, spec.headers)).toEqual([]);
    }
  });
});

describe('ค่าตั้งค่าในชีต Settings', () => {
  it('เขียนลงชีตแล้วอ่านกลับได้ค่าเดิมทุกตัว', () => {
    const rows = settingsToRows(DEFAULT_SYSTEM_SETTINGS);
    const result = rowsToSettings(rows);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(DEFAULT_SYSTEM_SETTINGS);
  });

  it('เขียนครบทุกฟิลด์และมีคำอธิบายภาษาไทยให้คนเปิดชีตอ่าน', () => {
    const rows = settingsToRows(DEFAULT_SYSTEM_SETTINGS);
    expect(rows.length).toBe(Object.keys(DEFAULT_SYSTEM_SETTINGS).length);
    for (const row of rows) {
      expect(typeof row[0]).toBe('string');
      expect(String(row[2]).length).toBeGreaterThan(5);
    }
  });

  it('วันในสัปดาห์เก็บเป็นข้อความคั่นจุลภาค อ่านกลับเป็นตัวเลข', () => {
    const result = rowsToSettings([
      ...settingsToRows(DEFAULT_SYSTEM_SETTINGS).filter((row) => row[0] !== 'bookableWeekdays'),
      ['bookableWeekdays', '1, 3 ,5'],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.bookableWeekdays).toEqual([1, 3, 5]);
  });

  it('ค่าที่คนพิมพ์มือผิด ถูกแทนด้วยค่าเริ่มต้น ไม่ทำให้ระบบล่ม', () => {
    const rows = settingsToRows(DEFAULT_SYSTEM_SETTINGS).map((row) =>
      row[0] === 'slotMinutes' ? ['slotMinutes', 'สิบห้า', ''] : row,
    );
    const result = rowsToSettings(rows);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.slotMinutes).toBe(DEFAULT_SYSTEM_SETTINGS.slotMinutes);
  });

  it('TRUE/FALSE ในชีตอ่านเป็น boolean ได้ทั้งแบบ boolean จริงและข้อความ', () => {
    const base = settingsToRows(DEFAULT_SYSTEM_SETTINGS).filter(
      (row) => row[0] !== 'approvalRequired',
    );
    for (const raw of [true, 'TRUE', 'true', 'ใช่']) {
      const result = rowsToSettings([...base, ['approvalRequired', raw as never]]);
      expect(result.ok && result.value.approvalRequired, `ค่า ${String(raw)}`).toBe(true);
    }
    for (const raw of [false, 'FALSE', 'ไม่']) {
      const result = rowsToSettings([...base, ['approvalRequired', raw as never]]);
      expect(result.ok && result.value.approvalRequired, `ค่า ${String(raw)}`).toBe(false);
    }
  });

  it('ชีตที่ตั้งค่าขัดแย้งกันเอง ต้องถอยไปใช้ค่าเริ่มต้นพร้อมบอกปัญหา', () => {
    const broken = settingsToRows({
      ...DEFAULT_SYSTEM_SETTINGS,
      businessHoursStart: '18:00',
      businessHoursEnd: '08:00',
    });
    const { settings, problems } = readSettingsOrDefault(broken);
    expect(settings).toEqual(DEFAULT_SYSTEM_SETTINGS);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(' ')).toContain('businessHoursEnd');
  });

  it('ชีตว่างเปล่า (ยังไม่ติดตั้ง) ก็ได้ค่าเริ่มต้นที่ใช้งานได้', () => {
    const { settings, problems } = readSettingsOrDefault([]);
    expect(settings).toEqual(DEFAULT_SYSTEM_SETTINGS);
    expect(problems).toEqual([]);
  });
});
