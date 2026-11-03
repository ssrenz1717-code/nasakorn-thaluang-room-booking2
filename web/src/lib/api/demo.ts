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
import { ApiError, type AdminUser, type SessionUser, type Transport, type VersionResult } from './types';
import { activeAnnouncements, validateAnnouncementInput, type Announcement } from '@shared/schemas/announcement';
import { canSeeAllBookings, decideApprovalStep, type ApprovalEntry } from '@shared/domain/approval';
import { COLLEGE_ROOMS, OPEN_LOCATION_ROOM_CODE, isOpenLocationRoom } from '@shared/schemas/room';
import { validateDecideBookingInput } from '@shared/schemas/booking';
import {
  COLLEGE_ACCOUNTS, PIN_LOCK_MINUTES, PIN_MAX_FAILURES, canUseRoom, constantTimeEqual, lastAdminProblem,
  normalizeUsername, passwordDigestMessage, pinDigestMessage, validateLoginInput, validatePinStepInput,
  validateResetPasswordInput, validateResetPinInput, validateUserAccountInput,
} from '@shared/schemas/user';
import { PIN_CHALLENGE_TTL_MS } from '@shared/auth/session';

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

interface DemoUser extends SessionUser {
  pinHash: string;
  pinSalt: string;
  passwordHash: string;
  passwordSalt: string;
  tokenVersion: number;
  lastLoginAt: string;
  createdAt: string;
}

interface DemoState {
  settings: SystemSettings;
  users: DemoUser[];
  rooms: DemoRoom[];
  bookings: DemoBooking[];
  announcements: Announcement[];
  dataVersion: number;
}

/**
 * บัญชีทดลอง + รหัสผ่าน + PIN — ใช้เฉพาะโหมดข้อมูลในเบราว์เซอร์ (ข้อมูลอยู่ในเครื่องผู้เปิดเว็บเท่านั้น)
 * ระบบจริงบน Apps Script สุ่มรหัสผ่านและ PIN ให้ตอนติดตั้ง ไม่มีชุดนี้
 */
const DEMO_SECRETS: Record<string, { password: string; pin: string }> = {
  shoyu: { password: 'Shoyu2026', pin: '135790' },
  watcharapong: { password: 'Inspect2026', pin: '246801' },
  ekkarat: { password: 'Endorse2026', pin: '246802' },
  chatree: { password: 'Approve2026', pin: '246803' },
  teacher: { password: 'Teacher2026', pin: '246804' },
};

export const DEMO_LOGINS: readonly { username: string; password: string; pin: string; displayName: string; role: SessionUser['role'] }[] = [
  ...COLLEGE_ACCOUNTS.map((account) => ({ ...account, ...DEMO_SECRETS[account.username]! })),
  { username: 'teacher', displayName: 'ครูทดลอง ใจดี', role: 'staff', ...DEMO_SECRETS.teacher! },
];

const DEMO_PEPPER = 'demo-local-pepper';

async function demoHmac(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(DEMO_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

const demoPinHash = (username: string, salt: string, pin: string) => demoHmac(pinDigestMessage(username, salt, pin));
const demoPasswordHash = (username: string, salt: string, password: string) => demoHmac(passwordDigestMessage(username, salt, password));
const newSalt = () => crypto.randomUUID().replaceAll('-', '');

async function demoCredential(username: string, pin: string): Promise<{ pinHash: string; pinSalt: string }> {
  const pinSalt = newSalt();
  return { pinSalt, pinHash: await demoPinHash(username, pinSalt, pin) };
}

async function demoPasswordCredential(username: string, password: string): Promise<{ passwordHash: string; passwordSalt: string }> {
  const passwordSalt = newSalt();
  return { passwordSalt, passwordHash: await demoPasswordHash(username, passwordSalt, password) };
}

async function seedUsers(): Promise<DemoUser[]> {
  const now = new Date().toISOString();
  return Promise.all(DEMO_LOGINS.map(async (login) => {
    const account = COLLEGE_ACCOUNTS.find((item) => item.username === login.username);
    return {
      email: login.username, displayName: login.displayName, department: account?.department ?? 'แผนกวิชาการบัญชี',
      role: login.role, status: 'active' as const, allowedRoomIds: [],
      tokenVersion: 1, lastLoginAt: '', createdAt: now, ...(await demoCredential(login.username, login.pin)),
      ...(await demoPasswordCredential(login.username, login.password)),
    };
  }));
}

function sessionView(user: DemoUser): SessionUser {
  const { email, displayName, department, role, status, allowedRoomIds } = user;
  return { email, displayName, department, role, status, allowedRoomIds: [...allowedRoomIds] };
}

function adminView(user: DemoUser): AdminUser {
  return { ...sessionView(user), hasPin: user.pinHash !== '', hasPassword: user.passwordHash !== '', lastLoginAt: user.lastLoginAt, createdAt: user.createdAt };
}

const DEMO_APPROVERS = COLLEGE_ACCOUNTS.filter((account) => account.role !== 'admin');

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
      announcementId: 'demo-an-1', tone: 'notice', expiresOn: '', createdBy: 'shoyu', createdAt: now, updatedAt: now, archivedAt: '',
      title: 'ขอความร่วมมือคืนห้องตรงเวลา',
      body: 'ประชุมเสร็จแล้วกรุณาปิดแอร์ ปิดเครื่องฉายภาพ และแจ้งงานศูนย์ดิจิทัลฯ หากอุปกรณ์ชำรุด',
    },
  ];
}

