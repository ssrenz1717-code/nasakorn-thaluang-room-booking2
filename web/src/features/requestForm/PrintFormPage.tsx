import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileDown, Printer } from 'lucide-react';
import { BOOKING_STATUS_LABEL_TH } from '@shared/domain/status';
import { useApp } from '../../app/providers/AppProvider';
import { PageHeader } from '../../components/layout/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import type { DemoBooking, DemoRoom } from '../../lib/api/demo';
import { RequestFormSheet } from './RequestFormSheet';
import { ScaledSheet } from './ScaledSheet';

const dateText = (key: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(`${key}T12:00:00+07:00`));

/** แบบคำขอที่กรอกผ่านเว็บ แสดงและพิมพ์เป็นแบบฟอร์มของวิทยาลัย */
export function PrintFormPage() {
  const { api, token } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(searchParams.get('booking') || '');

  useEffect(() => {
    Promise.all([api.bookings(token), api.rooms(token)])
      .then(([b, r]) => {
        const sorted = [...b.bookings].sort((x, y) => y.dateKey.localeCompare(x.dateKey) || y.startMin - x.startMin);
        setBookings(sorted);
        setRooms(r.rooms);
        setSelected((current) => current || sorted[0]?.bookingId || '');
        setLoaded(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [api, token]);

  const booking = useMemo(() => bookings.find((item) => item.bookingId === selected), [bookings, selected]);
  const room = rooms.find((item) => item.roomId === booking?.roomId);
  const blankFormUrl = `${import.meta.env.BASE_URL}แบบคำขออนุญาตใช้ห้องประชุม-ต้นฉบับ.pdf`;

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="แบบคำขออนุญาตใช้ห้องประชุม"
          description="คำขอที่กรอกผ่านเว็บ พิมพ์ออกมาเป็นแบบฟอร์มของวิทยาลัย"
          action={<Button icon={<Printer className="size-4" />} onClick={() => window.print()} disabled={!booking}>พิมพ์แบบฟอร์ม</Button>}
        />
        {error && <Alert className="mb-4" tone="danger" title="โหลดข้อมูลไม่สำเร็จ">{error}</Alert>}
        <Card className="mb-5">
          <CardBody className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 basis-72">
              <span className="mb-1.5 block text-sm font-medium text-ink">คำขอที่จะแสดง</span>
              <select
                className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-[15px]"
                value={selected}
                onChange={(event) => { setSelected(event.target.value); setSearchParams(event.target.value ? { booking: event.target.value } : {}); }}
              >
                {bookings.map((item) => (
                  <option key={item.bookingId} value={item.bookingId}>
                    {dateText(item.dateKey)} {item.title || item.bookerName || item.userName} ({BOOKING_STATUS_LABEL_TH[item.status]})
                  </option>
                ))}
              </select>
            </label>
            <a href={blankFormUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-medium text-brand hover:bg-brand-soft">
              <FileDown className="size-4" aria-hidden="true" />แบบฟอร์มเปล่า (PDF)
            </a>
          </CardBody>
        </Card>
        {loaded && !bookings.length && (
          <Card><CardBody className="py-12 text-center">
            <p className="font-medium text-ink">ยังไม่มีคำขอ</p>
            <p className="mt-1 text-sm text-ink-muted">กรอกคำขอผ่านเว็บแล้วจะพิมพ์เป็นแบบฟอร์มได้ที่หน้านี้</p>
            <Link to="/book" className="mt-4 inline-flex min-h-11 items-center rounded-control bg-brand px-4 font-medium text-ink-inverse">กรอกคำขอใช้ห้อง</Link>
          </CardBody></Card>
        )}
      </div>
      {booking && (
        <div className="rounded-card bg-surface-sunken p-2 ring-1 ring-inset ring-line sm:p-6 print:bg-transparent print:p-0 print:ring-0">
          <ScaledSheet>
            <RequestFormSheet
              className="shadow-raised print:shadow-none"
              roomCode={room?.code ?? ''}
              roomName={room?.name}
              data={{ ...booking, bookerName: booking.bookerName || booking.userName }}
            />
          </ScaledSheet>
        </div>
      )}
    </>
  );
}
