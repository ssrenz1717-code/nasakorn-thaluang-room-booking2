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
import { validateBookingRequest, validateAvailabilityInput } from '@shared/schemas/booking';
import { validateBookingRules } from '@shared/domain/booking-rules';
import { findConflicts } from '@shared/domain/overlap';
import { readLocal, writeLocal } from '../storage';
import { busySlotsFor } from '@shared/domain/availability';
import { ApiError, type SessionUser, type Transport, type VersionResult } from './types';
import { activeAnnouncements, validateAnnouncementInput, type Announcement } from '@shared/schemas/announcement';
import { canSeeAllBookings, decideApprovalStep, type ApprovalEntry } from '@shared/domain/approval';
import { COLLEGE_ROOMS, OPEN_LOCATION_ROOM_CODE, isOpenLocationRoom } from '@shared/schemas/room';
import { validateDecideBookingInput } from '@shared/schemas/booking';

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
  customLocation?: string;
  /** ขั้นที่รออนุมัติ 1–3 (0 = ไม่ได้รอ) */
  approvalStep?: number;
  approvalLog?: ApprovalEntry[];
  /** เวลาที่ยื่นคำขอ (ISO) — พิมพ์เป็น "เขียนวันที่" ในแบบฟอร์ม */
  createdAt?: string;
}

interface DemoState {
  settings: SystemSettings;
  users: SessionUser[];
  rooms: DemoRoom[];
  bookings: DemoBooking[];
  announcements: Announcement[];
  dataVersion: number;
}

const DEMO_ADMIN: SessionUser = {
  email: 'admin@example.com',
  displayName: 'ผู้ดูแลระบบ',
  department: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
  role: 'admin',
  status: 'active',
};

const DEMO_STAFF: SessionUser = {
  email: 'staff@example.com',
  displayName: 'เจ้าหน้าที่',
  department: 'แผนกวิชาการบัญชี',
  role: 'staff',
  status: 'active',
};

/** ผู้ลงนามอนุมัติ 3 ขั้นตามแบบคำขอ (ในระบบจริงผู้ดูแลกำหนด role ให้แต่ละบัญชีในชีต Users) */
const DEMO_APPROVERS: SessionUser[] = [
  { email: 'watcharapong@example.com', displayName: 'นายวัชรพงศ์ โสภา', department: '', role: 'inspector', status: 'active' },
  { email: 'ekkarat@example.com', displayName: 'นายเอกราช เขียวทอง', department: '', role: 'endorser', status: 'active' },
  { email: 'chatree@example.com', displayName: 'นายชาตรี เริงชัยภูมิ', department: '', role: 'director', status: 'active' },
];

/** บัญชีที่สลับไปใช้ได้ในโหมดข้อมูลในเบราว์เซอร์ — ไว้ลองขั้นตอนอนุมัติทีละคน */
export const DEMO_ACCOUNTS: readonly SessionUser[] = [DEMO_ADMIN, DEMO_STAFF, ...DEMO_APPROVERS];

function seedRooms(): DemoRoom[] {
  // ห้องจริงของวิทยาลัย (รายชื่อเดียวกับที่ Apps Script ใช้สร้างชีต Rooms)
  return COLLEGE_ROOMS.map((room, index) => ({
    roomId: room.code === OPEN_LOCATION_ROOM_CODE ? 'demo-room-other' : `demo-room-${index + 1}`,
    code: room.code,
    name: room.name,
    description: room.code === OPEN_LOCATION_ROOM_CODE ? 'ใช้เมื่อต้องการสถานที่อื่นนอกเหนือจากรายการ — ระบุสถานที่ในแบบฟอร์ม' : '',
    location: '',
    capacity: room.capacity,
    equipment: [],
    imageUrl: null,
    status: 'active',
  }));
}

function seedAnnouncements(): Announcement[] {
  const now = new Date().toISOString();
  return [
    {
      announcementId: 'demo-an-1', tone: 'notice', expiresOn: '', createdBy: 'admin@example.com', createdAt: now, updatedAt: now, archivedAt: '',
      title: 'ขอความร่วมมือคืนห้องตรงเวลา',
      body: 'ประชุมเสร็จแล้วกรุณาปิดแอร์ ปิดเครื่องฉายภาพ และแจ้งงานศูนย์ดิจิทัลฯ หากอุปกรณ์ชำรุด',
    },
  ];
}

