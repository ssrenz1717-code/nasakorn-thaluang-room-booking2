/** คำสั่งทั้งหมดที่หน้าเว็บเรียกได้ — ชื่อ action ต้องตรงกับ apps-script/50_Api.gs */

import { createDemoTransport } from './demo';
import { createHttpTransport } from './transport';
import type { BootstrapResult, LoginResult, SessionUser, Transport, VersionResult } from './types';
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
  loginWithGoogle(idToken: string): Promise<LoginResult>;
  /** โหมดข้อมูลในเบราว์เซอร์: เข้าระบบตาม role หรือเลือกบัญชีตัวอย่างด้วยอีเมล */
  loginDemo(role: 'admin' | 'staff', email?: string): Promise<LoginResult>;
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
}

function wrap(transport: Transport): ApiClient {
  return {
    mode: transport.kind,
    ping: () => transport.call('ping'),
    loginWithGoogle: (idToken) => transport.call('login', { idToken }),
    loginDemo: (role, email) => transport.call('login', { role, email }),
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
  };
}

export function createApiClient(options: { apiUrl: string; demo: boolean }): ApiClient {
  return wrap(options.demo ? createDemoTransport() : createHttpTransport(options.apiUrl));
}
