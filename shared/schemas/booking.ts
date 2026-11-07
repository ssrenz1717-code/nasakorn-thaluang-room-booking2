import { DATE_KEY_PATTERN, MINUTES_PER_DAY } from '../time/bangkok';
import { Check, type ValidationResult, asRecord } from '../validate/check';
import type { RoomEquipment } from './room';

export const REQUEST_FACILITIES = ['projector', 'soundSystem', 'microphone', 'airConditioning', 'internet'] as const;
/**
 * รหัสอุปกรณ์ที่ขอใช้ — ผู้ดูแลเพิ่มรายการเองได้ (ชีต Lookups ชนิด facility)
 * 5 รายการข้างบนคือช่องที่พิมพ์ไว้ในแบบคำขอกระดาษ รายการที่เพิ่มภายหลังพิมพ์ในบรรทัด "อื่น ๆ"
 */
export type RequestFacility = string;
export const REQUEST_FACILITY_LABEL_TH: Record<(typeof REQUEST_FACILITIES)[number], string> = {
  projector: 'เครื่องฉายภาพ (Projector)',
  soundSystem: 'ระบบเสียง',
  microphone: 'ไมโครโฟน',
  airConditioning: 'เครื่องปรับอากาศ',
  internet: 'อินเทอร์เน็ต',
};

/**
 * ข้อมูลที่หน้าเว็บส่งมาขอจอง
 *
 * ส่งเป็น dateKey + นาที (ไม่ใช่ ISO string) เพื่อตัดปัญหา timezone ที่ต้นทาง:
 * ผู้ใช้เลือก "28 ต.ค. 09:00-10:00 เวลาไทย" ไม่ใช่ instant ตาม timezone เครื่องเขา
 */
export interface BookingRequest {
  /** ชื่อผู้จองที่จะแสดงในปฏิทินและพิมพ์ลงแบบฟอร์ม */
  bookerName: string;
  /** เพื่อใช้ในการดำเนินงาน เรื่อง (หัวข้อ) ตามแบบคำขอ */
  title: string;
  roomId: string;
  dateKey: string;
  startMin: number;
  endMin: number;
  attendees: number;
  department: string;
  requesterPosition: string;
  requesterPhone: string;
  note: string;
  equipment: RoomEquipment[];
  requestedFacilities: RequestFacility[];
  /** ประเภทการประชุม (รหัสจาก Lookups ชนิด meetingType) — ไม่บังคับ */
  meetingType: string;
  extraFurnitureCount: number;
  otherFacility: string;
  termsAccepted: boolean;
  /** สถานที่ที่ผู้ขอระบุเอง เมื่อเลือกห้อง "อื่น ๆ" (ห้องอื่นเป็นค่าว่าง) */
  customLocation: string;
}

