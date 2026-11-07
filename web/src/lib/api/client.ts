/** คำสั่งทั้งหมดที่หน้าเว็บเรียกได้ — ชื่อ action ต้องตรงกับ apps-script/50_Api.gs */

import { createDemoTransport } from './demo';
import { createHttpTransport } from './transport';
import type { AdminUser, BootstrapResult, LoginResult, SessionUser, Transport, VersionResult } from './types';
import type { UserAccountInput } from '@shared/schemas/user';
import type { DemoBooking, DemoRoom } from './demo';
import type { BookingRequest } from '@shared/schemas/booking';
import type { BusySlot } from '@shared/domain/availability';
import type { DaySlot } from '@shared/domain/room-status';
import type { Announcement, AnnouncementInput } from '@shared/schemas/announcement';
import type { LookupInput, LookupItem } from '@shared/schemas/lookup';
import type { RoomInput } from '@shared/schemas/room';
import type { Review, ReviewInput, RoomRatingSummary } from '@shared/schemas/review';

/**
 * ส่งสัญญาณทั้งแอปเมื่อรายการจองเปลี่ยน (จอง/ยกเลิก/อนุมัติ/ปฏิเสธ)
 * ให้ส่วนที่แสดงตัวเลขสรุป เช่น ป้ายแดงบนเมนู "รออนุมัติ" อัปเดตเองทันที
 * ยิงจากที่นี่จุดเดียว หน้าไหนเรียกคำสั่งพวกนี้ก็ได้ผลเหมือนกันโดยไม่ต้องจำ
 */
export const BOOKINGS_CHANGED_EVENT = 'mrb:bookings-changed';

/** รายการตั้งต้นหรือห้องเปลี่ยน — ให้ทุกหน้าที่ใช้รายการพวกนี้โหลดใหม่ทันที */
export const CATALOG_CHANGED_EVENT = 'mrb:catalog-changed';

function announceCatalogChanged<T>(result: Promise<T>): Promise<T> {
  return result.then((value) => {
    window.dispatchEvent(new Event(CATALOG_CHANGED_EVENT));
    return value;
  });
}

function announceBookingsChanged<T>(result: Promise<T>): Promise<T> {
  return result.then((value) => {
    window.dispatchEvent(new Event(BOOKINGS_CHANGED_EVENT));
    return value;
  });
}

export interface ApiClient {
  readonly mode: 'http' | 'demo';
  ping(): Promise<{ pong: boolean; serverTime: string }>;
  /** เข้าสู่ระบบทาง ก: ชื่อผู้ใช้ + รหัสผ่าน */
  login(username: string, password: string): Promise<LoginResult>;
  /** เข้าสู่ระบบทาง ข: PIN อย่างเดียว */
  loginPin(pin: string): Promise<LoginResult>;
  me(token: string): Promise<{ user: SessionUser }>;
  bootstrap(token: string): Promise<BootstrapResult>;
  version(): Promise<VersionResult>;
  rooms(token: string): Promise<{ rooms: DemoRoom[] }>;
  bookings(token: string, from?: string, to?: string): Promise<{ bookings: DemoBooking[] }>;
  /** ช่วงเวลาที่ห้องถูกจองไว้ในวันนั้น (ไม่มีชื่อ/หัวข้อของใคร ทุกคนดูได้) */
  availability(token: string, roomId: string, dateKey: string): Promise<{ busy: BusySlot[] }>;
  /** ช่วงที่อนุมัติแล้วของทุกห้องวันนี้ (ไม่มีชื่อ/หัวข้อ) — สถานะห้องตอนนี้ในหน้าภาพรวม */
  roomSlotsToday(token: string): Promise<{ dateKey: string; slots: DaySlot[] }>;
  createBooking(token: string, input: BookingRequest): Promise<{ booking: DemoBooking }>;
  cancelBooking(token: string, bookingId: string, reason?: string): Promise<{ booking: DemoBooking }>;
  /** ลงนาม — ต้องแนบ PIN ของผู้ลงนามทุกครั้ง (แทนลายเซ็น) */
  decideBooking(token: string, bookingId: string, decision: 'approve'|'reject', pin: string, reason?: string): Promise<{ booking: DemoBooking }>;
  /** ประกาศที่ยังแสดงอยู่ (ทุกคนอ่านได้) */
  announcements(token: string): Promise<{ announcements: Announcement[] }>;
  /** เพิ่ม (announcementId = '') หรือแก้ประกาศ — เฉพาะผู้ดูแล */
  saveAnnouncement(token: string, input: AnnouncementInput): Promise<{ announcement: Announcement }>;
  archiveAnnouncement(token: string, announcementId: string): Promise<{ ok: boolean }>;
  /** รายการตั้งต้น (อุปกรณ์ ประเภทการประชุม แผนก ตำแหน่ง) — ทุกคนอ่านได้ */
  lookups(token: string): Promise<{ lookups: LookupItem[] }>;
  /** เพิ่ม (lookupId = '') หรือแก้รายการ — เฉพาะผู้ดูแล */
  saveLookup(token: string, input: LookupInput): Promise<{ lookup: LookupItem }>;
  archiveLookup(token: string, lookupId: string): Promise<{ ok: boolean }>;
  /** เพิ่ม (roomId = '') หรือแก้ห้อง — เฉพาะผู้ดูแล */
  saveRoom(token: string, input: RoomInput): Promise<{ room: DemoRoom }>;
  /** ลบได้เฉพาะห้องที่ไม่เคยมีการจอง */
  deleteRoom(token: string, roomId: string): Promise<{ ok: boolean }>;
  /** คะแนนเฉลี่ยรายห้อง — ทุกคนเห็น ไม่มีความคิดเห็นติดมา */
  reviewSummary(token: string): Promise<{ summary: RoomRatingSummary[] }>;
  /** ผู้ดูแลได้ทุกรีวิว คนอื่นได้เฉพาะของตัวเอง */
  reviews(token: string): Promise<{ reviews: Review[] }>;
  submitReview(token: string, input: ReviewInput): Promise<{ review: Review }>;
  /** จัดการผู้ใช้ — เฉพาะผู้ดูแล */
  users(token: string): Promise<{ users: AdminUser[] }>;
  createUser(token: string, input: UserAccountInput & { pin: string; password: string }): Promise<{ user: AdminUser }>;
  updateUser(token: string, input: UserAccountInput): Promise<{ user: AdminUser }>;
  resetUserPin(token: string, username: string, pin: string): Promise<{ ok: boolean }>;
  resetUserPassword(token: string, username: string, password: string): Promise<{ ok: boolean }>;
  deleteUser(token: string, username: string): Promise<{ ok: boolean }>;
}

