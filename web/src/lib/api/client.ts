/** คำสั่งทั้งหมดที่หน้าเว็บเรียกได้ — ชื่อ action ต้องตรงกับ apps-script/50_Api.gs */

import { createDemoTransport } from './demo';
import { createHttpTransport } from './transport';
import type { AdminUser, BootstrapResult, LoginResult, SessionUser, Transport, VersionResult } from './types';
import type { UserAccountInput } from '@shared/schemas/user';
import type { DemoBooking, DemoRoom } from './demo';
import type { BookingRequest } from '@shared/schemas/booking';
import type { BusySlot } from '@shared/domain/availability';
import type { Announcement, AnnouncementInput } from '@shared/schemas/announcement';

/**
 * ส่งสัญญาณทั้งแอปเมื่อรายการจองเปลี่ยน (จอง/ยกเลิก/อนุมัติ/ปฏิเสธ)
 * ให้ส่วนที่แสดงตัวเลขสรุป เช่น ป้ายแดงบนเมนู "รออนุมัติ" อัปเดตเองทันที
 * ยิงจากที่นี่จุดเดียว หน้าไหนเรียกคำสั่งพวกนี้ก็ได้ผลเหมือนกันโดยไม่ต้องจำ
 */
export const BOOKINGS_CHANGED_EVENT = 'mrb:bookings-changed';

function announceBookingsChanged<T>(result: Promise<T>): Promise<T> {
  return result.then((value) => {
    window.dispatchEvent(new Event(BOOKINGS_CHANGED_EVENT));
    return value;
  });
}

export interface ApiClient {
  readonly mode: 'http' | 'demo';
  ping(): Promise<{ pong: boolean; serverTime: string }>;
  /** เข้าสู่ระบบด้วยชื่อผู้ใช้ + PIN (ทั้งระบบจริงและโหมดข้อมูลในเบราว์เซอร์) */
  login(username: string, pin: string): Promise<LoginResult>;
  me(token: string): Promise<{ user: SessionUser }>;
  bootstrap(token: string): Promise<BootstrapResult>;
  version(): Promise<VersionResult>;
  rooms(token: string): Promise<{ rooms: DemoRoom[] }>;
  bookings(token: string, from?: string, to?: string): Promise<{ bookings: DemoBooking[] }>;
  /** ช่วงเวลาที่ห้องถูกจองไว้ในวันนั้น (ไม่มีชื่อ/หัวข้อของใคร ทุกคนดูได้) */
  availability(token: string, roomId: string, dateKey: string): Promise<{ busy: BusySlot[] }>;
  createBooking(token: string, input: BookingRequest): Promise<{ booking: DemoBooking }>;
  cancelBooking(token: string, bookingId: string, reason?: string): Promise<{ booking: DemoBooking }>;
  decideBooking(token: string, bookingId: string, decision: 'approve'|'reject', reason?: string): Promise<{ booking: DemoBooking }>;
  /** ประกาศที่ยังแสดงอยู่ (ทุกคนอ่านได้) */
  announcements(token: string): Promise<{ announcements: Announcement[] }>;
  /** เพิ่ม (announcementId = '') หรือแก้ประกาศ — เฉพาะผู้ดูแล */
  saveAnnouncement(token: string, input: AnnouncementInput): Promise<{ announcement: Announcement }>;
  archiveAnnouncement(token: string, announcementId: string): Promise<{ ok: boolean }>;
  /** จัดการผู้ใช้ — เฉพาะผู้ดูแล */
  users(token: string): Promise<{ users: AdminUser[] }>;
  createUser(token: string, input: UserAccountInput & { pin: string }): Promise<{ user: AdminUser }>;
  updateUser(token: string, input: UserAccountInput): Promise<{ user: AdminUser }>;
  resetUserPin(token: string, username: string, pin: string): Promise<{ ok: boolean }>;
  deleteUser(token: string, username: string): Promise<{ ok: boolean }>;
}

function wrap(transport: Transport): ApiClient {
  return {
    mode: transport.kind,
    ping: () => transport.call('ping'),
    login: (username, pin) => transport.call('login', { username, pin }),
    me: (token) => transport.call('me', {}, token),
    bootstrap: (token) => transport.call('bootstrap', {}, token),
    version: () => transport.version(),
    rooms: (token) => transport.call('rooms', {}, token),
    bookings: (token, from, to) => transport.call('bookings', { from, to }, token),
    availability: (token, roomId, dateKey) => transport.call('availability', { roomId, dateKey }, token),
    createBooking: (token, input) => announceBookingsChanged(transport.call('createBooking', input, token)),
    cancelBooking: (token, bookingId, reason = '') => announceBookingsChanged(transport.call('cancelBooking', { bookingId, reason }, token)),
    decideBooking: (token, bookingId, decision, reason = '') => announceBookingsChanged(transport.call('decideBooking', { bookingId, decision, reason }, token)),
    announcements: (token) => transport.call('announcements', {}, token),
    saveAnnouncement: (token, input) => transport.call('saveAnnouncement', input, token),
    archiveAnnouncement: (token, announcementId) => transport.call('archiveAnnouncement', { announcementId }, token),
    users: (token) => transport.call('users', {}, token),
    createUser: (token, input) => transport.call('createUser', input, token),
    updateUser: (token, input) => transport.call('updateUser', input, token),
    resetUserPin: (token, username, pin) => transport.call('resetUserPin', { username, pin }, token),
    deleteUser: (token, username) => transport.call('deleteUser', { username }, token),
  };
}

export function createApiClient(options: { apiUrl: string; demo: boolean }): ApiClient {
  return wrap(options.demo ? createDemoTransport() : createHttpTransport(options.apiUrl));
}
