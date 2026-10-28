/**
 * กฎการตรวจคำขอจอง (ข้อกำหนด 5.1-5.3)
 *
 * ไฟล์นี้เป็นฟังก์ชันบริสุทธิ์ ไม่แตะฐานข้อมูล จึงถูกเรียกได้ทั้ง
 *  - ฝั่งหน้าเว็บ เพื่อบอกผู้ใช้ทันทีก่อนกดส่ง
 *  - ฝั่ง Cloud Function เพื่อเป็นคำตัดสินจริง (ตรวจซ้ำเสมอ ไม่เชื่อ client)
 * การตรวจ "ห้องว่างหรือไม่" ไม่อยู่ที่นี่ เพราะต้องอ่านฐานข้อมูลในทรานแซกชัน
 */

import {
  dateKeyRange,
  dayOfWeekOfDateKey,
  formatTimeOfDay,
  fromDateKeyAndMinutes,
  parseTimeOfDay,
} from '../time/bangkok';
import type { RoomEquipment, RoomStatus } from '../schemas/room';
import { ROOM_EQUIPMENT_LABEL_TH, isBookableRoomStatus } from '../schemas/room';
import type { SystemSettings } from '../schemas/settings';

export type BookingRuleCode =
  | 'ROOM_NOT_BOOKABLE'
  | 'TIME_ORDER'
  | 'TIME_NOT_ALIGNED'
  | 'DURATION_TOO_SHORT'
  | 'DURATION_TOO_LONG'
  | 'OUTSIDE_BUSINESS_HOURS'
  | 'DAY_NOT_BOOKABLE'
  | 'IN_THE_PAST'
  | 'LEAD_TIME_TOO_SHORT'
  | 'ATTENDEES_EXCEED_CAPACITY'
  | 'EQUIPMENT_UNAVAILABLE'
  | 'QUOTA_EXCEEDED';

export interface BookingRuleIssue {
  code: BookingRuleCode;
  /** ข้อความที่แสดงให้ผู้ใช้เห็นได้ตรง ๆ */
  message: string;
  /** ฟิลด์ในฟอร์มที่ควรถูกไฮไลต์ */
  field?: 'roomId' | 'dateKey' | 'startMin' | 'endMin' | 'attendees' | 'equipment';
}

export interface RoomForValidation {
  capacity: number;
  equipment: readonly RoomEquipment[];
  status: RoomStatus;
}

export interface BookingRuleInput {
  dateKey: string;
  startMin: number;
  endMin: number;
  attendees: number;
  equipment: readonly RoomEquipment[];
}

export interface BookingRuleContext {
  settings: SystemSettings;
  room: RoomForValidation;
  /** เวลาปัจจุบัน — ฝั่ง server ต้องส่งเวลาของ server เสมอ ไม่ใช่เวลาเครื่องผู้ใช้ */
  now: Date;
  isAdmin: boolean;
  /** จำนวนการจองที่ยังไม่สิ้นสุดของผู้ใช้คนนี้ (ไม่นับรายการที่กำลังแก้ไข) */
  activeBookingCount: number;
}

export type BookingRuleResult =
  | { ok: true }
  | { ok: false; issues: BookingRuleIssue[] };

/**
 * ตรวจทุกกฎแล้วคืน "ทุกข้อผิดพลาดพร้อมกัน" ไม่ใช่หยุดที่ข้อแรก
 * เพราะผู้ใช้ควรแก้ฟอร์มรอบเดียวจบ ไม่ใช่กดส่งแล้วเจอ error ทีละข้อ
 */