function wrap(transport: Transport): ApiClient {
  return {
    mode: transport.kind,
    ping: () => transport.call('ping'),
    login: (username, password) => transport.call('login', { username, password }),
    loginPin: (pin) => transport.call('loginPin', { pin }),
    me: (token) => transport.call('me', {}, token),
    bootstrap: (token) => transport.call('bootstrap', {}, token),
    version: () => transport.version(),
    rooms: (token) => transport.call('rooms', {}, token),
    bookings: (token, from, to) => transport.call('bookings', { from, to }, token),
    availability: (token, roomId, dateKey) => transport.call('availability', { roomId, dateKey }, token),
    roomSlotsToday: (token) => transport.call('roomSlotsToday', {}, token),
    createBooking: (token, input) => announceBookingsChanged(transport.call('createBooking', input, token)),
    cancelBooking: (token, bookingId, reason = '') => announceBookingsChanged(transport.call('cancelBooking', { bookingId, reason }, token)),
    decideBooking: (token, bookingId, decision, pin, reason = '') => announceBookingsChanged(transport.call('decideBooking', { bookingId, decision, reason, pin }, token)),
    announcements: (token) => transport.call('announcements', {}, token),
    saveAnnouncement: (token, input) => transport.call('saveAnnouncement', input, token),
    archiveAnnouncement: (token, announcementId) => transport.call('archiveAnnouncement', { announcementId }, token),
    lookups: (token) => transport.call('lookups', {}, token),
    saveLookup: (token, input) => announceCatalogChanged(transport.call('saveLookup', input, token)),
    archiveLookup: (token, lookupId) => announceCatalogChanged(transport.call('archiveLookup', { lookupId }, token)),
    saveRoom: (token, input) => announceCatalogChanged(transport.call('saveRoom', input, token)),
    deleteRoom: (token, roomId) => announceCatalogChanged(transport.call('deleteRoom', { roomId }, token)),
    reviewSummary: (token) => transport.call('reviewSummary', {}, token),
    reviews: (token) => transport.call('reviews', {}, token),
    submitReview: (token, input) => announceBookingsChanged(transport.call('submitReview', input, token)),
    users: (token) => transport.call('users', {}, token),
    createUser: (token, input) => transport.call('createUser', input, token),
    updateUser: (token, input) => transport.call('updateUser', input, token),
    resetUserPin: (token, username, pin) => transport.call('resetUserPin', { username, pin }, token),
    resetUserPassword: (token, username, password) => transport.call('resetUserPassword', { username, password }, token),
    deleteUser: (token, username) => transport.call('deleteUser', { username }, token),
  };
}

export function createApiClient(options: { apiUrl: string; demo: boolean }): ApiClient {
  return wrap(options.demo ? createDemoTransport() : createHttpTransport(options.apiUrl));
}
