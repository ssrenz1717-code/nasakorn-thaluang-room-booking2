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
