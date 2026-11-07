import { BOOKING_STATUS_LABEL_TH } from '@shared/domain/status';
import { lookupLabel, type LookupItem } from '@shared/schemas/lookup';
import type { DemoBooking, DemoRoom } from '../api/demo';

const time = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
/** "2026-10-30" -> "30/10/2569" (พ.ศ.) */
const thaiDate = (key: string) => {
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${Number(year) + 543}`;
};

/**
 * ค่าที่ขึ้นต้นด้วย = + - @ จะถูก Excel ตีความเป็นสูตร (CSV injection)
 * ชื่อผู้จอง/รายละเอียดมาจากผู้ใช้ จึงเติม ' นำหน้าให้เป็นข้อความเสมอ
 */
function cell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

type Label = (key: string) => string;

const COLUMNS: { header: string; value: (booking: DemoBooking, roomName: string, facility: Label) => unknown }[] = [
  { header: 'รหัสการจอง', value: (b) => b.bookingId },
  { header: 'วันที่ (พ.ศ.)', value: (b) => thaiDate(b.dateKey) },
  { header: 'เวลาเริ่ม', value: (b) => time(b.startMin) },
  { header: 'เวลาสิ้นสุด', value: (b) => time(b.endMin) },
  { header: 'ห้องประชุม', value: (_b, roomName) => roomName },
  { header: 'ผู้จอง', value: (b) => b.bookerName || b.userName },
  { header: 'แผนก/หน่วยงาน', value: (b) => b.department },
  { header: 'จำนวนผู้เข้าร่วม', value: (b) => b.attendees },
  { header: 'สถานะ', value: (b) => BOOKING_STATUS_LABEL_TH[b.status] ?? b.status },
  { header: 'อุปกรณ์ที่ขอใช้', value: (b, _r, facility) => (b.requestedFacilities ?? []).map(facility).join(', ') },
  { header: 'โต๊ะ/เก้าอี้เพิ่ม (ตัว)', value: (b) => b.extraFurnitureCount ?? 0 },
  { header: 'อุปกรณ์อื่น ๆ', value: (b) => b.otherFacility ?? '' },
  { header: 'รายละเอียด', value: (b) => b.note ?? '' },
  { header: 'อีเมลผู้ส่งคำขอ', value: (b) => b.userEmail },
];

export function bookingsToCsv(bookings: DemoBooking[], rooms: DemoRoom[], lookups: readonly LookupItem[] = []): string {
  const facility: Label = (key) => lookupLabel(lookups, 'facility', key);
  const sorted = [...bookings].sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.startMin - b.startMin);
  const lines = [
    COLUMNS.map((column) => cell(column.header)).join(','),
    ...sorted.map((booking) => {
      const roomName = rooms.find((room) => room.roomId === booking.roomId)?.name ?? booking.roomId;
      return COLUMNS.map((column) => cell(column.value(booking, roomName, facility))).join(',');
    }),
  ];
  // CRLF ตามมาตรฐาน CSV และ Excel บน Windows
  return lines.join('\r\n');
}

/** ดาวน์โหลดเป็นไฟล์ — ใส่ BOM ไว้หน้าไฟล์ ไม่งั้น Excel เปิดภาษาไทยเป็นตัวอักษรเพี้ยน */
export function downloadBookingsCsv(bookings: DemoBooking[], rooms: DemoRoom[], fileLabel: string, lookups: readonly LookupItem[] = []): void {
  const blob = new Blob(['﻿', bookingsToCsv(bookings, rooms, lookups)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileLabel}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
