import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FileText, X } from 'lucide-react';
import { BOOKING_STATUS_LABEL_TH } from '@shared/domain/status';
import { REQUEST_FACILITY_LABEL_TH, type RequestFacility } from '@shared/schemas/booking';
import { isOpenLocationRoom } from '@shared/schemas/room';
import type { DemoBooking, DemoRoom } from '../../lib/api/demo';
import { ApprovalProgress } from '../approvals/ApprovalProgress';

const dateText = (key: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeZone: 'Asia/Bangkok' }).format(new Date(`${key}T12:00:00+07:00`));
const timeText = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** รายละเอียดการจองเมื่อกดรายการบนปฏิทิน — ข้อมูลทั้งหมดมาจากแบบฟอร์มที่ผู้จองกรอก */
export function BookingDetailDialog({ booking, rooms, onClose }: { booking: DemoBooking; rooms: DemoRoom[]; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); trigger?.focus(); };
  }, [onClose]);

  const room = rooms.find((item) => item.roomId === booking.roomId);
  const place = isOpenLocationRoom(room) ? booking.customLocation || 'สถานที่อื่น' : room?.name ?? 'ห้องประชุม';
  const facilities = [
    ...(booking.requestedFacilities ?? []).map((key) => REQUEST_FACILITY_LABEL_TH[key as RequestFacility] ?? key),
    ...((booking.extraFurnitureCount ?? 0) > 0 ? [`โต๊ะ/เก้าอี้เพิ่ม ${booking.extraFurnitureCount} ตัว`] : []),
    ...(booking.otherFacility ? [booking.otherFacility] : []),
  ];
  const rows: [string, string][] = [
    ['ห้อง / สถานที่', place],
    ['วันที่', dateText(booking.dateKey)],
    ['เวลา', `${timeText(booking.startMin)}–${timeText(booking.endMin)} น.`],
    ['ผู้จอง', `${booking.bookerName || booking.userName}${booking.requesterPosition ? ` (${booking.requesterPosition})` : ''}`],
    ['หน่วยงาน', booking.department || '—'],
    ['โทรศัพท์', booking.requesterPhone || '—'],
    ['ผู้เข้าร่วม', `${booking.attendees} คน`],
    ...(facilities.length ? [['อุปกรณ์ที่ขอใช้', facilities.join(', ')] as [string, string]] : []),
    ...(booking.note ? [['รายละเอียดเพิ่มเติม', booking.note] as [string, string]] : []),
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 grid items-end bg-ink/40 sm:place-items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-surface shadow-overlay motion-safe:animate-[rise_220ms_var(--ease-out)_both] sm:max-w-lg sm:rounded-card">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ok">{BOOKING_STATUS_LABEL_TH[booking.status]}</p>
            <h2 id="booking-detail-title" className="text-lg font-semibold text-ink">{booking.title || 'การจองห้องประชุม'}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="ปิดรายละเอียด" className="grid size-10 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft hover:text-ink">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <dl className="space-y-2.5 px-5 py-4 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-line px-5 py-4">
          <p className="mb-2 text-sm font-medium text-ink">การอนุมัติ</p>
          <ApprovalProgress booking={booking} />
        </div>
        <footer className="flex justify-end border-t border-line px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Link to={`/reports?booking=${booking.bookingId}`} className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-medium text-brand ring-1 ring-brand-border hover:bg-brand-soft">
            <FileText className="size-4" aria-hidden="true" />ดูแบบฟอร์มคำขอ
          </Link>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
