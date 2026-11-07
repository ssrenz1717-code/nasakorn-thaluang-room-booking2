import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { buildReport, reportRange, type ReportGroup, type ReportPeriod } from '@shared/domain/report';
import { BOOKING_STATUS_LABEL_TH } from '@shared/domain/status';
import { toDateKey } from '@shared/time/bangkok';
import { useApp } from '../../app/providers/AppProvider';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import type { DemoBooking, DemoRoom } from '../../lib/api/demo';
import { useLookups } from '../../lib/hooks/useLookups';
import { useLiveRefresh } from '../../lib/hooks/useLiveRefresh';
import { downloadXlsx } from '../../lib/export/xlsx';
import { formatFullDate, formatNumber, formatShortDate, formatTimeRange } from '../../lib/format/thai';
import { cn } from '../../lib/cn';
import { reportWorkbook, type ReportLabels } from './reportWorkbook';

type Kind = ReportPeriod['kind'];
const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'month', label: 'รายเดือน' },
  { kind: 'year', label: 'รายปี' },
  { kind: 'fiscalYear', label: 'ปีงบประมาณ' },
  { kind: 'custom', label: 'กำหนดเอง' },
];
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const monthLabel = (key: string) => `${MONTHS_TH[Number(key.slice(5, 7)) - 1]} ${Number(key.slice(0, 4)) + 543}`;
const hoursText = (minutes: number) => `${formatNumber(Math.round(minutes / 6) / 10)} ชม.`;
const fieldClass = 'min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:text-sm';
const labelClass = 'mb-1.5 block text-sm font-medium text-ink';

