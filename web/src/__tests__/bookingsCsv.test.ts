import { describe, expect, it } from 'vitest';
import { bookingsToCsv } from '../lib/export/bookingsCsv';
import type { DemoBooking, DemoRoom } from '../lib/api/demo';

const room = { roomId: 'r1', name: 'ห้องประชุมใหญ่' } as DemoRoom;
const booking = {
  bookingId: 'b1', roomId: 'r1', dateKey: '2026-10-30', startMin: 540, endMin: 630, status: 'pending',
  title: '', userEmail: 'a@x', userName: 'A', bookerName: 'นาย "ทดสอบ"', department: 'แผนกวิชาการบัญชี',
  attendees: 12, equipment: [], note: '=HYPERLINK("http://evil")', requestedFacilities: ['projector'],
} as unknown as DemoBooking;

describe('ส่งออก CSV', () => {
  it('มีหัวตาราง วันที่ พ.ศ. ชื่อห้อง และสถานะภาษาไทย', () => {
    const [header, row] = bookingsToCsv([booking], [room]).split('\r\n');
    expect(header).toContain('"วันที่ (พ.ศ.)"');
    expect(row).toContain('"30/10/2569"');
    expect(row).toContain('"09:00","10:30","ห้องประชุมใหญ่"');
    expect(row).toContain('"รออนุมัติ"');
    expect(row).toContain('"เครื่องฉายภาพ (Projector)"');
  });

  it('กันสูตร Excel และ escape เครื่องหมายคำพูด', () => {
    const row = bookingsToCsv([booking], [room]).split('\r\n')[1]!;
    expect(row).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(row).toContain('"นาย ""ทดสอบ"""');
  });
});
