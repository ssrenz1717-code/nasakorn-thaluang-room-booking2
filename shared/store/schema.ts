/**
 * โครงสร้างชีตทั้งหมดของระบบ — เป็นแหล่งความจริงแหล่งเดียว
 *
 * สคริปต์ติดตั้งสร้างชีตจากที่นี่ และชั้นอ่านข้อมูลก็ตรวจคอลัมน์ที่ต้องมีจากที่นี่
 * ถ้าจะเพิ่มฟิลด์ ให้แก้ที่ไฟล์นี้ที่เดียวแล้วรัน migrateSheets() ฝั่ง Apps Script
 */

import {
  type CellValue,
  keyValueToObject,
  readBoolean,
  readNumber,
  readString,
} from './table';
import {
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettings,
  validateSystemSettings,
} from '../schemas/settings';
import type { ValidationResult } from '../validate/check';

export interface SheetSpec {
  name: string;
  /** ลำดับคอลัมน์ในชีต — เรียงตามนี้จริงเมื่อสร้างชีตใหม่ */
  headers: string[];
  /** คอลัมน์ที่ใช้เป็นรหัสอ้างอิงแถว */
  keyColumn?: string;
  /** จำนวนคอลัมน์แรกที่ต้องอ่านบ่อย — จัดไว้ติดกันเพื่ออ่านเร็ว */
  hotColumns?: number;
}

export const SHEET_USERS = 'Users';
export const SHEET_ROOMS = 'Rooms';
export const SHEET_BOOKINGS = 'Bookings';
export const SHEET_NOTIFICATIONS = 'Notifications';
export const SHEET_AUDIT = 'AuditLogs';
export const SHEET_SETTINGS = 'Settings';
export const SHEET_META = 'Meta';

/**
 * คอลัมน์ของ Bookings เรียงให้ 6 คอลัมน์แรกเป็นคอลัมน์ที่ใช้ตรวจเวลาทับซ้อน
 *
 * เหตุผลด้านประสิทธิภาพ: ตอนตรวจว่าห้องว่างไหม เราอ่านแค่ 6 คอลัมน์แรกของทุกแถว
 * (getRange ต้องเป็นช่วงติดกัน) ถ้ากระจายคอลัมน์เหล่านี้ไปทั่วตาราง จะต้องอ่านทั้ง 25
 * คอลัมน์ ซึ่งที่ 10,000 รายการคือต่างกันระหว่าง ~0.2 วินาที กับ ~2 วินาทีต่อการจอง 1 ครั้ง
 */
export const BOOKING_HOT_COLUMNS = 6;

