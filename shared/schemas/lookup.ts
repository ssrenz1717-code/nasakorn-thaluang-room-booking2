import { Check, type ValidationResult, asRecord } from '../validate/check';
import { ROOM_EQUIPMENT_LABEL_TH } from './room';
import { REQUEST_FACILITY_LABEL_TH } from './booking';

/**
 * ข้อมูลตั้งต้นที่ผู้ดูแลแก้ได้เองในหน้า "ตั้งค่าข้อมูล" โดยไม่ต้องแก้โค้ด
 * ทุกชนิดอยู่ในชีต Lookups ชีตเดียว แยกด้วยคอลัมน์ kind — เพิ่มชนิดใหม่ในอนาคตได้โดยไม่ต้องสร้างชีตใหม่
 */
export const LOOKUP_KINDS = ['roomEquipment', 'facility', 'meetingType', 'department', 'position'] as const;
export type LookupKind = (typeof LOOKUP_KINDS)[number];

export const LOOKUP_KIND_LABEL_TH: Record<LookupKind, string> = {
  roomEquipment: 'อุปกรณ์ประจำห้อง',
  facility: 'อุปกรณ์ที่ขอใช้ได้',
  meetingType: 'ประเภทการประชุม',
  department: 'แผนกวิชา / หน่วยงาน',
  position: 'ตำแหน่ง',
};

/** ความหมายของช่อง note แยกตามชนิด — ไม่มี = ไม่แสดงช่องนี้ */
export const LOOKUP_NOTE_LABEL_TH: Partial<Record<LookupKind, string>> = {
  department: 'หัวหน้าแผนก / หัวหน้างาน',
};

export interface LookupItem {
  lookupId: string;
  kind: LookupKind;
  /**
   * ค่าที่บันทึกลงการจองและห้อง — ไม่เปลี่ยนหลังสร้าง แก้ได้แค่ชื่อที่แสดง
   * การจองเก่าจึงยังอ้างถึงรายการเดิมได้แม้เปลี่ยนชื่อ
   */
  key: string;
  label: string;
  note: string;
  sortOrder: number;
  active: boolean;
}

/** รหัสรายการ: ตัวอักษรอังกฤษ ตัวเลข ขีด — ไม่มีจุลภาคเพราะเก็บเป็นรายการคั่นจุลภาคในชีต */
export const LOOKUP_KEY_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export interface LookupInput {
  /** ว่าง = เพิ่มใหม่ */
  lookupId: string;
  kind: LookupKind;
  label: string;
  note: string;
  sortOrder: number;
  active: boolean;
}

export function validateLookupInput(raw: unknown): ValidationResult<LookupInput> {
  const input = asRecord(raw);
  const check = new Check();
  return check.result({
    lookupId: check.string('lookupId', input.lookupId, { label: 'รหัสรายการ', max: 60, fallback: '' }),
    kind: check.oneOf('kind', input.kind, LOOKUP_KINDS, { label: 'ชนิดข้อมูล' }),
    label: check.string('label', input.label, { label: 'ชื่อรายการ', min: 1, max: 100 }),
    note: check.string('note', input.note, { label: 'หมายเหตุ', max: 100, fallback: '' }),
    sortOrder: check.integer('sortOrder', input.sortOrder ?? 0, { label: 'ลำดับ', min: 0, max: 9999 }),
    active: check.boolean('active', input.active, { label: 'สถานะ', fallback: true }),
  });
}

/** รายการที่ยังเปิดใช้ของชนิดนั้น เรียงตามลำดับที่ผู้ดูแลตั้ง */
export function activeLookups(items: readonly LookupItem[], kind: LookupKind): LookupItem[] {
  return sortLookups(items.filter((item) => item.kind === kind && item.active));
}

export function sortLookups(items: readonly LookupItem[]): LookupItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'th'));
}

/**
 * ชื่อที่แสดงของรหัส — ใช้ได้กับรายการที่ปิดไปแล้วด้วย (การจองเก่ายังแสดงชื่อเดิม)
 * ไม่พบเลยให้ใช้ชื่อเริ่มต้นในโค้ด แล้วค่อยใช้ตัวรหัสเอง
 */
