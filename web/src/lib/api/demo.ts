/**
 * โหมดสาธิต — ใช้ดูหน้าตาและลองกดเล่นก่อนตั้งค่า Apps Script เสร็จ
 *
 * สำคัญ: โหมดนี้ไม่ได้ "ปลอมผลลัพธ์" ขึ้นมา มันเรียก domain logic ตัวจริงจาก shared/
 * (กฎการจอง การตรวจเวลาทับซ้อน สถานะ) เหมือนที่ server ใช้ ต่างกันแค่เก็บข้อมูล
 * ไว้ในหน่วยความจำของเบราว์เซอร์ ปิดแท็บแล้วหาย
 *
 * ทุกหน้าจอที่ใช้โหมดนี้ต้องมีแถบเตือนค้างอยู่ตลอดว่าเป็นข้อมูลตัวอย่าง
 */

import { DEFAULT_SYSTEM_SETTINGS, type SystemSettings } from '@shared/schemas/settings';
import type { RoomEquipment, RoomStatus } from '@shared/schemas/room';
import type { BookingStatus } from '@shared/domain/status';
import { addDaysToDateKey, toDateKey } from '@shared/time/bangkok';
import { validateBookingRequest } from '@shared/schemas/booking';
import { validateBookingRules } from '@shared/domain/booking-rules';
import { findConflicts } from '@shared/domain/overlap';
import { readLocal, writeLocal } from '../storage';
import { ApiError, type SessionUser, type Transport, type VersionResult } from './types';

