import { DATE_KEY_PATTERN, MINUTES_PER_DAY } from '../time/bangkok';
import { Check, type ValidationResult, asRecord } from '../validate/check';
import { ROOM_EQUIPMENT, type RoomEquipment } from './room';

export const REQUEST_FACILITIES = ['projector', 'soundSystem', 'microphone', 'airConditioning', 'internet'] as const;
export type RequestFacility = (typeof REQUEST_FACILITIES)[number];
export const REQUEST_FACILITY_LABEL_TH: Record<RequestFacility, string> = {
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
  /** หัวข้อการประชุม — ไม่บังคับแล้ว ฟอร์มใช้ชื่อผู้จองแทน */
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
  extraFurnitureCount: number;
  otherFacility: string;
  termsAccepted: boolean;
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
    title: check.string('title', input.title, { label: 'หัวข้อการประชุม', max: 200, fallback: '' }),
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
      label: 'แผนก',
      max: 100,
      fallback: '',
    }),
    requesterPosition: check.string('requesterPosition', input.requesterPosition, {
      label: 'ตำแหน่ง', max: 100, fallback: '',
    }),
    requesterPhone: check.string('requesterPhone', input.requesterPhone, {
      label: 'หมายเลขโทรศัพท์', max: 30, fallback: '',
    }),
    note: check.string('note', input.note, {
      label: 'รายละเอียดเพิ่มเติม',
      max: 1000,
      fallback: '',
    }),
    equipment: check.manyOf('equipment', input.equipment, ROOM_EQUIPMENT, {
      label: 'อุปกรณ์ที่ต้องการ',
    }),
    requestedFacilities: check.manyOf('requestedFacilities', input.requestedFacilities, REQUEST_FACILITIES, {
      label: 'อุปกรณ์ที่ขอใช้',
    }),
    extraFurnitureCount: check.integer('extraFurnitureCount', input.extraFurnitureCount ?? 0, {
      label: 'จำนวนโต๊ะ/เก้าอี้เสริม', min: 0, max: 500,
    }),
    otherFacility: check.string('otherFacility', input.otherFacility, {
      label: 'อุปกรณ์อื่น ๆ', max: 300, fallback: '',
    }),
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