export function validateBookingRequest(raw: unknown): ValidationResult<BookingRequest> {
  const input = asRecord(raw);
  const check = new Check();

  const startMin = check.integer('startMin', input.startMin, {
    label: 'เวลาเริ่ม',
    min: 0,
    max: MINUTES_PER_DAY - 1,
  });
  const endMin = check.integer('endMin', input.endMin, {
    label: 'เวลาสิ้นสุด',
    min: 1,
    max: MINUTES_PER_DAY,
  });

  const value: BookingRequest = {
    bookerName: check.string('bookerName', input.bookerName, { label: 'ชื่อผู้จอง', max: 100 }),
    title: check.string('title', input.title, { label: 'เรื่องที่ใช้ดำเนินงาน', min: 1, max: 200 }),
    roomId: check.string('roomId', input.roomId, { label: 'ห้องประชุม' }),
    dateKey: check.string('dateKey', input.dateKey, {
      label: 'วันที่',
      pattern: DATE_KEY_PATTERN,
      patternMessage: 'วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD',
    }),
    startMin,
    endMin,
    attendees: check.integer('attendees', input.attendees, {
      label: 'จำนวนผู้เข้าร่วม',
      min: 1,
    }),
    department: check.string('department', input.department, {
      label: 'หน่วยงาน / สาขาวิชา',
      min: 1,
      max: 100,
    }),
    requesterPosition: check.string('requesterPosition', input.requesterPosition, {
      label: 'ตำแหน่ง', min: 1, max: 100,
    }),
    // เบอร์มือถือ เบอร์โต๊ะ หรือเบอร์ภายใน (เช่น "ต่อ 123") — ตรวจแค่ว่าเป็นตัวเลขกับเครื่องหมายที่ใช้เขียนเบอร์
    requesterPhone: check.string('requesterPhone', input.requesterPhone, {
      label: 'หมายเลขโทรศัพท์', min: 3, max: 30,
      pattern: /^[0-9+()\-.\s]*(?:ต่อ\s*[0-9]+)?$/, patternMessage: 'หมายเลขโทรศัพท์ใส่ได้เฉพาะตัวเลข เช่น 081-234-5678 หรือ ต่อ 123',
    }),
    note: check.string('note', input.note, {
      label: 'รายละเอียดเพิ่มเติม',
      max: 1000,
      fallback: '',
    }),
    equipment: check.keys('equipment', input.equipment, { label: 'อุปกรณ์ที่ต้องการ' }),
    requestedFacilities: check.keys('requestedFacilities', input.requestedFacilities, { label: 'อุปกรณ์ที่ขอใช้' }),
    meetingType: check.string('meetingType', input.meetingType, {
      label: 'ประเภทการประชุม', max: 40, fallback: '', pattern: /^[A-Za-z0-9_-]*$/, patternMessage: 'ประเภทการประชุมไม่ถูกต้อง',
    }),
    extraFurnitureCount: check.integer('extraFurnitureCount', input.extraFurnitureCount ?? 0, {
      label: 'จำนวนโต๊ะ/เก้าอี้เสริม', min: 0, max: 500,
    }),
    otherFacility: check.string('otherFacility', input.otherFacility, {
      label: 'อุปกรณ์อื่น ๆ', max: 300, fallback: '',
    }),
    customLocation: check.string('customLocation', input.customLocation, { label: 'สถานที่ที่ระบุเอง', max: 200, fallback: '' }),
    termsAccepted: check.boolean('termsAccepted', input.termsAccepted, {
      label: 'การยอมรับเงื่อนไข', fallback: false,
    }),
  };

  if (endMin <= startMin) {
    check.fail('endMin', 'เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด');
  }

  return check.result(value);
}

export interface CancelBookingInput {
  bookingId: string;
  reason: string;
}

export function validateCancelBookingInput(raw: unknown): ValidationResult<CancelBookingInput> {
  const input = asRecord(raw);
  const check = new Check();
  return check.result({
    bookingId: check.string('bookingId', input.bookingId, { label: 'รหัสการจอง' }),
    reason: check.string('reason', input.reason, { label: 'เหตุผล', max: 500, fallback: '' }),
  });
}

export const BOOKING_DECISIONS = ['approve', 'reject'] as const;
export type BookingDecision = (typeof BOOKING_DECISIONS)[number];

export interface DecideBookingInput {
  bookingId: string;
  decision: BookingDecision;
  reason: string;
}

export function validateDecideBookingInput(raw: unknown): ValidationResult<DecideBookingInput> {
  const input = asRecord(raw);
  const check = new Check();
  return check.result({
    bookingId: check.string('bookingId', input.bookingId, { label: 'รหัสการจอง' }),
    decision: check.oneOf('decision', input.decision, BOOKING_DECISIONS, { label: 'การตัดสิน' }),
    reason: check.string('reason', input.reason, { label: 'เหตุผล', max: 500, fallback: '' }),
  });
}

export interface AvailabilityInput {
  roomId: string;
  dateKey: string;
}

export function validateAvailabilityInput(raw: unknown): ValidationResult<AvailabilityInput> {
  const input = asRecord(raw);
  const check = new Check();
  return check.result({
    roomId: check.string('roomId', input.roomId, { label: 'ห้องประชุม' }),
    dateKey: check.string('dateKey', input.dateKey, {
      label: 'วันที่',
      pattern: DATE_KEY_PATTERN,
      patternMessage: 'วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD',
    }),
  });
}