/** ประวัติการลงนามของรายการที่ผ่านครบ 3 ขั้นแล้ว (หรือผ่านถึงขั้นที่กำหนด) */
function signedLog(steps: number, at: string): ApprovalEntry[] {
  return DEMO_APPROVERS.slice(0, steps).map((user, index) => ({
    step: index + 1, decision: 'approve', email: user.email, name: user.displayName, at, reason: '',
  }));
}

function seedBookings(): DemoBooking[] {
  const today = toDateKey(new Date());
  const tomorrow = addDaysToDateKey(today, 1);
  const later = addDaysToDateKey(today, 2);
  const signedAt = new Date().toISOString();
  const common = { equipment: [], note: '', termsAccepted: true, extraFurnitureCount: 0, otherFacility: '', customLocation: '', createdAt: signedAt };

  return [
    {
      ...common, bookingId: 'demo-bk-1', roomId: 'demo-room-1', dateKey: today, startMin: 9 * 60, endMin: 10 * 60 + 30,
      status: 'confirmed', approvalStep: 0, approvalLog: signedLog(3, signedAt),
      title: 'ประชุมครูและบุคลากรประจำเดือน', bookerName: 'อ.สมชาย ใจดี', requesterPosition: 'ครู', requesterPhone: '081-234-5678',
      userEmail: 'admin@example.com', userName: 'ผู้ดูแลระบบ', department: 'แผนกวิชาเทคโนโลยีสารสนเทศ', attendees: 120,
      requestedFacilities: ['projector', 'soundSystem', 'microphone'], note: 'เตรียมสไลด์สรุปผลการดำเนินงาน',
    },
    {
      ...common, bookingId: 'demo-bk-2', roomId: 'demo-room-2', dateKey: today, startMin: 13 * 60, endMin: 14 * 60,
      status: 'confirmed', approvalStep: 0, approvalLog: signedLog(3, signedAt),
      title: 'ประชุมแผนกวิชาการบัญชี', bookerName: 'นางสาวกนกวรรณ ศรีสุข', requesterPosition: 'หัวหน้าแผนกวิชา', requesterPhone: '089-555-1234',
      userEmail: 'staff@example.com', userName: 'เจ้าหน้าที่', department: 'แผนกวิชาการบัญชี', attendees: 12,
      requestedFacilities: ['projector'],
    },
    {
      ...common, bookingId: 'demo-bk-3', roomId: 'demo-room-6', dateKey: today, startMin: 15 * 60, endMin: 17 * 60,
      status: 'confirmed', approvalStep: 0, approvalLog: signedLog(3, signedAt),
      title: 'อบรมการใช้งานระบบสารสนเทศ', bookerName: 'นายประเสริฐ มั่นคง', requesterPosition: 'ครู', requesterPhone: '086-111-2222',
      userEmail: 'staff@example.com', userName: 'เจ้าหน้าที่', department: 'แผนกวิชาช่างไฟฟ้ากำลัง', attendees: 30,
      requestedFacilities: ['internet', 'airConditioning'],
    },
    {
      ...common, bookingId: 'demo-bk-4', roomId: 'demo-room-3', dateKey: tomorrow, startMin: 10 * 60, endMin: 11 * 60,
      status: 'confirmed', approvalStep: 0, approvalLog: signedLog(3, signedAt),
      title: 'ประชุมคณะกรรมการบริหารสถานศึกษา', bookerName: 'อ.วิภาวรรณ แก้วมณี', requesterPosition: 'รองผู้อำนวยการ', requesterPhone: '081-999-0000',
      userEmail: 'admin@example.com', userName: 'ผู้ดูแลระบบ', department: 'แผนกวิชาเทคโนโลยีสารสนเทศ', attendees: 10,
    },
    {
      ...common, bookingId: 'demo-bk-5', roomId: 'demo-room-2', dateKey: tomorrow, startMin: 11 * 60, endMin: 12 * 60,
      status: 'pending', approvalStep: 1, approvalLog: [],
      title: 'ประชุมเตรียมงานวันวิชาการ', bookerName: 'นางสุดารัตน์ บุญมา', requesterPosition: 'ครู', requesterPhone: '082-345-6789',
      userEmail: 'staff@example.com', userName: 'เจ้าหน้าที่', department: 'แผนกวิชาการบัญชี', attendees: 25,
      requestedFacilities: ['projector', 'microphone'], extraFurnitureCount: 10,
    },
    {
      ...common, bookingId: 'demo-bk-6', roomId: 'demo-room-5', dateKey: later, startMin: 9 * 60, endMin: 12 * 60,
      status: 'pending', approvalStep: 2, approvalLog: signedLog(1, signedAt),
      title: 'กิจกรรมปฐมนิเทศนักศึกษาฝึกงาน', bookerName: 'นายธนพล รุ่งเรือง', requesterPosition: 'ครูที่ปรึกษา', requesterPhone: '087-654-3210',
      userEmail: 'staff@example.com', userName: 'เจ้าหน้าที่', department: 'แผนกวิชาช่างไฟฟ้ากำลัง', attendees: 200,
      requestedFacilities: ['soundSystem', 'microphone'],
    },
    {
      ...common, bookingId: 'demo-bk-7', roomId: 'demo-room-1', dateKey: tomorrow, startMin: 14 * 60, endMin: 15 * 60 + 30,
      status: 'cancelled', approvalStep: 0, approvalLog: [],
      title: 'ซ้อมพิธีมอบประกาศนียบัตร', bookerName: 'นายธนพล รุ่งเรือง', requesterPosition: 'ครู', requesterPhone: '087-654-3210',
      userEmail: 'staff@example.com', userName: 'เจ้าหน้าที่', department: 'แผนกวิชาช่างไฟฟ้ากำลัง', attendees: 60,
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
// v2: เปลี่ยนเป็นห้องจริงของวิทยาลัยและเพิ่มการอนุมัติ 3 ขั้น — ข้อมูลชุดเก่าอ้างห้องที่ไม่มีแล้วจึงไม่อ่านต่อ
const LOCAL_STORAGE_KEY = 'mrb.local-bookings.v2';

function loadState(): DemoState {
  const state = createState();
  const saved = readLocal(LOCAL_STORAGE_KEY);
  if (saved === null) return state;
  try {
    const parsed = JSON.parse(saved) as { bookings?: unknown; announcements?: unknown; dataVersion?: unknown };
    if (Array.isArray(parsed.bookings)) state.bookings = parsed.bookings as DemoBooking[];
    if (Array.isArray(parsed.announcements)) state.announcements = parsed.announcements as Announcement[];
    if (typeof parsed.dataVersion === 'number') state.dataVersion = parsed.dataVersion;
  } catch {
    // ข้อมูลที่เก็บไว้เสีย ใช้ข้อมูลตั้งต้นแทน ดีกว่าเปิดเว็บไม่ขึ้น
  }
  return state;
}

function saveState(state: DemoState): void {
  writeLocal(
    LOCAL_STORAGE_KEY,
    JSON.stringify({ bookings: state.bookings, announcements: state.announcements, dataVersion: state.dataVersion }),
  );
}

function createState(): DemoState {
  return {
    settings: { ...DEFAULT_SYSTEM_SETTINGS },
    users: [...DEMO_ACCOUNTS],
    rooms: seedRooms(),
    bookings: seedBookings(),
    announcements: seedAnnouncements(),
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

    login: (payload: { role?: string; email?: string }) => {
      const user = DEMO_ACCOUNTS.find((account) => account.email === payload?.email) ?? (payload?.role === 'staff' ? DEMO_STAFF : DEMO_ADMIN);
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
        (canSeeAllBookings(user.role) || booking.userEmail === user.email) &&
        (!payload.from || booking.dateKey >= payload.from) && (!payload.to || booking.dateKey <= payload.to),
      ) };
    },
    availability: (payload: unknown, token) => {
      userFromToken(token);
      const parsed = validateAvailabilityInput(payload);
      if (!parsed.ok) throw new ApiError('VALIDATION', parsed.issues.map((issue) => issue.message).join(' '), parsed.issues);
      if (isOpenLocationRoom(state.rooms.find((room) => room.roomId === parsed.value.roomId))) return { busy: [] };
      return { busy: busySlotsFor(state.bookings, parsed.value.roomId, parsed.value.dateKey) };
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
      const openLocation = isOpenLocationRoom(room);
      if (openLocation && input.customLocation.trim() === '') throw new ApiError('VALIDATION', 'กรุณาระบุสถานที่ที่ต้องการใช้');
      const conflicts = openLocation ? [] : findConflicts({ startMin: input.startMin, endMin: input.endMin }, state.bookings.filter((item) => item.roomId === room.roomId && item.dateKey === input.dateKey && ['pending','confirmed'].includes(item.status)).map((item) => ({ bookingId: item.bookingId, startMin: item.startMin, endMin: item.endMin })));
      if (conflicts.length) throw new ApiError('CONFLICT', 'ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่');
      const needsApproval = state.settings.approvalRequired;
      const booking: DemoBooking = {
        ...input, customLocation: openLocation ? input.customLocation : '', bookingId: `demo-bk-${Date.now()}`,
        status: needsApproval ? 'pending' : 'confirmed', approvalStep: needsApproval ? 1 : 0, approvalLog: [],
        userEmail: user.email, userName: user.displayName, createdAt: new Date().toISOString(),
      };
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
    decideBooking: (payload: unknown, token) => {
      const user = userFromToken(token);
      const parsed = validateDecideBookingInput(payload);
      if (!parsed.ok) throw new ApiError('VALIDATION', 'ข้อมูลการพิจารณาไม่ถูกต้อง', parsed.issues);
      const booking = state.bookings.find((item) => item.bookingId === parsed.value.bookingId);
      if (!booking) throw new ApiError('NOT_FOUND', 'ไม่พบรายการจอง');
      const result = decideApprovalStep(
        { status: booking.status, approvalStep: booking.approvalStep ?? (booking.status === 'pending' ? 1 : 0), approvalLog: booking.approvalLog ?? [] },
        user, parsed.value.decision, parsed.value.reason, new Date().toISOString(),
      );
      if (!result.ok) throw new ApiError(result.code, result.message);
      booking.status = result.next.status as BookingStatus;
      booking.approvalStep = result.next.approvalStep;
      booking.approvalLog = result.next.approvalLog;
      if (parsed.value.decision === 'reject') booking.note = `${booking.note}${booking.note ? '\n' : ''}ผลพิจารณา: ${parsed.value.reason.trim()}`;
      state.dataVersion += 1; saveState(state);
      return { booking, nextStep: result.nextStep };
    },
    announcements: (_payload, token) => {
      userFromToken(token);
      return { announcements: activeAnnouncements(state.announcements, toDateKey(new Date())) };
    },
    saveAnnouncement: (payload: unknown, token) => {
      const user = userFromToken(token);
      if (user.role !== 'admin') throw new ApiError('FORBIDDEN', 'เฉพาะผู้ดูแลระบบจึงจะจัดการประกาศได้');
      const parsed = validateAnnouncementInput(payload);
      if (!parsed.ok) throw new ApiError('VALIDATION', parsed.issues.map((issue) => issue.message).join(' · '), parsed.issues);
      const input = parsed.value;
      const now = new Date().toISOString();
      let announcement: Announcement;
      if (input.announcementId === '') {
        announcement = { ...input, announcementId: `demo-an-${Date.now()}`, createdBy: user.email, createdAt: now, updatedAt: now, archivedAt: '' };
        state.announcements.push(announcement);
      } else {
        const found = state.announcements.find((item) => item.announcementId === input.announcementId && item.archivedAt === '');
        if (!found) throw new ApiError('NOT_FOUND', 'ไม่พบประกาศ');
        Object.assign(found, { title: input.title, body: input.body, tone: input.tone, expiresOn: input.expiresOn, updatedAt: now });
        announcement = found;
      }
      state.dataVersion += 1; saveState(state);
      return { announcement };
    },
    archiveAnnouncement: (payload: { announcementId?: string }, token) => {
      const user = userFromToken(token);
      if (user.role !== 'admin') throw new ApiError('FORBIDDEN', 'เฉพาะผู้ดูแลระบบจึงจะจัดการประกาศได้');
      const found = state.announcements.find((item) => item.announcementId === payload.announcementId && item.archivedAt === '');
      if (!found) throw new ApiError('NOT_FOUND', 'ไม่พบประกาศ');
      found.archivedAt = new Date().toISOString();
      state.dataVersion += 1; saveState(state);
      return { ok: true };
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
