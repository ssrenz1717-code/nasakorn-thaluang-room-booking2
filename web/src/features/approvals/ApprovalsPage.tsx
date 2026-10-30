import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardCheck, Printer, X } from 'lucide-react';
import { APPROVAL_STEPS, currentApprovalStep, isAwaitingRole, stepForRole } from '@shared/domain/approval';
import { REQUEST_FACILITY_LABEL_TH, type RequestFacility } from '@shared/schemas/booking';
import { isOpenLocationRoom } from '@shared/schemas/room';
import { USER_ROLE_LABEL_TH } from '@shared/schemas/user';
import { useApp, useCurrentUser } from '../../app/providers/AppProvider';
import { PageHeader } from '../../components/layout/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import type { DemoBooking, DemoRoom } from '../../lib/api/demo';
import { ApprovalProgress } from './ApprovalProgress';

const dateText = (key: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeZone: 'Asia/Bangkok' }).format(new Date(`${key}T12:00:00+07:00`));
const timeText = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** ปุ่มอนุมัติบอกชัดว่ากดแล้วคำขอไปไหนต่อ */
const APPROVE_LABEL: Record<number, string> = {
  1: 'ห้องพร้อม ส่งต่อผู้รับรอง',
  2: 'รับรอง ส่งต่อผู้อนุมัติ',
  3: 'อนุมัติการใช้ห้อง',
};
const APPROVED_TOAST: Record<number, string> = {
  1: 'ตรวจห้องแล้ว ส่งต่อให้ผู้รับรองแล้ว',
  2: 'รับรองแล้ว ส่งต่อให้ผู้อนุมัติแล้ว',
  3: 'อนุมัติแล้ว ผู้จองใช้ห้องได้',
};

