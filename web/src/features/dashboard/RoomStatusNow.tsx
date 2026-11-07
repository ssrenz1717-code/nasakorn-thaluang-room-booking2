import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { liveRoomState, type DaySlot, type LiveRoomState } from '@shared/domain/room-status';
import { ROOM_STATUS_LABEL_TH, isOpenLocationRoom, type RoomStatus } from '@shared/schemas/room';
import { formatTimeOfDay, parseTimeOfDay, toDateKey, toMinutesOfDay } from '@shared/time/bangkok';
import { useApp, useSettings } from '../../app/providers/AppProvider';
import { Card, CardHeader } from '../../components/ui/Card';
import type { DemoRoom } from '../../lib/api/demo';
import { cn } from '../../lib/cn';

/** ประชุมที่จะเริ่มภายในกี่นาทีถือว่า "ใกล้เริ่ม" — ว่างอยู่แต่ไม่ควรเข้าไปใช้ยาว */
const SOON_MINUTES = 30;

function describe(state: LiveRoomState, roomStatus: RoomStatus, nowMin: number, closeMin: number): { text: string; tone: 'busy' | 'soon' | 'free' | 'closed' } {
  if (state.kind === 'closed') return { text: ROOM_STATUS_LABEL_TH[roomStatus], tone: 'closed' };
  if (state.kind === 'busy') return { text: `กำลังใช้ ถึง ${formatTimeOfDay(state.untilMin)}`, tone: 'busy' };
  if (state.nextStartMin === null) return { text: nowMin >= closeMin ? 'ว่าง · หลังเวลาทำการ' : 'ว่างตลอดวันที่เหลือ', tone: 'free' };
  if (state.nextStartMin - nowMin <= SOON_MINUTES) return { text: `ว่าง · มีประชุม ${formatTimeOfDay(state.nextStartMin)}`, tone: 'soon' };
  return { text: `ว่าง ถึง ${formatTimeOfDay(state.nextStartMin)}`, tone: 'free' };
}

const TONE_CLASS = {
  busy: 'bg-danger-soft text-danger',
  soon: 'bg-warn-soft text-warn',
  free: 'bg-ok-soft text-ok',
  closed: 'bg-neutral-soft text-ink-muted',
} as const;

/**
 * ห้องไหนกำลังใช้ / ว่างอยู่ตอนนี้ — นับเฉพาะรายการที่อนุมัติแล้ว
 * ข้อมูลมีแค่ห้องกับเวลา พนักงานทุกคนจึงเห็นได้ครบทุกห้อง โดยไม่เห็นว่าใครจองอะไร
 */
export function RoomStatusNow({ rooms, refreshKey }: { rooms: DemoRoom[]; refreshKey: number }) {
  const { api, token } = useApp();
  const settings = useSettings();
  const [slots, setSlots] = useState<DaySlot[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    api.roomSlotsToday(token).then((result) => setSlots(result.slots)).catch(() => setSlots((current) => current ?? []));
  }, [api, token, refreshKey]);
  // เดินนาฬิกาทุก 30 วินาที สถานะเปลี่ยนเองเมื่อถึงเวลาเริ่ม/เลิกประชุม
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  // ข้ามวันแล้วต้องขอช่วงเวลาของวันใหม่
  const today = toDateKey(now);
  const [loadedDay, setLoadedDay] = useState(today);
  useEffect(() => {
    if (today === loadedDay) return;
    setLoadedDay(today);
    api.roomSlotsToday(token).then((result) => setSlots(result.slots)).catch(() => undefined);
  }, [api, token, today, loadedDay]);

  const nowMin = toMinutesOfDay(now);
  const closeMin = parseTimeOfDay(settings.businessHoursEnd);
  const list = rooms.filter((room) => !isOpenLocationRoom(room)).map((room) => {
    const state = liveRoomState(room, slots ?? [], nowMin);
    return { room, state, ...describe(state, room.status, nowMin, closeMin) };
  });
  const busy = list.filter((item) => item.tone === 'busy').length;
  const free = list.filter((item) => item.tone === 'free' || item.tone === 'soon').length;

  return (
    <Card className="mb-5">
      <CardHeader
        title="สถานะห้องตอนนี้"
        description={slots === null ? 'กำลังโหลด…' : `เวลา ${formatTimeOfDay(nowMin)} น. · กำลังใช้ ${busy} ห้อง · ว่าง ${free} ห้อง`}
      />
      <ul className="grid border-t border-line sm:grid-cols-2 xl:grid-cols-4">
        {list.map(({ room, text, tone }) => (
          <li key={room.roomId} className="-mt-px flex min-h-14 items-center justify-between gap-3 border-t border-line px-5 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{room.name}</span>
              <span className="block text-xs text-ink-subtle">{room.code} · {room.capacity} คน</span>
            </span>
            {tone === 'free' || tone === 'soon'
              ? <Link to={`/book?room=${room.roomId}`} title={`จอง${room.name}`} className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-[filter] duration-150 hover:brightness-95', TONE_CLASS[tone])}>{text}</Link>
              : <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', TONE_CLASS[tone])}>{text}</span>}
          </li>
        ))}
        {list.length === 0 && <li className="px-5 py-6 text-center text-sm text-ink-muted sm:col-span-2 xl:col-span-4">ยังไม่มีห้องประชุม</li>}
      </ul>
    </Card>
  );
}
