import { BOOKING_STATUS_LABEL_TH, type BookingStatus } from '@shared/domain/status';
import type { ReportGroup, ReportResult } from '@shared/domain/report';
import type { DemoBooking } from '../../lib/api/demo';
import type { XlsxSheet } from '../../lib/export/xlsx';

export interface ReportLabels {
  room: (roomId: string) => string;
  department: (key: string) => string;
  meetingType: (key: string) => string;
  month: (key: string) => string;
}

const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;
const time = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const thaiDate = (key: string) => { const [y, m, d] = key.split('-'); return `${d}/${m}/${Number(y) + 543}`; };

const HEAD = ['ครั้ง', 'ชั่วโมงรวม', 'ผู้เข้าร่วมรวม (คน)'];
function groupSheet(name: string, firstColumn: string, groups: ReportGroup[], label: (key: string) => string): XlsxSheet {
  return {
    name,
    rows: [[firstColumn, ...HEAD], ...groups.map((g) => [label(g.key), g.count, hours(g.minutes), g.attendees])],
    boldRows: [0], widths: [36, 10, 14, 20], freezeHeader: true,
  };
}

/** ไฟล์ Excel ของรายงาน: แท็บสรุป + แยกตามห้อง แผนก ประเภท เดือน + รายการจองทั้งหมด */
export function reportWorkbook(report: ReportResult<DemoBooking>, meta: { periodText: string; filterText: string; createdText: string }, labels: ReportLabels): XlsxSheet[] {
  const statuses: BookingStatus[] = ['pending', 'rejected', 'cancelled'];
  return [
    {
      name: 'สรุป',
      rows: [
        ['รายงานสรุปการใช้ห้องประชุม'],
        ['ช่วงเวลา', meta.periodText],
        ['ตัวกรอง', meta.filterText],
        ['สร้างเมื่อ', meta.createdText],
        [],
        ['การใช้ห้องที่อนุมัติแล้ว (ครั้ง)', report.count],
        ['ชั่วโมงรวม', hours(report.minutes)],
        ['ผู้เข้าร่วมรวม (คน)', report.attendees],
        ...statuses.map((status) => [`${BOOKING_STATUS_LABEL_TH[status]} (ครั้ง)`, report.byStatus[status]]),
      ],
      boldRows: [0], widths: [34, 44],
    },
    groupSheet('ตามห้อง', 'ห้องประชุม', report.byRoom, labels.room),
    groupSheet('ตามแผนก', 'แผนก / หน่วยงาน', report.byDepartment, labels.department),
    groupSheet('ตามประเภท', 'ประเภทการประชุม', report.byMeetingType, labels.meetingType),
    groupSheet('รายเดือน', 'เดือน', report.byMonth, labels.month),
    {
      name: 'รายการจอง',
      rows: [
        ['วันที่ (พ.ศ.)', 'เริ่ม', 'สิ้นสุด', 'ชั่วโมง', 'ห้องประชุม', 'หัวข้อ', 'ผู้จอง', 'แผนก / หน่วยงาน', 'ประเภทการประชุม', 'ผู้เข้าร่วม (คน)', 'สถานะ'],
        ...report.rows.map((b) => [
          thaiDate(b.dateKey), time(b.startMin), time(b.endMin), hours(b.endMin - b.startMin), labels.room(b.roomId), b.title,
          b.bookerName || b.userName, labels.department(b.department.trim()), labels.meetingType(b.meetingType ?? ''), b.attendees,
          BOOKING_STATUS_LABEL_TH[b.status] ?? b.status,
        ]),
      ],
      boldRows: [0], widths: [13, 7, 7, 8, 28, 36, 24, 28, 18, 14, 12], freezeHeader: true,
    },
  ];
}
