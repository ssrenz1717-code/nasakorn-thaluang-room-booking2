import { Check, type ValidationResult, asRecord } from '../validate/check';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * ค่าตั้งค่าระบบ — เก็บในชีต Settings
 * ทุกกฎธุรกิจอยู่ที่นี่ ไม่ฮาร์ดโค้ดในโค้ด เพื่อให้ผู้ดูแลแก้เองได้ภายหลัง
 */
export interface SystemSettings {
  /** เวลาเปิดให้จอง (ใช้เป็นตัวหารของอัตราการใช้ห้องด้วย) */
  businessHoursStart: string;
  businessHoursEnd: string;
  /** วันที่เปิดให้จอง 0=อาทิตย์ ... 6=เสาร์ */
  bookableWeekdays: number[];
  /** ความละเอียดของเวลา เวลาเริ่ม/จบต้องลงตัวตามค่านี้ */
  slotMinutes: number;
  minBookingMinutes: number;
  maxBookingMinutes: number;
  /** ต้องจองล่วงหน้าอย่างน้อยกี่นาที (0 = จองใช้ทันทีได้) */
  minLeadMinutes: number;
  /** ยกเลิกได้ถ้าเหลือเวลาก่อนเริ่มมากกว่าค่านี้ */
  cancelCutoffMinutes: number;
  /** เปิดระบบอนุมัติหรือไม่ — ปิด = ผ่าน validation แล้วเป็น confirmed ทันที */
  approvalRequired: boolean;
  /** ให้ผู้ดูแลจองย้อนหลังได้หรือไม่ (บันทึกลง audit log ทุกครั้ง) */
  allowAdminBackdate: boolean;
  /** จำกัดจำนวนการจองที่ยังไม่สิ้นสุดต่อคน กัน spam */
  maxActiveBookingsPerUser: number;
  /** แจ้งเตือนก่อนเริ่มประชุมกี่นาที */
  reminderLeadMinutes: number;
}

/** ค่าเริ่มต้นสำหรับองค์กรทั่วไป — ผู้ดูแลแก้ได้ในหน้าตั้งค่าระบบ */
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  businessHoursStart: '08:00',
  businessHoursEnd: '18:00',
  bookableWeekdays: [1, 2, 3, 4, 5],
  slotMinutes: 15,
  minBookingMinutes: 15,
  maxBookingMinutes: 480,
  minLeadMinutes: 0,
  cancelCutoffMinutes: 0,
  approvalRequired: true,
  allowAdminBackdate: true,
  maxActiveBookingsPerUser: 20,
  reminderLeadMinutes: 15,
};

export function validateSystemSettings(raw: unknown): ValidationResult<SystemSettings> {
  const input = asRecord(raw);
  const check = new Check();

  const businessHoursStart = check.string('businessHoursStart', input.businessHoursStart, {
    label: 'เวลาเปิดทำการ',
    pattern: TIME_PATTERN,
    patternMessage: 'เวลาเปิดทำการต้องอยู่ในรูปแบบ HH:mm เช่น 08:30',
  });
  const businessHoursEnd = check.string('businessHoursEnd', input.businessHoursEnd, {
    label: 'เวลาปิดทำการ',
    pattern: TIME_PATTERN,
    patternMessage: 'เวลาปิดทำการต้องอยู่ในรูปแบบ HH:mm เช่น 18:00',
  });

  const weekdaysRaw = Array.isArray(input.bookableWeekdays) ? input.bookableWeekdays : null;
  const bookableWeekdays: number[] = [];
  if (weekdaysRaw === null || weekdaysRaw.length === 0) {
    check.fail('bookableWeekdays', 'ต้องเลือกวันที่เปิดให้จองอย่างน้อย 1 วัน');
  } else {
    for (const day of weekdaysRaw) {
      if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) {
        check.fail('bookableWeekdays', 'วันในสัปดาห์ต้องเป็นตัวเลข 0-6');
        break;
      }
      if (!bookableWeekdays.includes(day)) bookableWeekdays.push(day);
    }
  }

  const slotMinutes = check.integer('slotMinutes', input.slotMinutes, {
    label: 'ความละเอียดของเวลา',
    min: 5,
    max: 60,
  });
  const minBookingMinutes = check.integer('minBookingMinutes', input.minBookingMinutes, {
    label: 'ความยาวการจองขั้นต่ำ',
    min: 5,
  });
  const maxBookingMinutes = check.integer('maxBookingMinutes', input.maxBookingMinutes, {
    label: 'ความยาวการจองสูงสุด',
    min: 5,
  });

  const value: SystemSettings = {
    businessHoursStart,
    businessHoursEnd,
    bookableWeekdays,
    slotMinutes,
    minBookingMinutes,
    maxBookingMinutes,
    minLeadMinutes: check.integer('minLeadMinutes', input.minLeadMinutes, {
      label: 'เวลาจองล่วงหน้าขั้นต่ำ',
      min: 0,
    }),
    cancelCutoffMinutes: check.integer('cancelCutoffMinutes', input.cancelCutoffMinutes, {
      label: 'เกณฑ์เวลายกเลิก',
      min: 0,
    }),
    approvalRequired: check.boolean('approvalRequired', input.approvalRequired, {
      label: 'การเปิดระบบอนุมัติ',
    }),
    allowAdminBackdate: check.boolean('allowAdminBackdate', input.allowAdminBackdate, {
      label: 'สิทธิ์จองย้อนหลังของผู้ดูแล',
    }),
    maxActiveBookingsPerUser: check.integer(
      'maxActiveBookingsPerUser',
      input.maxActiveBookingsPerUser,
      { label: 'จำนวนการจองค้างสูงสุดต่อคน', min: 1 },
    ),
    reminderLeadMinutes: check.integer('reminderLeadMinutes', input.reminderLeadMinutes, {
      label: 'เวลาแจ้งเตือนก่อนประชุม',
      min: 1,
    }),
  };

  // กฎข้ามฟิลด์ — ตรวจหลังสุดเพราะต้องใช้ค่าที่ผ่านการตรวจเดี่ยวมาแล้ว
  if (TIME_PATTERN.test(businessHoursStart) && TIME_PATTERN.test(businessHoursEnd)) {
    if (businessHoursStart >= businessHoursEnd) {
      check.fail('businessHoursEnd', 'เวลาเปิดทำการต้องมาก่อนเวลาปิดทำการ');
    }
  }
  if (minBookingMinutes > maxBookingMinutes) {
    check.fail('maxBookingMinutes', 'ความยาวการจองขั้นต่ำต้องไม่มากกว่าขั้นสูง');
  }
  if (slotMinutes > 0 && minBookingMinutes % slotMinutes !== 0) {
    check.fail('minBookingMinutes', 'ความยาวการจองขั้นต่ำต้องลงตัวตามความละเอียดของเวลา');
  }

  return check.result(value);
}
