/**
 * รายงานสรุปการใช้ห้อง — หน้ารายงานและไฟล์ Excel ใช้ตัวเลขชุดเดียวกันจากที่นี่
 *
 * นับ "การใช้ห้อง" เฉพาะรายการที่อนุมัติแล้ว (confirmed / completed)
 * ส่วนรายการรออนุมัติ ไม่อนุมัติ และยกเลิก นับแยกไว้ในจำนวนตามสถานะ ไม่รวมในชั่วโมงใช้งาน
 */

import { BOOKING_STATUSES, type BookingStatus } from './status';
import { addDaysToDateKey } from '../time/bangkok';

export const REPORT_COUNTED_STATUSES: readonly string[] = ['confirmed', 'completed'];

export interface ReportBooking {
  roomId: string;
  dateKey: string;
  startMin: number;
  endMin: number;
  status: string;
  department: string;
  attendees: number;
  meetingType?: string;
}

export interface ReportFilter {
  /** YYYY-MM-DD รวมวันแรกและวันสุดท้าย */
  from: string;
  to: string;
  /** ว่าง = ทั้งหมด */
  roomId: string;
  department: string;
  meetingType: string;
}

export interface ReportGroup {
  key: string;
  count: number;
  minutes: number;
  attendees: number;
}

export interface ReportResult<T extends ReportBooking> {
  count: number;
  minutes: number;
  attendees: number;
  byStatus: Record<BookingStatus, number>;
  byRoom: ReportGroup[];
  byDepartment: ReportGroup[];
  byMeetingType: ReportGroup[];
  /** ทุกเดือนในช่วง (เดือนที่ไม่มีการใช้ก็มีแถว 0) เรียงตามเวลา */
  byMonth: ReportGroup[];
  /** รายการที่นับแล้ว เรียงตามวันและเวลา */
  rows: T[];
}

export type ReportPeriod =
  | { kind: 'month'; month: string }
  | { kind: 'year'; year: number }
  | { kind: 'fiscalYear'; year: number }
  | { kind: 'custom'; from: string; to: string };

const pad = (value: number) => String(value).padStart(2, '0');

function lastDayOfMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number) as [number, number];
  return `${month}-${pad(new Date(Date.UTC(year, mon, 0)).getUTCDate())}`;
}

/**
 * ช่วงวันที่ของแต่ละแบบ (ปี ค.ศ. ในโค้ด หน้าจอแปลงเป็น พ.ศ. เอง)
 * ปีงบประมาณ 2570 = 1 ต.ค. 2569 – 30 ก.ย. 2570 → fiscalYear ค.ศ. 2027 = 2026-10-01 ถึง 2027-09-30
 */
export function reportRange(period: ReportPeriod): { from: string; to: string } {
  switch (period.kind) {
    case 'month':
      return { from: `${period.month}-01`, to: lastDayOfMonth(period.month) };
    case 'year':
      return { from: `${period.year}-01-01`, to: `${period.year}-12-31` };
    case 'fiscalYear':
      return { from: `${period.year - 1}-10-01`, to: `${period.year}-09-30` };
    case 'custom':
      return period.from <= period.to ? { from: period.from, to: period.to } : { from: period.to, to: period.from };
  }
}

/** เดือนทั้งหมดในช่วง (YYYY-MM) — จำกัดไว้ 60 เดือนกันช่วงยาวผิดปกติ */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let [year, month] = from.slice(0, 7).split('-').map(Number) as [number, number];
  const end = to.slice(0, 7);
  while (months.length < 60) {
    const key = `${year}-${pad(month)}`;
    if (key > end) break;
    months.push(key);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return months;
}

export function matchesReportFilter(booking: ReportBooking, filter: ReportFilter): boolean {
  return booking.dateKey >= filter.from && booking.dateKey <= filter.to &&
    (filter.roomId === '' || booking.roomId === filter.roomId) &&
    (filter.department === '' || booking.department.trim() === filter.department) &&
    (filter.meetingType === '' || (booking.meetingType ?? '') === filter.meetingType);
}

function group<T extends ReportBooking>(rows: readonly T[], keyOf: (row: T) => string, seed: readonly string[] = []): ReportGroup[] {
  const groups = new Map<string, ReportGroup>(seed.map((key) => [key, { key, count: 0, minutes: 0, attendees: 0 }]));
  for (const row of rows) {
    const key = keyOf(row);
    const item = groups.get(key) ?? { key, count: 0, minutes: 0, attendees: 0 };
    item.count += 1;
    item.minutes += Math.max(0, row.endMin - row.startMin);
    item.attendees += Math.max(0, Number(row.attendees) || 0);
    groups.set(key, item);
  }
  return [...groups.values()];
}

const byUsage = (a: ReportGroup, b: ReportGroup) => b.count - a.count || b.minutes - a.minutes || a.key.localeCompare(b.key);

export function buildReport<T extends ReportBooking>(bookings: readonly T[], filter: ReportFilter): ReportResult<T> {
  const inScope = bookings.filter((booking) => matchesReportFilter(booking, filter));
  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((status) => [status, 0])) as Record<BookingStatus, number>;
  for (const booking of inScope) {
    if (booking.status in byStatus) byStatus[booking.status as BookingStatus] += 1;
  }
  const rows = inScope
    .filter((booking) => REPORT_COUNTED_STATUSES.includes(booking.status))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.startMin - b.startMin);
  const totals = group(rows, () => 'all')[0] ?? { count: 0, minutes: 0, attendees: 0 };
  return {
    count: totals.count,
    minutes: totals.minutes,
    attendees: totals.attendees,
    byStatus,
    byRoom: group(rows, (row) => row.roomId).sort(byUsage),
    byDepartment: group(rows, (row) => row.department.trim()).sort(byUsage),
    byMeetingType: group(rows, (row) => row.meetingType ?? '').sort(byUsage),
    byMonth: group(rows, (row) => row.dateKey.slice(0, 7), monthsBetween(filter.from, filter.to))
      .sort((a, b) => a.key.localeCompare(b.key)),
    rows,
  };
}

/** จำนวนวันในช่วง — ใช้แสดง "เฉลี่ยต่อวัน" */
export function daysInRange(from: string, to: string): number {
  let count = 0;
  for (let key = from; key <= to && count < 3700; key = addDaysToDateKey(key, 1)) count += 1;
  return count;
}