/** รายงานสรุปการใช้ห้อง — ผู้ดูแลและผู้ลงนามเห็นทุกการจอง จึงสรุปได้ทั้งวิทยาลัย */
export function ReportsPage() {
  const { api, token } = useApp();
  const lookups = useLookups();
  const today = toDateKey(new Date());
  const thisYear = Number(today.slice(0, 4));
  const thisFiscal = Number(today.slice(5, 7)) >= 10 ? thisYear + 1 : thisYear;

  const [kind, setKind] = useState<Kind>('month');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(thisYear);
  const [fiscalYear, setFiscalYear] = useState(thisFiscal);
  const [custom, setCustom] = useState({ from: `${today.slice(0, 7)}-01`, to: today });
  const [roomId, setRoomId] = useState('');
  const [department, setDepartment] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [bookings, setBookings] = useState<DemoBooking[] | null>(null);
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [error, setError] = useState('');

  const period: ReportPeriod = kind === 'month' ? { kind, month } : kind === 'year' ? { kind, year } : kind === 'fiscalYear' ? { kind, year: fiscalYear } : { kind, ...custom };
  const range = reportRange(period);
  const load = () => Promise.all([api.bookings(token, range.from, range.to), api.rooms(token)])
    .then(([b, r]) => { setBookings(b.bookings); setRooms(r.rooms); setError(''); })
    .catch((e: Error) => setError(e.message));
  useEffect(() => { void load(); }, [api, token, range.from, range.to]);
  useLiveRefresh(load);

  const report = useMemo(() => buildReport(bookings ?? [], { ...range, roomId, department, meetingType }), [bookings, range.from, range.to, roomId, department, meetingType]);

  const labels: ReportLabels = {
    room: (id) => rooms.find((room) => room.roomId === id)?.name ?? 'ห้องที่ถูกลบไปแล้ว',
    department: (key) => key || 'ไม่ระบุแผนก',
    meetingType: (key) => (key ? lookups.label('meetingType', key) : 'ไม่ระบุประเภท'),
    month: monthLabel,
  };
  const departments = [...new Set([...lookups.active('department').map((item) => item.label), ...(bookings ?? []).map((b) => b.department.trim()).filter(Boolean)])];
  const years = Array.from({ length: 6 }, (_v, i) => thisYear + 1 - i);
  const periodText = kind === 'month' ? `เดือน${monthLabel(month)}` : kind === 'year' ? `ปี พ.ศ. ${year + 543}` : kind === 'fiscalYear' ? `ปีงบประมาณ ${fiscalYear + 543}` : '';
  const rangeText = `${formatFullDate(range.from)} – ${formatFullDate(range.to)}`;
  const filterText = [roomId && labels.room(roomId), department, meetingType && labels.meetingType(meetingType)].filter(Boolean).join(' · ') || 'ทุกห้อง ทุกแผนก ทุกประเภท';

  const exportExcel = () => downloadXlsx(`รายงานการใช้ห้องประชุม ${range.from} ถึง ${range.to}`, reportWorkbook(report, {
    periodText: periodText ? `${periodText} (${rangeText})` : rangeText, filterText,
    createdText: new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date()),
  }, labels));

  const empty = bookings !== null && report.count === 0;

  return <>
    <div className="no-print">
      <PageHeader
        title="รายงานสรุปการใช้ห้อง"
        description="นับเฉพาะการจองที่อนุมัติครบแล้ว ส่งออกเป็น Excel หรือพิมพ์/บันทึกเป็น PDF ได้"
        action={<div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Printer className="size-4" aria-hidden="true" />} onClick={() => window.print()} disabled={bookings === null}>พิมพ์ / บันทึก PDF</Button>
          <Button icon={<FileSpreadsheet className="size-4" aria-hidden="true" />} onClick={exportExcel} disabled={bookings === null}>ส่งออก Excel</Button>
        </div>}
      />

      <Card className="mb-5"><CardBody className="space-y-4 p-4 sm:p-5">
        <div role="radiogroup" aria-label="ช่วงเวลาของรายงาน" className="inline-flex flex-wrap gap-1 rounded-control bg-surface-sunken p-1">
          {KINDS.map((item) => (
            <button key={item.kind} type="button" role="radio" aria-checked={kind === item.kind} onClick={() => setKind(item.kind)}
              className={cn('min-h-10 rounded-inner px-3.5 text-sm font-medium transition-colors duration-150', kind === item.kind ? 'bg-surface text-brand shadow-card' : 'text-ink-muted hover:text-ink')}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kind === 'month' && <>
            <div><label className={labelClass} htmlFor="report-month">เดือน</label>
              <select id="report-month" className={fieldClass} value={month.slice(5, 7)} onChange={(e) => setMonth(`${month.slice(0, 4)}-${e.target.value}`)}>
                {MONTHS_TH.map((name, i) => <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>)}
              </select></div>
            <div><label className={labelClass} htmlFor="report-month-year">ปี พ.ศ.</label>
              <select id="report-month-year" className={fieldClass} value={month.slice(0, 4)} onChange={(e) => setMonth(`${e.target.value}-${month.slice(5, 7)}`)}>
                {years.map((y) => <option key={y} value={y}>{y + 543}</option>)}
              </select></div>
          </>}
          {kind === 'year' && <div><label className={labelClass} htmlFor="report-year">ปี พ.ศ.</label>
            <select id="report-year" className={fieldClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y + 543}</option>)}
            </select></div>}
          {kind === 'fiscalYear' && <div><label className={labelClass} htmlFor="report-fiscal">ปีงบประมาณ</label>
            <select id="report-fiscal" className={fieldClass} value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y + 543} (1 ต.ค. {y + 542} – 30 ก.ย. {y + 543})</option>)}
            </select></div>}
          {kind === 'custom' && <>
            <div><label className={labelClass} htmlFor="report-from">ตั้งแต่วันที่</label>
              <input id="report-from" type="date" className={fieldClass} value={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} /></div>
            <div><label className={labelClass} htmlFor="report-to">ถึงวันที่</label>
              <input id="report-to" type="date" className={fieldClass} value={custom.to} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} /></div>
          </>}
          <div><label className={labelClass} htmlFor="report-room">ห้องประชุม</label>
            <select id="report-room" className={fieldClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">ทุกห้อง</option>
              {rooms.map((room) => <option key={room.roomId} value={room.roomId}>{room.name}</option>)}
            </select></div>
          <div><label className={labelClass} htmlFor="report-dept">แผนก / หน่วยงาน</label>
            <select id="report-dept" className={fieldClass} value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">ทุกแผนก</option>
              {departments.map((name) => <option key={name} value={name}>{name}</option>)}
            </select></div>
          <div><label className={labelClass} htmlFor="report-type">ประเภทการประชุม</label>
            <select id="report-type" className={fieldClass} value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
              <option value="">ทุกประเภท</option>
              {lookups.active('meetingType').map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select></div>
        </div>
      </CardBody></Card>
    </div>

    {error && <Alert tone="danger" title="โหลดข้อมูลไม่สำเร็จ" className="no-print">{error}</Alert>}

    <div className="print-sheet report-sheet">
      <header className="mb-4 hidden print:block">
        <p className="text-lg font-semibold">รายงานสรุปการใช้ห้องประชุม วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</p>
        <p className="text-sm">{periodText && `${periodText} · `}{rangeText} · {filterText}</p>
      </header>
      <p className="mb-3 text-sm text-ink-muted print:hidden">{periodText && <strong className="font-semibold text-ink">{periodText} · </strong>}{rangeText}</p>

      <section aria-label="ตัวเลขสรุป" className="avoid-break mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4">
        <Stat label="การใช้ห้อง" value={`${formatNumber(report.count)} ครั้ง`} />
        <Stat label="ชั่วโมงใช้งานรวม" value={hoursText(report.minutes)} />
        <Stat label="ผู้เข้าร่วมรวม" value={`${formatNumber(report.attendees)} คน`} />
        <Stat label="ไม่อนุมัติ / ยกเลิก" value={`${report.byStatus.rejected} / ${report.byStatus.cancelled}`} hint={report.byStatus.pending ? `รออนุมัติอีก ${report.byStatus.pending} รายการ` : undefined} />
      </section>

      {bookings === null && !error && <p className="py-12 text-center text-ink-muted">กำลังโหลดข้อมูล…</p>}
      {empty && <Card><CardBody className="py-12 text-center">
        <p className="font-medium text-ink">ไม่มีการใช้ห้องที่อนุมัติแล้วในช่วงนี้</p>
        <p className="mt-1 text-sm text-ink-muted">ลองเปลี่ยนช่วงเวลาหรือล้างตัวกรอง</p>
      </CardBody></Card>}

      {!empty && bookings !== null && <>
        <div className="mb-5 grid gap-5 xl:grid-cols-2 print:grid-cols-1">
          <GroupTable title="แยกตามห้องประชุม" groups={report.byRoom} label={labels.room} />
          <GroupTable title="แยกตามแผนก / หน่วยงาน" groups={report.byDepartment} label={labels.department} />
          <GroupTable title="แยกตามประเภทการประชุม" groups={report.byMeetingType} label={labels.meetingType} />
          {report.byMonth.length > 1 && <GroupTable title="รายเดือน" groups={report.byMonth} label={monthLabel} keepOrder />}
        </div>

        <Card>
          <CardHeader title="รายการที่นับในรายงาน" description={`${report.rows.length} รายการ เรียงตามวันและเวลา`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm print:min-w-0 print:text-xs">
              <thead className="bg-surface-sunken text-xs text-ink-muted">
                <tr><th className="px-4 py-2.5 font-medium">วันที่ / เวลา</th><th className="px-4 py-2.5 font-medium">ห้อง</th><th className="px-4 py-2.5 font-medium">หัวข้อ</th><th className="px-4 py-2.5 font-medium">แผนก</th><th className="px-4 py-2.5 text-right font-medium">คน</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.rows.map((b) => <tr key={b.bookingId} className="break-inside-avoid">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatShortDate(b.dateKey)}<br /><span className="text-ink-muted">{formatTimeRange(b.startMin, b.endMin)}</span></td>
                  <td className="px-4 py-2.5">{labels.room(b.roomId)}</td>
                  <td className="px-4 py-2.5">{b.title || '—'}<br /><span className="text-xs text-ink-muted">{labels.meetingType(b.meetingType ?? '')} · {BOOKING_STATUS_LABEL_TH[b.status]}</span></td>
                  <td className="px-4 py-2.5">{labels.department(b.department.trim())}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(b.attendees)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      </>}
    </div>
  </>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return <Card><CardBody className="p-4">
    <p className="text-sm text-ink-muted">{label}</p>
    <p className="mt-1 text-xl font-semibold tabular-nums text-ink sm:text-2xl">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-warn">{hint}</p>}
  </CardBody></Card>;
}

function GroupTable({ title, groups, label, keepOrder = false }: { title: string; groups: ReportGroup[]; label: (key: string) => string; keepOrder?: boolean }) {
  const max = Math.max(1, ...groups.map((g) => g.count));
  const rows = keepOrder ? groups : groups.filter((g) => g.count > 0);
  return <Card className="avoid-break">
    <CardHeader title={title} />
    <table className="w-full text-sm">
      <thead className="bg-surface-sunken text-xs text-ink-muted">
        <tr><th className="px-4 py-2 text-left font-medium">รายการ</th><th className="px-3 py-2 text-right font-medium">ครั้ง</th><th className="px-3 py-2 text-right font-medium">ชั่วโมง</th><th className="px-4 py-2 text-right font-medium">คน</th></tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((g) => <tr key={g.key}>
          <td className="px-4 py-2">
            <span className="block">{label(g.key)}</span>
            <span aria-hidden="true" className="mt-1 block h-1.5 rounded-full bg-surface-sunken"><span className="block h-full rounded-full bg-brand" style={{ width: `${(g.count / max) * 100}%` }} /></span>
          </td>
          <td className="px-3 py-2 text-right font-semibold tabular-nums">{g.count}</td>
          <td className="px-3 py-2 text-right tabular-nums">{formatNumber(Math.round(g.minutes / 6) / 10)}</td>
          <td className="px-4 py-2 text-right tabular-nums">{formatNumber(g.attendees)}</td>
        </tr>)}
      </tbody>
    </table>
  </Card>;
}