export function lookupLabel(items: readonly LookupItem[], kind: LookupKind, key: string): string {
  const found = items.find((item) => item.kind === kind && item.key === key);
  if (found) return found.label;
  if (kind === 'facility') return (REQUEST_FACILITY_LABEL_TH as Record<string, string>)[key] ?? key;
  if (kind === 'roomEquipment') return (ROOM_EQUIPMENT_LABEL_TH as Record<string, string>)[key] ?? key;
  return key;
}

/** รหัสที่ไม่มีอยู่หรือถูกปิดไปแล้ว — ใช้ปฏิเสธการบันทึกห้อง/การจองที่อ้างรายการที่เลือกไม่ได้ */
export function unknownLookupKeys(items: readonly LookupItem[], kind: LookupKind, keys: readonly string[]): string[] {
  const allowed = new Set(activeLookups(items, kind).map((item) => item.key));
  return keys.filter((key) => !allowed.has(key));
}

/** รหัสของรายการใหม่ — ตัวอักษร + เวลา ไม่ซ้ำกันแม้กดเพิ่มติดกัน */
export function newLookupKey(kind: LookupKind, existing: readonly LookupItem[], seed: number): string {
  const prefix = kind.slice(0, 3);
  let key = `${prefix}-${seed.toString(36)}`;
  let n = 1;
  while (existing.some((item) => item.key === key)) key = `${prefix}-${seed.toString(36)}${n++}`;
  return key;
}

type Seed = readonly [key: string, label: string, note?: string];

const SEED: Record<LookupKind, readonly Seed[]> = {
  roomEquipment: Object.entries(ROOM_EQUIPMENT_LABEL_TH),
  facility: Object.entries(REQUEST_FACILITY_LABEL_TH),
  meetingType: [
    ['internal', 'ประชุมภายใน'],
    ['training', 'อบรม / สัมมนา'],
    ['activity', 'กิจกรรมนักเรียน นักศึกษา'],
    ['visitor', 'ต้อนรับแขก / ศึกษาดูงาน'],
    ['exam', 'สอบ / ทดสอบ'],
    ['other', 'อื่น ๆ'],
  ],
  department: [
    ['acc', 'แผนกวิชาการบัญชี'],
    ['dbt', 'แผนกวิชาเทคโนโลยีธุรกิจดิจิทัล'],
    ['mkt', 'แผนกวิชาการตลาด'],
    ['auto', 'แผนกวิชาช่างยนต์'],
    ['elec', 'แผนกวิชาช่างไฟฟ้ากำลัง'],
    ['etro', 'แผนกวิชาช่างอิเล็กทรอนิกส์'],
    ['mech', 'แผนกวิชาช่างกลโรงงาน'],
    ['weld', 'แผนกวิชาช่างเชื่อมโลหะ'],
    ['gen', 'แผนกวิชาสามัญสัมพันธ์'],
    ['digital', 'งานศูนย์ดิจิทัลและสื่อสารองค์กร'],
    ['plan', 'ฝ่ายพัฒนายุทธศาสตร์และแผนงาน'],
  ],
  position: [
    ['director', 'ผู้อำนวยการ'],
    ['deputy', 'รองผู้อำนวยการ'],
    ['head', 'หัวหน้าแผนกวิชา'],
    ['teacher', 'ครู'],
    ['assistant', 'ครูผู้ช่วย'],
    ['contract', 'พนักงานราชการ'],
    ['staff', 'เจ้าหน้าที่'],
  ],
};

/** รายการเริ่มต้น — สร้างชีต Lookups ครั้งแรก และข้อมูลโหมดในเบราว์เซอร์ (รหัสเดิมของระบบใช้ต่อได้) */
export function defaultLookups(): LookupItem[] {
  return LOOKUP_KINDS.flatMap((kind) => SEED[kind].map(([key, label, note = ''], index) => ({
    lookupId: `lk-${kind}-${key}`, kind, key, label, note, sortOrder: (index + 1) * 10, active: true,
  })));
}
