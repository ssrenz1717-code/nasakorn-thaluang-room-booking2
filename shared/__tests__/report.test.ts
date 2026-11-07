import { describe, expect, it } from 'vitest';
import { buildReport, monthsBetween, reportRange, daysInRange } from '../domain/report';
import { approvedSlotsOn, liveRoomState } from '../domain/room-status';

const base = { roomId: 'a', dateKey: '2026-11-03', startMin: 540, endMin: 600, status: 'confirmed', department: 'บัญชี', attendees: 10, meetingType: 'internal' };
const all = { from: '2026-11-01', to: '2026-11-30', roomId: '', department: '', meetingType: '' };

describe('reportRange', () => {
  it('เดือน ปี ปีงบประมาณ และกำหนดเอง', () => {
    expect(reportRange({ kind: 'month', month: '2026-02' })).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(reportRange({ kind: 'month', month: '2028-02' }).to).toBe('2028-02-29');
    expect(reportRange({ kind: 'year', year: 2026 })).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    // ปีงบประมาณ 2570 (ค.ศ. 2027) เริ่ม 1 ต.ค. 2569
    expect(reportRange({ kind: 'fiscalYear', year: 2027 })).toEqual({ from: '2026-10-01', to: '2027-09-30' });
    expect(reportRange({ kind: 'custom', from: '2026-11-10', to: '2026-11-01' })).toEqual({ from: '2026-11-01', to: '2026-11-10' });
  });

  it('เดือนในช่วงข้ามปี และจำนวนวัน', () => {
    expect(monthsBetween('2026-11-15', '2027-02-01')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(daysInRange('2026-11-01', '2026-11-30')).toBe(30);
  });
});

describe('buildReport', () => {
  const bookings = [
    base,
    { ...base, roomId: 'b', startMin: 600, endMin: 720, attendees: 30, department: 'ไฟฟ้า' },
    { ...base, dateKey: '2026-11-20', status: 'completed', meetingType: 'training' },
    { ...base, status: 'cancelled' },
    { ...base, status: 'pending' },
    { ...base, dateKey: '2026-10-31' },
  ];

  it('นับเฉพาะรายการที่อนุมัติแล้วในช่วง แต่แจกจำนวนตามสถานะครบ', () => {
    const report = buildReport(bookings, all);
    expect(report.count).toBe(3);
    expect(report.minutes).toBe(60 + 120 + 60);
    expect(report.attendees).toBe(50);
    expect(report.byStatus).toMatchObject({ confirmed: 2, completed: 1, cancelled: 1, pending: 1, rejected: 0 });
    expect(report.byRoom.map((row) => [row.key, row.count])).toEqual([['a', 2], ['b', 1]]);
    expect(report.byMeetingType[0]).toMatchObject({ key: 'internal', count: 2 });
    expect(report.byMonth).toEqual([{ key: '2026-11', count: 3, minutes: 240, attendees: 50 }]);
  });

  it('กรองตามห้อง แผนก และประเภท', () => {
    expect(buildReport(bookings, { ...all, roomId: 'b' }).count).toBe(1);
    expect(buildReport(bookings, { ...all, department: 'บัญชี' }).count).toBe(2);
    expect(buildReport(bookings, { ...all, meetingType: 'training' }).count).toBe(1);
  });

  it('เดือนที่ไม่มีการใช้ก็มีแถว 0', () => {
    const report = buildReport(bookings, { ...all, from: '2026-10-01', to: '2026-12-31' });
    expect(report.byMonth.map((row) => [row.key, row.count])).toEqual([['2026-10', 1], ['2026-11', 3], ['2026-12', 0]]);
  });
});

describe('liveRoomState', () => {
  const rows = [
    { roomId: 'a', dateKey: '2026-11-07', startMin: 540, endMin: 600, status: 'confirmed' },
    { roomId: 'a', dateKey: '2026-11-07', startMin: 600, endMin: 660, status: 'confirmed' },
    { roomId: 'a', dateKey: '2026-11-07', startMin: 780, endMin: 840, status: 'confirmed' },
    { roomId: 'a', dateKey: '2026-11-07', startMin: 900, endMin: 960, status: 'pending' },
    { roomId: 'a', dateKey: '2026-11-08', startMin: 540, endMin: 600, status: 'confirmed' },
  ];
  const slots = approvedSlotsOn(rows, '2026-11-07');
  const room = { roomId: 'a', status: 'active' };

  it('กำลังใช้: ประชุมต่อกันติดนับรวมถึงเวลาว่างจริง', () => {
    expect(liveRoomState(room, slots, 550)).toEqual({ kind: 'busy', untilMin: 660 });
  });

  it('ว่าง: บอกเวลาประชุมถัดไป คำขอรออนุมัติไม่นับ', () => {
    expect(liveRoomState(room, slots, 700)).toEqual({ kind: 'free', nextStartMin: 780 });
    expect(liveRoomState(room, slots, 850)).toEqual({ kind: 'free', nextStartMin: null });
    expect(liveRoomState(room, slots, 660)).toEqual({ kind: 'free', nextStartMin: 780 });
  });

  it('ห้องปิดปรับปรุงหรือไม่เปิดจอง', () => {
    expect(liveRoomState({ roomId: 'a', status: 'maintenance' }, slots, 550)).toEqual({ kind: 'closed' });
  });
});