export function validateBookingRules(
  input: BookingRuleInput,
  context: BookingRuleContext,
): BookingRuleResult {
  const { settings, room, now, isAdmin } = context;
  const issues: BookingRuleIssue[] = [];

  if (!isBookableRoomStatus(room.status)) {
    issues.push({
      code: 'ROOM_NOT_BOOKABLE',
      message: 'ห้องนี้ไม่เปิดให้จองในขณะนี้',
      field: 'roomId',
    });
  }

  if (input.endMin <= input.startMin) {
    issues.push({
      code: 'TIME_ORDER',
      message: 'เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด',
      field: 'endMin',
    });
    // กฎที่เหลือคำนวณจากความยาวช่วงเวลา ถ้าช่วงเวลาผิดรูปก็ไม่ต้องตรวจต่อ
    return { ok: false, issues };
  }

  const durationMin = input.endMin - input.startMin;
  const { slotMinutes } = settings;

  if (input.startMin % slotMinutes !== 0 || input.endMin % slotMinutes !== 0) {
    issues.push({
      code: 'TIME_NOT_ALIGNED',
      message: `เวลาเริ่มและเวลาสิ้นสุดต้องลงตัวทุก ${slotMinutes} นาที`,
      field: 'startMin',
    });
  }

  if (durationMin < settings.minBookingMinutes) {
    issues.push({
      code: 'DURATION_TOO_SHORT',
      message: `ต้องจองอย่างน้อย ${settings.minBookingMinutes} นาที`,
      field: 'endMin',
    });
  }

  if (durationMin > settings.maxBookingMinutes) {
    issues.push({
      code: 'DURATION_TOO_LONG',
      message: `จองได้ครั้งละไม่เกิน ${Math.floor(settings.maxBookingMinutes / 60)} ชั่วโมง`,
      field: 'endMin',
    });
  }

  const openMin = parseTimeOfDay(settings.businessHoursStart);
  const closeMin = parseTimeOfDay(settings.businessHoursEnd);
  if (input.startMin < openMin || input.endMin > closeMin) {
    issues.push({
      code: 'OUTSIDE_BUSINESS_HOURS',
      message: `จองได้เฉพาะช่วง ${formatTimeOfDay(openMin)}-${formatTimeOfDay(closeMin)}`,
      field: 'startMin',
    });
  }

  if (!settings.bookableWeekdays.includes(dayOfWeekOfDateKey(input.dateKey))) {
    issues.push({
      code: 'DAY_NOT_BOOKABLE',
      message: 'วันที่เลือกไม่เปิดให้จอง',
      field: 'dateKey',
    });
  }

  // ใช้ instant จริงเทียบ เพื่อไม่ให้ผู้ใช้ที่ตั้งนาฬิกาเครื่องผิดจองย้อนหลังได้
  const startInstant = fromDateKeyAndMinutes(input.dateKey, input.startMin);
  const minutesUntilStart = (startInstant.getTime() - now.getTime()) / 60_000;
  const mayBackdate = isAdmin && settings.allowAdminBackdate;

  if (minutesUntilStart < 0 && !mayBackdate) {
    issues.push({
      code: 'IN_THE_PAST',
      message: 'ไม่สามารถจองย้อนหลังได้',
      field: 'dateKey',
    });
  } else if (
    minutesUntilStart >= 0 &&
    minutesUntilStart < settings.minLeadMinutes &&
    !isAdmin
  ) {
    issues.push({
      code: 'LEAD_TIME_TOO_SHORT',
      message: `ต้องจองล่วงหน้าอย่างน้อย ${settings.minLeadMinutes} นาที`,
      field: 'startMin',
    });
  }

  if (input.attendees > room.capacity) {
    issues.push({
      code: 'ATTENDEES_EXCEED_CAPACITY',
      message: `ห้องนี้รองรับได้ ${room.capacity} คน แต่ระบุผู้เข้าร่วม ${input.attendees} คน`,
      field: 'attendees',
    });
  }

  const missing = input.equipment.filter((item) => !room.equipment.includes(item));
  if (missing.length > 0) {
    issues.push({
      code: 'EQUIPMENT_UNAVAILABLE',
      message: `ห้องนี้ไม่มี ${missing.map((item) => ROOM_EQUIPMENT_LABEL_TH[item]).join(', ')}`,
      field: 'equipment',
    });
  }

  if (!isAdmin && context.activeBookingCount >= settings.maxActiveBookingsPerUser) {
    issues.push({
      code: 'QUOTA_EXCEEDED',
      message: `คุณมีการจองที่ยังไม่สิ้นสุดครบ ${settings.maxActiveBookingsPerUser} รายการแล้ว`,
    });
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

/** ยกเลิกได้หรือไม่ตามนโยบายเวลา (ผู้ดูแลข้ามได้ แต่ต้องลง audit log) */
export function canCancelBooking(params: {
  startInstant: Date;
  now: Date;
  settings: SystemSettings;
  isAdmin: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (params.isAdmin) return { ok: true };

  const minutesUntilStart = (params.startInstant.getTime() - params.now.getTime()) / 60_000;
  if (minutesUntilStart < 0) {
    return { ok: false, message: 'การประชุมเริ่มแล้ว ยกเลิกเองไม่ได้ กรุณาติดต่อผู้ดูแลระบบ' };
  }
  if (minutesUntilStart < params.settings.cancelCutoffMinutes) {
    return {
      ok: false,
      message: `ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย ${params.settings.cancelCutoffMinutes} นาที`,
    };
  }
  return { ok: true };
}

/** ช่วงเวลาทำการของวันนั้น ใช้เป็นกรอบในการเสนอเวลาว่างและคำนวณอัตราการใช้ห้อง */
export function businessWindow(settings: SystemSettings): { startMin: number; endMin: number } {
  return {
    startMin: parseTimeOfDay(settings.businessHoursStart),
    endMin: parseTimeOfDay(settings.businessHoursEnd),
  };
}

/** จำนวนวันที่เปิดให้จองในช่วงวันที่ (ตัดวันหยุดประจำสัปดาห์ออก) */
export function bookableDayCount(
  fromDateKey: string,
  toDateKey: string,
  settings: SystemSettings,
): number {
  return dateKeyRange(fromDateKey, toDateKey).filter((dateKey) =>
    settings.bookableWeekdays.includes(dayOfWeekOfDateKey(dateKey)),
  ).length;
}