/** ประวัติการลงนามของรายการที่ผ่านครบ 3 ขั้นแล้ว (หรือผ่านถึงขั้นที่กำหนด) */
function signedLog(steps: number, at: string): ApprovalEntry[] {
  return DEMO_APPROVERS.slice(0, steps).map((user, index) => ({
    step: index + 1, decision: 'approve', email: user.username, name: user.displayName, at, reason: '',
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
      userEmail: 'shoyu', userName: 'shoyu', department: 'แผนกวิชาเทคโนโลยีสารสนเทศ', attendees: 120,
      requestedFacilities: ['projector', 'soundSystem', 'microphone'], note: 'เตรียมสไลด์สรุปผลการดำเนินงาน',
    },
    {
      ...common, bookingId: 'demo-bk-2', roomId: 'demo-room-2', dateKey: today, startMin: 13 * 60, endMin: 14 * 60,
      status: 'confirmed', approvalStep: 0, approvalLog: signedLog(3, signedAt),
      title: 'ประชุมแผนกวิชาการบัญชี', bookerName: 'นางสาวกนกวรรณ ศรีสุข', requesterPosition: 'หัวหน้าแผนกวิชา', requesterPhone: '089-555-1234',
      userEmail: 'teacher', userName: 'ครูทดลอง ใจดี', department: 'แผนกวิชาการบัญชี', attendees: 12,
      requestedFacilities: ['projector'],
    },
    {
      ...common, bookingId: 'demo-bk-3', roomId: 'demo-room-6', dateKey: today, startMin: 15 * 60, endMin: 17 * 60,
      status: 'confirmed', approvalStep: 0, approvalLog: signedLog(3, signedAt),
      title: 'อบรมการใช้งานระบบสารสนเทศ', bookerName: 'นายประเสริฐ มั่นคง', requesterPosition: 'ครู', requesterPhone: '086-111-2222',
      userEmail: 'teacher', userName: 'ครูทดลอง ใจดี', department: 'แผนกวิชาช่างไฟฟ้ากำลัง', attendees: 30,
      requestedFacilities: ['internet', 'airConditioning'],
    },
    {
      ...common, bookingId: 'demo-bk-4', roomId: 'demo-room-3', dateKey: tomorrow, startMin: 10 * 60, endMin: 11 * 60,
      status: 'confirmed', approvalStep: 0, approvalLog: signedLog(3, signedAt),
      title: 'ประชุมคณะกรรมการบริหารสถานศึกษา', bookerName: 'อ.วิภาวรรณ แก้วมณี', requesterPosition: 'รองผู้อำนวยการ', requesterPhone: '081-999-0000',
      userEmail: 'shoyu', userName: 'shoyu', department: 'แผนกวิชาเทคโนโลยีสารสนเทศ', attendees: 10,
    },
    {
      ...common, bookingId: 'demo-bk-5', roomId: 'demo-room-2', dateKey: tomorrow, startMin: 11 * 60, endMin: 12 * 60,
      status: 'pending', approvalStep: 1, approvalLog: [],
      title: 'ประชุมเตรียมงานวันวิชาการ', bookerName: 'นางสุดารัตน์ บุญมา', requesterPosition: 'ครู', requesterPhone: '082-345-6789',
      userEmail: 'teacher', userName: 'ครูทดลอง ใจดี', department: 'แผนกวิชาการบัญชี', attendees: 25,
      requestedFacilities: ['projector', 'microphone'], extraFurnitureCount: 10,
    },
    {
      ...common, bookingId: 'demo-bk-6', roomId: 'demo-room-5', dateKey: later, startMin: 9 * 60, endMin: 12 * 60,
      status: 'pending', approvalStep: 2, approvalLog: signedLog(1, signedAt),
      title: 'กิจกรรมปฐมนิเทศนักศึกษาฝึกงาน', bookerName: 'นายธนพล รุ่งเรือง', requesterPosition: 'ครูที่ปรึกษา', requesterPhone: '087-654-3210',
      userEmail: 'teacher', userName: 'ครูทดลอง ใจดี', department: 'แผนกวิชาช่างไฟฟ้ากำลัง', attendees: 200,
      requestedFacilities: ['soundSystem', 'microphone'],
    },
    {
      ...common, bookingId: 'demo-bk-7', roomId: 'demo-room-1', dateKey: tomorrow, startMin: 14 * 60, endMin: 15 * 60 + 30,
      status: 'cancelled', approvalStep: 0, approvalLog: [],
      title: 'ซ้อมพิธีมอบประกาศนียบัตร', bookerName: 'นายธนพล รุ่งเรือง', requesterPosition: 'ครู', requesterPhone: '087-654-3210',
      userEmail: 'teacher', userName: 'ครูทดลอง ใจดี', department: 'แผนกวิชาช่างไฟฟ้ากำลัง', attendees: 60,
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
// v4: บัญชีมีรหัสผ่าน + PIN — บัญชีชุด v3 ไม่มีรหัสผ่านจึงไม่อ่านต่อ
const LOCAL_STORAGE_KEY = 'mrb.local-bookings.v4';

async function loadState(): Promise<DemoState> {
  const state = createState(await seedUsers());
  const saved = readLocal(LOCAL_STORAGE_KEY);
  if (saved === null) return state;
  try {
    const parsed = JSON.parse(saved) as { users?: unknown; bookings?: unknown; announcements?: unknown; dataVersion?: unknown };
    if (Array.isArray(parsed.users) && parsed.users.length > 0) state.users = parsed.users as DemoUser[];
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
    JSON.stringify({ users: state.users, bookings: state.bookings, announcements: state.announcements, dataVersion: state.dataVersion }),
  );
}

function createState(users: DemoUser[]): DemoState {
  return {
    settings: { ...DEFAULT_SYSTEM_SETTINGS },
    users,
    rooms: seedRooms(),
    bookings: seedBookings(),
    announcements: seedAnnouncements(),
    dataVersion: 1,
  };
}

const DEMO_TOKEN_PREFIX = 'demo-token:';

export function createDemoTransport(): Transport {
  const ready = loadState();
  let state!: DemoState;
  /** รหัสผ่าน/PIN ผิดติดกันรายบัญชี — เหมือนตัวนับใน CacheService ของ Apps Script */
  const failures = new Map<string, { count: number; until: number }>();
  /** ตั๋วรอ PIN ที่ออกไปแล้ว (ขั้นที่ 1 ผ่าน) */
  const challenges = new Map<string, { username: string; tokenVersion: number; expiresAt: number }>();

  function assertNotLocked(username: string): void {
    const failure = failures.get(username);
    if (failure && failure.until > Date.now() && failure.count >= PIN_MAX_FAILURES) {
      throw new ApiError('BUSY', `ใส่รหัสผิดหลายครั้ง บัญชีนี้ถูกล็อกชั่วคราว ${PIN_LOCK_MINUTES} นาที หรือให้ผู้ดูแลรีเซ็ตให้`);
    }
  }

  function recordFailure(username: string): void {
    const failure = failures.get(username);
    const count = failure && failure.until > Date.now() ? failure.count + 1 : 1;
    failures.set(username, { count, until: Date.now() + PIN_LOCK_MINUTES * 60_000 });
  }

  async function pinMatches(user: DemoUser, pin: string): Promise<boolean> {
    return user.pinHash !== '' && constantTimeEqual(await demoPinHash(user.email, user.pinSalt, pin.trim()), user.pinHash);
  }

  // token ผูก tokenVersion ไว้ รีเซ็ต PIN แล้ว token เดิมใช้ไม่ได้ทันทีเหมือนระบบจริง
  function userFromToken(token: string): DemoUser {
    if (!token.startsWith(DEMO_TOKEN_PREFIX)) {
      throw new ApiError('UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
    }
    const [username, version] = token.slice(DEMO_TOKEN_PREFIX.length).split(':');
    const user = state.users.find((candidate) => candidate.email === username);
    if (user === undefined) throw new ApiError('FORBIDDEN', 'ไม่พบบัญชีผู้ใช้นี้ในระบบแล้ว');
    if (user.status !== 'active') throw new ApiError('FORBIDDEN', 'บัญชีนี้ถูกปิดการใช้งาน');
    if (String(user.tokenVersion) !== version) throw new ApiError('UNAUTHENTICATED', 'PIN ของคุณถูกเปลี่ยน กรุณาเข้าสู่ระบบอีกครั้ง');
    return user;
  }

  function requireAdmin(token: string): DemoUser {
    const user = userFromToken(token);
    if (user.role !== 'admin') throw new ApiError('FORBIDDEN', 'ต้องเป็นผู้ดูแลระบบจึงจะทำรายการนี้ได้');
    return user;
  }

  function issues(parsed: { ok: false; issues: { message: string }[] }): string {
    return parsed.issues.map((issue) => issue.message).join(' · ');
  }

  function changed(): void {
    state.dataVersion += 1;
    saveState(state);
  }

  const handlers: Record<string, (payload: never, token: string) => unknown> = {
    ping: () => ({ pong: true, serverTime: new Date().toISOString() }),

    login: async (payload: unknown) => {
      const parsed = validateLoginInput(payload);
      if (!parsed.ok) throw new ApiError('VALIDATION', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', parsed.issues);
      const { username, password } = parsed.value;
      assertNotLocked(username);
      const user = state.users.find((candidate) => candidate.email === username);
      const ok = user !== undefined && user.passwordHash !== '' &&
        constantTimeEqual(await demoPasswordHash(username, user.passwordSalt, password), user.passwordHash);
      if (!ok || user === undefined) {
        recordFailure(username);
        throw new ApiError('UNAUTHENTICATED', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
      if (user.status !== 'active') throw new ApiError('FORBIDDEN', 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      const challenge = `demo-challenge:${newSalt()}`;
      challenges.set(challenge, { username, tokenVersion: user.tokenVersion, expiresAt: Date.now() + PIN_CHALLENGE_TTL_MS });
      return { challenge, displayName: user.displayName };
    },

    loginPin: async (payload: unknown) => {
      const parsed = validatePinStepInput(payload);
      if (!parsed.ok) throw new ApiError('VALIDATION', 'กรุณากรอก PIN', parsed.issues);
      const ticket = challenges.get(parsed.value.challenge);
      if (!ticket || ticket.expiresAt <= Date.now()) {
        throw new ApiError('UNAUTHENTICATED', 'หมดเวลายืนยัน PIN กรุณาเข้าสู่ระบบด้วยรหัสผ่านอีกครั้ง');
      }
      assertNotLocked(ticket.username);
      const user = state.users.find((candidate) => candidate.email === ticket.username);
      if (!user || user.status !== 'active' || user.tokenVersion !== ticket.tokenVersion) {
        throw new ApiError('UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านอีกครั้ง');
      }
      if (!(await pinMatches(user, parsed.value.pin))) {
        recordFailure(user.email);
        throw new ApiError('UNAUTHENTICATED', 'PIN ไม่ถูกต้อง');
      }
      challenges.delete(parsed.value.challenge);
      failures.delete(user.email);
      user.lastLoginAt = new Date().toISOString();
      saveState(state);
      return { token: `${DEMO_TOKEN_PREFIX}${user.email}:${user.tokenVersion}`, user: sessionView(user) };
    },

    users: (_payload, token) => {
      requireAdmin(token);
      return { users: state.users.map(adminView) };
    },
    createUser: async (payload: unknown, token) => {
      requireAdmin(token);
      const parsed = validateUserAccountInput(payload, { requirePin: true });
      if (!parsed.ok) throw new ApiError('VALIDATION', issues(parsed), parsed.issues);
      const input = parsed.value;
      if (state.users.some((user) => user.email === input.username)) {
        throw new ApiError('CONFLICT', `มีชื่อผู้ใช้ "${input.username}" อยู่แล้ว`);
      }
      const user: DemoUser = {
        email: input.username, displayName: input.displayName, department: input.department, role: input.role,
        status: input.status, allowedRoomIds: input.allowedRoomIds, tokenVersion: 1, lastLoginAt: '',
        createdAt: new Date().toISOString(), ...(await demoCredential(input.username, input.pin)),
        ...(await demoPasswordCredential(input.username, input.password)),
      };
      state.users.push(user); changed();
      return { user: adminView(user) };
    },
    updateUser: (payload: unknown, token) => {
      const admin = requireAdmin(token);
      const parsed = validateUserAccountInput(payload, { requirePin: false });
      if (!parsed.ok) throw new ApiError('VALIDATION', issues(parsed), parsed.issues);
      const input = parsed.value;
      const user = state.users.find((item) => item.email === input.username);
      if (!user) throw new ApiError('NOT_FOUND', 'ไม่พบผู้ใช้');
      if (input.username === admin.email && (input.status !== 'active' || input.role !== 'admin')) {
        throw new ApiError('CONFLICT', 'ลดสิทธิ์หรือปิดบัญชีของตัวเองไม่ได้ ให้ผู้ดูแลคนอื่นทำแทน');
      }
      const problem = lastAdminProblem(state.users.map((item) => ({ ...item, username: item.email })), input.username, input);
      if (problem !== null) throw new ApiError('CONFLICT', problem);
      Object.assign(user, {
        displayName: input.displayName, department: input.department, role: input.role,
        status: input.status, allowedRoomIds: input.allowedRoomIds,
      });
      changed();
      return { user: adminView(user) };
    },
    resetUserPin: async (payload: unknown, token) => {
      requireAdmin(token);
      const parsed = validateResetPinInput(payload);
      if (!parsed.ok) throw new ApiError('VALIDATION', issues(parsed), parsed.issues);
      const user = state.users.find((item) => item.email === parsed.value.username);
      if (!user) throw new ApiError('NOT_FOUND', 'ไม่พบผู้ใช้');
      Object.assign(user, await demoCredential(user.email, parsed.value.pin));
      user.tokenVersion += 1;
      failures.delete(user.email);
      changed();
      return { ok: true };
    },
    resetUserPassword: async (payload: unknown, token) => {
      requireAdmin(token);
      const parsed = validateResetPasswordInput(payload);
      if (!parsed.ok) throw new ApiError('VALIDATION', issues(parsed), parsed.issues);
      const user = state.users.find((item) => item.email === parsed.value.username);
      if (!user) throw new ApiError('NOT_FOUND', 'ไม่พบผู้ใช้');
      Object.assign(user, await demoPasswordCredential(user.email, parsed.value.password));
      user.tokenVersion += 1;
      failures.delete(user.email);
      changed();
      return { ok: true };
    },
    deleteUser: (payload: { username?: string }, token) => {
      const admin = requireAdmin(token);
      const username = normalizeUsername(payload?.username);
      if (username === admin.email) throw new ApiError('CONFLICT', 'ลบบัญชีของตัวเองไม่ได้');
      if (!state.users.some((item) => item.email === username)) throw new ApiError('NOT_FOUND', 'ไม่พบผู้ใช้');
      const problem = lastAdminProblem(state.users.map((item) => ({ ...item, username: item.email })), username, null);
      if (problem !== null) throw new ApiError('CONFLICT', problem);
      state.users = state.users.filter((item) => item.email !== username);
      changed();
      return { ok: true };
    },

    me: (_payload, token) => ({ user: sessionView(userFromToken(token)) }),

    bootstrap: (_payload, token) => ({
      user: sessionView(userFromToken(token)),
      settings: state.settings,
      dataVersion: state.dataVersion,
      serverTime: new Date().toISOString(),
    }),
    rooms: (_payload, token) => {
      const user = userFromToken(token);
      return { rooms: state.rooms.filter((room) => canUseRoom(user, room.roomId)) };
    },
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
      if (!canUseRoom(user, room.roomId)) throw new ApiError('FORBIDDEN', 'บัญชีของคุณยังไม่ได้รับสิทธิ์จองห้องนี้ กรุณาติดต่อผู้ดูแลระบบ');
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
    decideBooking: async (payload: { pin?: unknown }, token) => {
      const user = userFromToken(token);
      // PIN แทนลายเซ็น — ผิดนับรวมกับตัวนับล็อกบัญชีเหมือนตอนเข้าสู่ระบบ
      assertNotLocked(user.email);
      if (!(await pinMatches(user, typeof payload?.pin === 'string' ? payload.pin : ''))) {
        recordFailure(user.email);
        throw new ApiError('VALIDATION', 'PIN ไม่ถูกต้อง');
      }
      failures.delete(user.email);
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
      state = await ready;

      const handler = handlers[action];
      if (handler === undefined) {
        throw new ApiError('BAD_REQUEST', `ระบบยังไม่รองรับคำสั่ง "${action}"`);
      }
      return handler(payload as never, token) as T;
    },

    async version(): Promise<VersionResult> {
      state = await ready;
      return { dataVersion: state.dataVersion, serverTime: new Date().toISOString() };
    },
  };
}
