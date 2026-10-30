import { Check, type ValidationResult, asRecord } from '../validate/check';

export const ROOM_EQUIPMENT = [
  'projector',
  'tv',
  'whiteboard',
  'videoConference',
  'speakerPhone',
  'hdmi',
] as const;

export type RoomEquipment = (typeof ROOM_EQUIPMENT)[number];

export const ROOM_EQUIPMENT_LABEL_TH: Record<RoomEquipment, string> = {
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

export interface RoomInput {
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
    equipment: check.manyOf('equipment', input.equipment, ROOM_EQUIPMENT, { label: 'อุปกรณ์' }),
    imageUrl: check.urlOrNull('imageUrl', input.imageUrl, { label: 'ลิงก์รูปภาพ' }),
    status: check.oneOf('status', input.status, ROOM_STATUSES, {
      label: 'สถานะห้อง',
      fallback: 'active',
    }),
  };

  return check.result(value);
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