export const SHEET_SPECS: SheetSpec[] = [
  {
    name: SHEET_USERS,
    keyColumn: 'email',
    headers: [
      'email',
      'displayName',
      'department',
      'role',
      'status',
      'tokenVersion',
      'lastLoginAt',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    name: SHEET_ROOMS,
    keyColumn: 'roomId',
    headers: [
      'roomId',
      'code',
      'name',
      'description',
      'location',
      'capacity',
      'equipment',
      'imageUrl',
      'status',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    name: SHEET_BOOKINGS,
    keyColumn: 'bookingId',
    hotColumns: BOOKING_HOT_COLUMNS,
    headers: [
      // 6 คอลัมน์แรก = ที่ใช้ตรวจทับซ้อน ห้ามสลับลำดับ
      'bookingId',
      'roomId',
      'dateKey',
      'startMin',
      'endMin',
      'status',
      // ที่เหลืออ่านเฉพาะเวลาต้องแสดงรายละเอียด
      'title',
      'roomCode',
      'roomName',
      'userEmail',
      'userName',
      'department',
      'attendees',
      'equipment',
      'note',
      'requesterPosition',
      'requesterPhone',
      'requestedFacilities',
      'extraFurnitureCount',
      'otherFacility',
      'termsAccepted',
      'termsAcceptedAt',
      'durationMin',
      'startAt',
      'endAt',
      'createdBy',
      'createdAt',
      'updatedBy',
      'updatedAt',
      'decidedBy',
      'decidedAt',
      'cancelReason',
      'reminderSentAt',
      'completedAt',
      'bookerName',
    ],
  },
  {
    name: SHEET_NOTIFICATIONS,
    keyColumn: 'notificationId',
    headers: [
      'notificationId',
      'userEmail',
      'type',
      'title',
      'body',
      'bookingId',
      'dedupeKey',
      'createdAt',
      'readAt',
    ],
  },
  {
    name: SHEET_AUDIT,
    keyColumn: 'auditId',
    headers: ['auditId', 'at', 'actorEmail', 'action', 'targetType', 'targetId', 'detail'],
  },
  {
    name: SHEET_SETTINGS,
    keyColumn: 'key',
    headers: ['key', 'value', 'description'],
  },
  {
    name: SHEET_META,
    keyColumn: 'key',
    headers: ['key', 'value'],
  },
];

export function sheetSpec(name: string): SheetSpec {
  const spec = SHEET_SPECS.find((item) => item.name === name);
  if (spec === undefined) throw new Error(`ไม่รู้จักชีตชื่อ "${name}"`);
  return spec;
}

/** คำอธิบายค่าตั้งค่าแต่ละตัว เขียนลงคอลัมน์ description ให้คนเปิดชีตอ่านเข้าใจ */
export const SETTING_DESCRIPTIONS: Record<keyof SystemSettings, string> = {
  businessHoursStart: 'เวลาเปิดให้จอง รูปแบบ HH:mm',
  businessHoursEnd: 'เวลาปิดให้จอง รูปแบบ HH:mm',
  bookableWeekdays: 'วันที่เปิดให้จอง คั่นด้วยจุลภาค 0=อาทิตย์ ถึง 6=เสาร์',
  slotMinutes: 'ความละเอียดของเวลา เวลาเริ่ม/จบต้องลงตัวตามค่านี้',
  minBookingMinutes: 'ความยาวการจองขั้นต่ำ (นาที)',
  maxBookingMinutes: 'ความยาวการจองสูงสุด (นาที)',
  minLeadMinutes: 'ต้องจองล่วงหน้าอย่างน้อยกี่นาที (0 = จองใช้ทันทีได้)',
  cancelCutoffMinutes: 'ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อยกี่นาที',
  approvalRequired: 'TRUE = การจองต้องรออนุมัติก่อน, FALSE = ยืนยันทันที',
  allowAdminBackdate: 'TRUE = ผู้ดูแลจองย้อนหลังได้',
  maxActiveBookingsPerUser: 'จำนวนการจองที่ยังไม่สิ้นสุดสูงสุดต่อคน',
  reminderLeadMinutes: 'แจ้งเตือนก่อนเริ่มประชุมกี่นาที',
};

/** แปลงค่าตั้งค่าเป็นแถวสำหรับเขียนลงชีต Settings */
export function settingsToRows(settings: SystemSettings): CellValue[][] {
  return (Object.keys(SETTING_DESCRIPTIONS) as (keyof SystemSettings)[]).map((key) => {
    const value = settings[key];
    const cell: CellValue = Array.isArray(value) ? value.join(',') : value;
    return [key, cell, SETTING_DESCRIPTIONS[key]];
  });
}

/**
 * อ่านค่าตั้งค่าจากชีต โดยทนกับการที่คนไปพิมพ์มือในชีต
 *
 * ค่าที่หายหรือพิมพ์ผิดจะถูกแทนด้วยค่าเริ่มต้นแล้วรายงานกลับเป็น issue
 * เหตุผล: ระบบต้องยังทำงานต่อได้แม้ชีตถูกแก้ผิด ไม่ใช่ล่มทั้งระบบเพราะพิมพ์ TRUE ผิด
 */
export function rowsToSettings(rows: readonly CellValue[][]): ValidationResult<SystemSettings> {
  const record = keyValueToObject(rows);

  const weekdaysRaw = readString(record, 'bookableWeekdays');
  const bookableWeekdays =
    weekdaysRaw.trim() === ''
      ? DEFAULT_SYSTEM_SETTINGS.bookableWeekdays
      : weekdaysRaw
          .split(',')
          .map((part) => Number(part.trim()))
          .filter((day) => Number.isInteger(day));

  const candidate: SystemSettings = {
    businessHoursStart:
      readString(record, 'businessHoursStart') || DEFAULT_SYSTEM_SETTINGS.businessHoursStart,
    businessHoursEnd:
      readString(record, 'businessHoursEnd') || DEFAULT_SYSTEM_SETTINGS.businessHoursEnd,
    bookableWeekdays,
    slotMinutes: readNumber(record, 'slotMinutes', DEFAULT_SYSTEM_SETTINGS.slotMinutes),
    minBookingMinutes: readNumber(
      record,
      'minBookingMinutes',
      DEFAULT_SYSTEM_SETTINGS.minBookingMinutes,
    ),
    maxBookingMinutes: readNumber(
      record,
      'maxBookingMinutes',
      DEFAULT_SYSTEM_SETTINGS.maxBookingMinutes,
    ),
    minLeadMinutes: readNumber(record, 'minLeadMinutes', DEFAULT_SYSTEM_SETTINGS.minLeadMinutes),
    cancelCutoffMinutes: readNumber(
      record,
      'cancelCutoffMinutes',
      DEFAULT_SYSTEM_SETTINGS.cancelCutoffMinutes,
    ),
    approvalRequired: readBoolean(
      record,
      'approvalRequired',
      DEFAULT_SYSTEM_SETTINGS.approvalRequired,
    ),
    allowAdminBackdate: readBoolean(
      record,
      'allowAdminBackdate',
      DEFAULT_SYSTEM_SETTINGS.allowAdminBackdate,
    ),
    maxActiveBookingsPerUser: readNumber(
      record,
      'maxActiveBookingsPerUser',
      DEFAULT_SYSTEM_SETTINGS.maxActiveBookingsPerUser,
    ),
    reminderLeadMinutes: readNumber(
      record,
      'reminderLeadMinutes',
      DEFAULT_SYSTEM_SETTINGS.reminderLeadMinutes,
    ),
  };

  return validateSystemSettings(candidate);
}

/** ค่าตั้งค่าที่ใช้ได้จริงเสมอ — ถ้าชีตพัง ใช้ค่าเริ่มต้นแทนพร้อมบอกว่าพังที่ไหน */
export function readSettingsOrDefault(rows: readonly CellValue[][]): {
  settings: SystemSettings;
  problems: string[];
} {
  const result = rowsToSettings(rows);
  if (result.ok) return { settings: result.value, problems: [] };
  return {
    settings: DEFAULT_SYSTEM_SETTINGS,
    problems: result.issues.map((issue) => `${issue.field}: ${issue.message}`),
  };
}