export function ApprovalsPage() {
  const { api, token } = useApp();
  const user = useCurrentUser();
  const toast = useToast();
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [reasonId, setReasonId] = useState('');
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => Promise.all([api.bookings(token), api.rooms(token)])
    .then(([b, r]) => { setBookings(b.bookings); setRooms(r.rooms); setLoaded(true); })
    .catch((e: Error) => setError(e.message)), [api, token]);
  useEffect(() => { void load(); }, [load]);

  const myStep = stepForRole(user.role);
  const isApprover = myStep > 0;
  if (!isApprover && user.role !== 'admin') {
    return <Alert tone="danger" title="ไม่มีสิทธิ์เข้าถึง">หน้านี้สำหรับผู้ลงนามอนุมัติและผู้ดูแลระบบ</Alert>;
  }

  const pending = bookings.filter((booking) => booking.status === 'pending')
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.startMin - b.startMin);
  const mine = isApprover ? pending.filter((booking) => isAwaitingRole(booking, user.role)) : [];
  const others = pending.filter((booking) => !mine.includes(booking));

  const decide = async (booking: DemoBooking, decision: 'approve' | 'reject') => {
    const step = currentApprovalStep(booking);
    setBusyId(booking.bookingId);
    setError('');
    try {
      await api.decideBooking(token, booking.bookingId, decision, decision === 'reject' ? reason : '');
      toast.success(decision === 'approve' ? APPROVED_TOAST[step] ?? 'บันทึกแล้ว' : 'บันทึกผลไม่อนุมัติแล้ว แจ้งผู้จองในรายการจองของเขา');
      setReasonId('');
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกผลการพิจารณาไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  };

  const stepInfo = APPROVAL_STEPS[myStep - 1];
  const description = isApprover && stepInfo
    ? `คุณเป็น${USER_ROLE_LABEL_TH[user.role]} (ขั้นที่ ${myStep} ${stepInfo.action}) — มีคำขอรอคุณ ${mine.length} รายการ`
    : `ภาพรวมคำขอที่อยู่ระหว่างอนุมัติ ${pending.length} รายการ — การลงนามทำโดยผู้ลงนามแต่ละขั้นเท่านั้น`;

  return (
    <>
      <PageHeader title="อนุมัติการใช้ห้องประชุม" description={description} />
      {error && <Alert className="mb-4" tone="danger" title="บันทึกไม่สำเร็จ">{error}</Alert>}

      {isApprover && (
        <section aria-labelledby="mine-title" className="mb-8">
          <h2 id="mine-title" className="mb-3 text-base font-semibold text-ink">รอคุณลงนาม</h2>
          {mine.length ? (
            <div className="space-y-4">
              {mine.map((booking) => (
                <RequestCard key={booking.bookingId} booking={booking} rooms={rooms}>
                  {reasonId === booking.bookingId && (
                    <div className="mt-4">
                      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor={`reject-${booking.bookingId}`}>เหตุผลที่ไม่อนุมัติ</label>
                      <textarea id={`reject-${booking.bookingId}`} autoFocus required className="min-h-20 w-full rounded-control border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-danger focus:ring-2 focus:ring-danger/20" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="แจ้งเหตุผลให้ผู้ขอทราบ เช่น ห้องมีกิจกรรมของวิทยาลัย" />
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                    {reasonId === booking.bookingId ? (
                      <>
                        <Button variant="secondary" onClick={() => { setReasonId(''); setReason(''); }}>กลับ</Button>
                        <Button variant="danger" loading={busyId === booking.bookingId} disabled={!reason.trim()} icon={<X className="size-4" />} onClick={() => void decide(booking, 'reject')}>ยืนยันไม่อนุมัติ</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" disabled={Boolean(busyId)} onClick={() => setReasonId(booking.bookingId)}>ไม่อนุมัติ</Button>
                        <Button loading={busyId === booking.bookingId} loadingLabel="กำลังบันทึก" disabled={Boolean(busyId)} icon={<Check className="size-4" />} onClick={() => void decide(booking, 'approve')}>
                          {APPROVE_LABEL[myStep]}
                        </Button>
                      </>
                    )}
                  </div>
                </RequestCard>
              ))}
            </div>
          ) : (
            loaded && (
              <Card><CardBody className="py-12 text-center">
                <ClipboardCheck className="mx-auto size-9 text-ok" aria-hidden="true" />
                <p className="mt-3 font-semibold text-ink">ไม่มีคำขอรอคุณลงนาม</p>
                <p className="mt-1 text-sm text-ink-muted">เมื่อขั้นก่อนหน้าผ่านแล้ว คำขอจะมาที่นี่และมีตัวเลขแจ้งบนเมนู</p>
              </CardBody></Card>
            )
          )}
        </section>
      )}

      <section aria-labelledby="others-title">
        <h2 id="others-title" className="mb-3 text-base font-semibold text-ink">{isApprover ? 'อยู่ระหว่างขั้นอื่น' : 'คำขอที่รออนุมัติ'}</h2>
        {others.length ? (
          <div className="space-y-3">
            {others.map((booking) => <RequestCard key={booking.bookingId} booking={booking} rooms={rooms} compact />)}
          </div>
        ) : (
          loaded && <p className="rounded-card bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted ring-1 ring-inset ring-line">ไม่มีคำขอค้างในขั้นอื่น <Link to="/calendar" className="font-medium text-brand hover:underline">ดูปฏิทินการจอง</Link></p>
        )}
      </section>
    </>
  );
}

function RequestCard({ booking, rooms, compact = false, children }: { booking: DemoBooking; rooms: DemoRoom[]; compact?: boolean; children?: React.ReactNode }) {
  const room = rooms.find((item) => item.roomId === booking.roomId);
  const place = isOpenLocationRoom(room) ? `${booking.customLocation || 'สถานที่อื่น'} (ระบุเอง)` : room?.name ?? 'ห้องประชุม';
  const facilities = [
    ...(booking.requestedFacilities ?? []).map((key) => REQUEST_FACILITY_LABEL_TH[key as RequestFacility] ?? key),
    ...((booking.extraFurnitureCount ?? 0) > 0 ? [`โต๊ะ/เก้าอี้เพิ่ม ${booking.extraFurnitureCount} ตัว`] : []),
    ...(booking.otherFacility ? [booking.otherFacility] : []),
  ];
  return (
    <Card>
      <CardBody className={compact ? 'p-4' : 'p-5'}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-ink-muted">{place}</p>
            <h3 className="text-[17px] font-semibold text-ink">{booking.title || 'ไม่ระบุเรื่อง'}</h3>
            <p className="mt-0.5 text-sm text-ink">{dateText(booking.dateKey)} เวลา {timeText(booking.startMin)}–{timeText(booking.endMin)} น.</p>
          </div>
          <Link to={`/reports?booking=${booking.bookingId}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            <Printer className="size-4" aria-hidden="true" />ดูแบบฟอร์ม
          </Link>
        </div>
        {!compact && (
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Info label="ผู้ขอใช้">{booking.bookerName || booking.userName}{booking.requesterPosition && ` (${booking.requesterPosition})`}</Info>
            <Info label="หน่วยงาน">{booking.department || '—'}</Info>
            <Info label="โทรศัพท์">{booking.requesterPhone || '—'}</Info>
            <Info label="ผู้เข้าร่วม">{booking.attendees} คน</Info>
            {facilities.length > 0 && <Info label="ขอใช้">{facilities.join(', ')}</Info>}
            {booking.note && <Info label="รายละเอียด">{booking.note}</Info>}
          </dl>
        )}
        <ApprovalProgress booking={booking} className="mt-4" />
        {children}
      </CardBody>
    </Card>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}
