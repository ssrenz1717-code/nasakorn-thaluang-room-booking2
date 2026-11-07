import { Check, type ValidationResult, asRecord } from '../validate/check';

export const ROOM_EQUIPMENT = [
  'projector',
  'tv',
  'whiteboard',
  'videoConference',
  'speakerPhone',
  'hdmi',
] as const;

/** รหัสอุปกรณ์ประจำห้อง — ผู้ดูแลเพิ่มรายการเองได้ (ชีต Lookups ชนิด roomEquipment) ค่าข้างบนคือชุดเริ่มต้น */
export type RoomEquipment = string;

export const ROOM_EQUIPMENT_LABEL_TH: Record<(typeof ROOM_EQUIPMENT)[number], string> = {
  projector: 'โปรเจกเตอร์',
  tv: 'ทีวี',
  whiteboard: 'ไวท์บอร์ด',
  videoConference: 'ระบบประชุมทางไกล',
  speakerPhone: 'ลำโพงประชุม',
  hdmi: 'สาย HDMI',
};

export const ROOM_STATUSES = ['active', 'maintenance', 'disabled'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROOM_STATUS_LABEL_TH: Record<RoomStatus, string> = {
  active: 'เปิดใช้งาน',
  maintenance: 'ปิดปรับปรุง',
  disabled: 'ไม่เปิดให้จอง',
};

/** ห้องที่จองได้ต้องเป็น active เท่านั้น — อีกสองสถานะยังเก็บประวัติไว้ครบ */
export function isBookableRoomStatus(status: RoomStatus): boolean {
  return status === 'active';
}

/** รูปห้องที่ย่อแล้วเก็บในเซลล์เดียว (เซลล์ Google Sheets รับได้ 50,000 ตัวอักษร) */
export const ROOM_IMAGE_MAX_CHARS = 48_000;
const IMAGE_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export interface RoomInput {
  /** ว่าง = เพิ่มห้องใหม่ */
  roomId: string;
  code: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  equipment: RoomEquipment[];
  imageUrl: string | null;
  status: RoomStatus;
}

export function validateRoomInput(raw: unknown): ValidationResult<RoomInput> {
  const input = asRecord(raw);
  const check = new Check();

  const value: RoomInput = {
    roomId: check.string('roomId', input.roomId, { label: 'รหัสอ้างอิงห้อง', max: 60, fallback: '' }),
    code: check.string('code', input.code, {
      label: 'รหัสห้อง',
      max: 20,
      pattern: /^[A-Za-z0-9-]+$/,
      patternMessage: 'รหัสห้องใช้ได้เฉพาะ A-Z 0-9 และขีดกลาง',
    }),
    name: check.string('name', input.name, { label: 'ชื่อห้อง', max: 100 }),
    description: check.string('description', input.description, {
      label: 'รายละเอียด',
      max: 500,
      fallback: '',
    }),
    location: check.string('location', input.location, {
      label: 'ตำแหน่งที่ตั้ง',
      max: 200,
      fallback: '',
    }),
    capacity: check.integer('capacity', input.capacity, {
      label: 'จำนวนผู้เข้าร่วมสูงสุด',
      min: 1,
      max: 1000,
    }),
    equipment: check.keys('equipment', input.equipment, { label: 'อุปกรณ์' }),
    imageUrl: roomImage(check, input.imageUrl),
    status: check.oneOf('status', input.status, ROOM_STATUSES, {
      label: 'สถานะห้อง',
      fallback: 'active',
    }),
  };

  return check.result(value);
}

/** รูปห้อง: ลิงก์ https หรือรูปที่ย่อแล้ว (data URL) — ไม่บังคับ */
function roomImage(check: Check, raw: unknown): string | null {
  if (typeof raw === 'string' && raw.startsWith('data:')) {
    if (!IMAGE_DATA_URL.test(raw)) {
      check.fail('imageUrl', 'ไฟล์รูปต้องเป็น JPG, PNG หรือ WebP');
      return null;
    }
    if (raw.length > ROOM_IMAGE_MAX_CHARS) {
      check.fail('imageUrl', 'รูปใหญ่เกินไป ลองเลือกรูปอื่นหรือใช้ลิงก์รูปแทน');
      return null;
    }
    return raw;
  }
  return check.urlOrNull('imageUrl', raw, { label: 'ลิงก์รูปภาพ' });
}

/**
 * ห้อง "อื่น ๆ (ระบุสถานที่)" — ผู้ขอพิมพ์สถานที่เอง แต่ละรายการอาจเป็นคนละที่
 * จึงไม่ตรวจเวลาชนกัน และต้องกรอก customLocation ทุกครั้ง
 */
export const OPEN_LOCATION_ROOM_CODE = 'OTHER';

export function isOpenLocationRoom(room: { code?: unknown } | null | undefined): boolean {
  return String(room?.code ?? '').trim().toUpperCase() === OPEN_LOCATION_ROOM_CODE;
}

/**
 * ห้องประชุมของวิทยาลัยตามแบบคำขอ ใช้สร้างชีต Rooms ครั้งแรก (seedRooms) และข้อมูลตัวอย่าง
 * ความจุเป็นค่าประมาณเริ่มต้น — ผู้ดูแลแก้ตัวเลขจริงในชีต Rooms ได้ภายหลัง
 */
export const COLLEGE_ROOMS: readonly { code: string; name: string; capacity: number }[] = [
  { code: 'R01', name: 'หอประชุมอดิเรกสาร', capacity: 300 },
  { code: 'R02', name: 'ห้องประชุมสักทอง', capacity: 40 },
  { code: 'R03', name: 'ห้องประชุมหน้าห้องผู้อำนวยการ', capacity: 20 },
  { code: 'R04', name: 'ห้องประชุม (กาแฟ)', capacity: 15 },
  { code: 'R05', name: 'อาคารโดมเอนกประสงค์', capacity: 500 },
  { code: 'R06', name: 'ห้องคอมพิวเตอร์กลาง (ห้องโสต)', capacity: 40 },
  { code: OPEN_LOCATION_ROOM_CODE, name: 'อื่น ๆ (ระบุสถานที่)', capacity: 1000 },
];