export interface DemoRoom {
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

export interface DemoBooking {
  bookingId: string;
  roomId: string;
  dateKey: string;
  startMin: number;
  endMin: number;
  status: BookingStatus;
  title: string;
  /** ชื่อผู้จองที่กรอกในฟอร์ม — ข้อมูลเก่าที่ไม่มีให้ใช้ userName แทน */
  bookerName?: string;
  userEmail: string;
  userName: string;
  department: string;
  attendees: number;
  equipment: RoomEquipment[];
  note: string;
  requesterPosition?: string;
  requesterPhone?: string;
  requestedFacilities?: string[];
  extraFurnitureCount?: number;
  otherFacility?: string;
  termsAccepted?: boolean;
}

interface DemoState {
  settings: SystemSettings;
  users: SessionUser[];
  rooms: DemoRoom[];
  bookings: DemoBooking[];
  dataVersion: number;
}

const DEMO_ADMIN: SessionUser = {
  email: 'admin@example.com',
  displayName: 'ผู้ดูแลระบบ',
  department: 'ฝ่ายไอที',
  role: 'admin',
  status: 'active',
};

const DEMO_STAFF: SessionUser = {
  email: 'staff@example.com',
  displayName: 'เจ้าหน้าที่',
  department: 'ฝ่ายขาย',
  role: 'staff',
  status: 'active',
};

function seedRooms(): DemoRoom[] {
  return [
    {
      roomId: 'demo-room-1',
      code: 'MR-01',
      name: 'ห้องประชุมใหญ่ ชั้น 3',
      description: 'ห้องประชุมหลัก เหมาะกับการประชุมผู้บริหารและนำเสนอลูกค้า',
      location: 'อาคาร A ชั้น 3',
      capacity: 20,
      equipment: ['projector', 'whiteboard', 'videoConference', 'speakerPhone'],
      imageUrl: null,
      status: 'active',
    },
    {
      roomId: 'demo-room-2',
      code: 'MR-02',
      name: 'ห้องประชุมย่อย 1',
      description: 'ห้องเล็กสำหรับคุยงานเป็นทีม',
      location: 'อาคาร A ชั้น 2',
      capacity: 8,
      equipment: ['tv', 'whiteboard', 'hdmi'],
      imageUrl: null,
      status: 'active',
    },
    {
      roomId: 'demo-room-3',
      code: 'MR-03',
      name: 'ห้องประชุมย่อย 2',
      description: 'ห้องเล็ก มีจอทีวีสำหรับแชร์หน้าจอ',
      location: 'อาคาร A ชั้น 2',
      capacity: 6,
      equipment: ['tv', 'hdmi'],
      imageUrl: null,
      status: 'active',
    },
    {
      roomId: 'demo-room-4',
      code: 'MR-04',
      name: 'ห้องอบรม',
      description: 'จัดโต๊ะแบบห้องเรียน ใช้อบรมพนักงานใหม่',
      location: 'อาคาร B ชั้น 1',
      capacity: 40,
      equipment: ['projector', 'whiteboard', 'speakerPhone'],
      imageUrl: null,
      status: 'active',
    },
    {
      roomId: 'demo-room-5',
      code: 'MR-05',
      name: 'ห้องประชุมเล็ก ชั้น 4',
      description: 'ปิดปรับปรุงระบบปรับอากาศ',
      location: 'อาคาร A ชั้น 4',
      capacity: 4,
      equipment: ['tv'],
      imageUrl: null,
      status: 'maintenance',
    },
  ];
}

function seedBookings(): DemoBooking[] {
  const today = toDateKey(new Date());
  const tomorrow = addDaysToDateKey(today, 1);

  return [
    {
      bookingId: 'demo-bk-1',
      roomId: 'demo-room-1',
      dateKey: today,
      startMin: 9 * 60,
      endMin: 10 * 60 + 30,
      status: 'confirmed',
      title: 'ประชุมผู้บริหารประจำสัปดาห์',
      userEmail: 'admin@example.com',
      userName: 'ผู้ดูแลระบบ',
      bookerName: 'อ.สมชาย ใจดี',
      department: 'ฝ่ายไอที',
      attendees: 12,
      equipment: ['projector', 'videoConference'],
      note: 'เตรียมสไลด์สรุปยอดเดือนที่ผ่านมา',
    },
    {
      bookingId: 'demo-bk-2',
      roomId: 'demo-room-2',
      dateKey: today,
      startMin: 13 * 60,
      endMin: 14 * 60,
      status: 'confirmed',
      title: 'คุยแผนการตลาด Q4',
      userEmail: 'staff@example.com',
      userName: 'เจ้าหน้าที่',
      bookerName: 'นางสาวกนกวรรณ ศรีสุข',
      department: 'ฝ่ายขาย',
      attendees: 5,
      equipment: ['tv'],
      note: '',
    },
    {
      bookingId: 'demo-bk-3',
      roomId: 'demo-room-4',
      dateKey: today,
      startMin: 15 * 60,
      endMin: 17 * 60,
      status: 'confirmed',
      title: 'อบรมพนักงานใหม่ รุ่น 12',
      userEmail: 'hr@example.com',
      userName: 'งานบุคลากร',
      bookerName: 'นายประเสริฐ มั่นคง',
      department: 'ฝ่ายบุคคล',
      attendees: 28,
      equipment: ['projector', 'speakerPhone'],
      note: '',
    },
    {
      bookingId: 'demo-bk-4',
      roomId: 'demo-room-3',
      dateKey: tomorrow,
      startMin: 10 * 60,
      endMin: 11 * 60,
      status: 'confirmed',
      title: 'สัมภาษณ์ผู้สมัครตำแหน่งนักบัญชี',
      userEmail: 'hr@example.com',
      userName: 'งานบุคลากร',
      bookerName: 'อ.วิภาวรรณ แก้วมณี',
      department: 'ฝ่ายบุคคล',
      attendees: 3,
      equipment: [],
      note: '',
    },
    {
      bookingId: 'demo-bk-5',
      roomId: 'demo-room-1',
      dateKey: tomorrow,
      startMin: 14 * 60,
      endMin: 15 * 60 + 30,
      status: 'cancelled',
      title: 'นำเสนองานลูกค้า (เลื่อนออกไป)',
      userEmail: 'staff@example.com',
      userName: 'เจ้าหน้าที่',
      bookerName: 'นายธนพล รุ่งเรือง',
      department: 'ฝ่ายขาย',
      attendees: 8,
      equipment: ['projector'],
      note: 'ลูกค้าขอเลื่อน',
    },
    {
      bookingId: 'demo-bk-6',
      roomId: 'demo-room-2',
      dateKey: tomorrow,
      startMin: 11 * 60,
      endMin: 12 * 60,
      status: 'pending',
      title: 'ประชุมวางแผนกิจกรรมวิทยาลัย',
      userEmail: 'staff@example.com',
      userName: 'เจ้าหน้าที่',
      bookerName: 'นางสุดารัตน์ บุญมา',
      department: 'ฝ่ายขาย',
      attendees: 6,
      equipment: ['tv'],
      note: 'ขออนุมัติการใช้ห้องประชุม',
      requesterPosition: 'เจ้าหน้าที่',
      requesterPhone: '02-000-0000',
      requestedFacilities: ['projector', 'microphone'],
      extraFurnitureCount: 0,
      otherFacility: '',
      termsAccepted: true,
    },
  ];
}

/**
 * เก็บการจองไว้ใน localStorage ของเบราว์เซอร์
 *
 * ยังไม่มีเซิร์ฟเวอร์ ข้อมูลจึงอยู่ในเครื่องของคนที่เปิดเว็บเท่านั้น
 * (แต่ละคนเห็นข้อมูลของตัวเอง) แต่อย่างน้อยรีเฟรชหน้าแล้วการจองไม่หาย
 * เก็บเฉพาะการจอง ไม่เก็บค่าตั้งค่า เพื่อให้แก้ค่าเริ่มต้นในโค้ดแล้วมีผลทันที
 */
const LOCAL_STORAGE_KEY = 'mrb.local-bookings.v1';

function loadState(): DemoState {
  const state = createState();
  const saved = readLocal(LOCAL_STORAGE_KEY);
  if (saved === null) return state;
  try {
    const parsed = JSON.parse(saved) as { bookings?: unknown; dataVersion?: unknown };
    if (Array.isArray(parsed.bookings)) state.bookings = parsed.bookings as DemoBooking[];
    if (typeof parsed.dataVersion === 'number') state.dataVersion = parsed.dataVersion;
  } catch {
    // ข้อมูลที่เก็บไว้เสีย ใช้ข้อมูลตั้งต้นแทน ดีกว่าเปิดเว็บไม่ขึ้น
  }
  return state;
}

function saveState(state: DemoState): void {
  writeLocal(
    LOCAL_STORAGE_KEY,
    JSON.stringify({ bookings: state.bookings, dataVersion: state.dataVersion }),
  );
}

function createState(): DemoState {
  return {
    settings: { ...DEFAULT_SYSTEM_SETTINGS },
    users: [DEMO_ADMIN, DEMO_STAFF],
    rooms: seedRooms(),
    bookings: seedBookings(),
    dataVersion: 1,
  };
}

const DEMO_TOKEN_PREFIX = 'demo-token:';

export function createDemoTransport(): Transport {
  const state = loadState();

  function userFromToken(token: string): SessionUser {
    if (!token.startsWith(DEMO_TOKEN_PREFIX)) {
      throw new ApiError('UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
    }
    const email = token.slice(DEMO_TOKEN_PREFIX.length);
    const user = state.users.find((candidate) => candidate.email === email);
    if (user === undefined) throw new ApiError('UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
    return user;
  }

  const handlers: Record<string, (payload: never, token: string) => unknown> = {
    ping: () => ({ pong: true, serverTime: new Date().toISOString() }),

    login: (payload: { role?: string }) => {
      const user = payload?.role === 'staff' ? DEMO_STAFF : DEMO_ADMIN;
      return { token: `${DEMO_TOKEN_PREFIX}${user.email}`, user };
    },

    me: (_payload, token) => ({ user: userFromToken(token) }),

    bootstrap: (_payload, token) => ({
      user: userFromToken(token),
      settings: state.settings,
      dataVersion: state.dataVersion,
      serverTime: new Date().toISOString(),
    }),
    rooms: (_payload, token) => { userFromToken(token); return { rooms: state.rooms }; },
    bookings: (payload: { from?: string; to?: string }, token) => {
      const user = userFromToken(token);
      return { bookings: state.bookings.filter((booking) =>
        (user.role === 'admin' || booking.userEmail === user.email) &&
        (!payload.from || booking.dateKey >= payload.from) && (!payload.to || booking.dateKey <= payload.to),
      ) };
    },
    createBooking: (payload: unknown, token) => {
      const user = userFromToken(token);
      const parsed = validateBookingRequest(payload);
      if (!parsed.ok) throw new ApiError('VALIDATION', parsed.issues.map((issue) => issue.message).join(' · '), parsed.issues);
      const input = parsed.value;
      if (!input.termsAccepted) throw new ApiError('VALIDATION', 'กรุณายอมรับเงื่อนไขการใช้ห้องประชุม');
      const room = state.rooms.find((item) => item.roomId === input.roomId);
      if (!room) throw new ApiError('NOT_FOUND', 'ไม่พบห้องประชุม');
      const activeCount = state.bookings.filter((item) => item.userEmail === user.email && ['pending','confirmed'].includes(item.status)).length;
      const rules = validateBookingRules(input, { settings: state.settings, room, now: new Date(), isAdmin: user.role === 'admin', activeBookingCount: activeCount });
      if (!rules.ok) throw new ApiError('VALIDATION', rules.issues.map((issue) => issue.message).join(' · '));
      const conflicts = findConflicts({ startMin: input.startMin, endMin: input.endMin }, state.bookings.filter((item) => item.roomId === room.roomId && item.dateKey === input.dateKey && ['pending','confirmed'].includes(item.status)).map((item) => ({ bookingId: item.bookingId, startMin: item.startMin, endMin: item.endMin })));
      if (conflicts.length) throw new ApiError('CONFLICT', 'ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่');
      const booking: DemoBooking = { ...input, bookingId: `demo-bk-${Date.now()}`, status: state.settings.approvalRequired ? 'pending' : 'confirmed', userEmail: user.email, userName: user.displayName };
      state.bookings.push(booking); state.dataVersion += 1; saveState(state);
      return { booking };
    },
    cancelBooking: (payload: { bookingId: string; reason?: string }, token) => {
      const user = userFromToken(token);
      const booking = state.bookings.find((item) => item.bookingId === payload.bookingId);
      if (!booking) throw new ApiError('NOT_FOUND', 'ไม่พบรายการจอง');
      if (booking.userEmail !== user.email && user.role !== 'admin') throw new ApiError('FORBIDDEN', 'ไม่มีสิทธิ์ยกเลิกรายการนี้');
      if (!['pending','confirmed'].includes(booking.status)) throw new ApiError('CONFLICT', 'รายการนี้ยกเลิกไม่ได้');
      booking.status = 'cancelled'; booking.note = payload.reason || booking.note; state.dataVersion += 1; saveState(state);
      return { booking };
    },
    decideBooking: (payload: { bookingId: string; decision: 'approve'|'reject'; reason?: string }, token) => {
      const user = userFromToken(token);
      if (user.role !== 'admin') throw new ApiError('FORBIDDEN', 'ต้องเป็นผู้ดูแลระบบจึงจะอนุมัติรายการได้');
      const booking = state.bookings.find((item) => item.bookingId === payload.bookingId);
      if (!booking) throw new ApiError('NOT_FOUND', 'ไม่พบรายการจอง');
      if (booking.status !== 'pending') throw new ApiError('CONFLICT', 'รายการนี้ไม่ได้อยู่ระหว่างรออนุมัติ');
      if (payload.decision === 'reject' && !payload.reason?.trim()) throw new ApiError('VALIDATION', 'กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      booking.status = payload.decision === 'approve' ? 'confirmed' : 'rejected';
      if (payload.reason?.trim()) booking.note = `${booking.note}${booking.note ? '\n' : ''}ผลพิจารณา: ${payload.reason.trim()}`;
      state.dataVersion += 1; saveState(state);
      return { booking };
    },
  };

  return {
    kind: 'demo',

    async call<T>(action: string, payload: unknown = {}, token = ''): Promise<T> {
      // หน่วงเล็กน้อยให้เห็นสถานะกำลังโหลดเหมือนของจริง (Apps Script ตอบ ~0.5-2 วินาที)
      await new Promise((resolve) => window.setTimeout(resolve, 220));

      const handler = handlers[action];
      if (handler === undefined) {
        throw new ApiError('BAD_REQUEST', `ระบบยังไม่รองรับคำสั่ง "${action}"`);
      }
      return handler(payload as never, token) as T;
    },

    async version(): Promise<VersionResult> {
      return { dataVersion: state.dataVersion, serverTime: new Date().toISOString() };
    },
  };
}
