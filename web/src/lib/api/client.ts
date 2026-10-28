/** คำสั่งทั้งหมดที่หน้าเว็บเรียกได้ — ชื่อ action ต้องตรงกับ apps-script/50_Api.gs */

import { createDemoTransport } from './demo';
import { createHttpTransport } from './transport';
import type { BootstrapResult, LoginResult, SessionUser, Transport, VersionResult } from './types';
import type { DemoBooking, DemoRoom } from './demo';
import type { BookingRequest } from '@shared/schemas/booking';

export interface ApiClient {
  readonly mode: 'http' | 'demo';
  ping(): Promise<{ pong: boolean; serverTime: string }>;
  loginWithGoogle(idToken: string): Promise<LoginResult>;
  loginDemo(role: 'admin' | 'staff'): Promise<LoginResult>;
  me(token: string): Promise<{ user: SessionUser }>;
  bootstrap(token: string): Promise<BootstrapResult>;
  version(): Promise<VersionResult>;
  rooms(token: string): Promise<{ rooms: DemoRoom[] }>;
  bookings(token: string, from?: string, to?: string): Promise<{ bookings: DemoBooking[] }>;
  createBooking(token: string, input: BookingRequest): Promise<{ booking: DemoBooking }>;
  cancelBooking(token: string, bookingId: string, reason?: string): Promise<{ booking: DemoBooking }>;
  decideBooking(token: string, bookingId: string, decision: 'approve'|'reject', reason?: string): Promise<{ booking: DemoBooking }>;
}

function wrap(transport: Transport): ApiClient {
  return {
    mode: transport.kind,
    ping: () => transport.call('ping'),
    loginWithGoogle: (idToken) => transport.call('login', { idToken }),
    loginDemo: (role) => transport.call('login', { role }),
    me: (token) => transport.call('me', {}, token),
    bootstrap: (token) => transport.call('bootstrap', {}, token),
    version: () => transport.version(),
    rooms: (token) => transport.call('rooms', {}, token),
    bookings: (token, from, to) => transport.call('bookings', { from, to }, token),
    createBooking: (token, input) => transport.call('createBooking', input, token),
    cancelBooking: (token, bookingId, reason = '') => transport.call('cancelBooking', { bookingId, reason }, token),
    decideBooking: (token, bookingId, decision, reason = '') => transport.call('decideBooking', { bookingId, decision, reason }, token),
  };
}

export function createApiClient(options: { apiUrl: string; demo: boolean }): ApiClient {
  return wrap(options.demo ? createDemoTransport() : createHttpTransport(options.apiUrl));
}
