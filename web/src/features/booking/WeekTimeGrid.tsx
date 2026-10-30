import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { DemoBooking, DemoRoom } from '../../lib/api/demo';
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/hooks/useMediaQuery';
import { cn } from '../../lib/cn';
import { layoutLanes } from './laneLayout';
import { timeText } from './timeOptions';
import { roomColorOf } from './roomBands';

const DAY_START = 8 * 60;
const DAY_END = 18 * 60;
const HOURS = (DAY_END - DAY_START) / 60;
/** มือถือ: ช่องต้องสูงพอให้นิ้วแตะ จึงคงที่และเลื่อนดูในกรอบ */
const MOBILE_HOUR_HEIGHT = 64;
/** จอคอม: ย่อ/ขยายให้ทั้งวันพอดีจอ แต่ไม่เตี้ยจนอ่านรายการไม่ออก */
const MIN_HOUR_HEIGHT = 40;
const MAX_HOUR_HEIGHT = 72;

const dateFromKey = (key: string) => new Date(`${key}T12:00:00Z`);
const dateText = (key: string) =>
  new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(new Date(`${key}T12:00:00+07:00`));

export interface SlotSelection {
  dateKey: string;
  startMin: number;
  endMin: number;
}

/** ความสูงต่อชั่วโมงที่ทำให้ 08:00–18:00 อยู่ในจอเดียว (นับจากใต้แถบด้านบนที่ติดหน้าจอ) */
function useFitHourHeight(headerRef: React.RefObject<HTMLDivElement | null>): number {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [hourHeight, setHourHeight] = useState(MOBILE_HOUR_HEIGHT);
  useLayoutEffect(() => {
    if (!isDesktop) {
      setHourHeight(MOBILE_HOUR_HEIGHT);
      return;
    }
    const fit = () => {
      const topbar = document.querySelector('header')?.getBoundingClientRect().height ?? 64;
      const header = headerRef.current?.getBoundingClientRect().height ?? 76;
      const available = window.innerHeight - topbar - header - 24;
      setHourHeight(Math.max(MIN_HOUR_HEIGHT, Math.min(MAX_HOUR_HEIGHT, Math.floor(available / HOURS))));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [isDesktop, headerRef]);
  return hourHeight;
}

export function WeekTimeGrid({
  dates, bookings, rooms, selectedDay, today, slotMinutes, selection, onDay, onCreateSlot, onOpenBooking,
}: {
  /** กดรายการจองเพื่อดูรายละเอียด */
  onOpenBooking: (booking: DemoBooking) => void;
  dates: string[];
  bookings: DemoBooking[];
  rooms: DemoRoom[];
  selectedDay: string;
  today: string;
  slotMinutes: number;
  /** ช่วงที่กำลังจอง (หน้าต่างจองเปิดอยู่) — ไฮไลต์สีเขียวให้เห็นว่าเลือกตรงไหน */
  selection: SlotSelection | null;
  onDay: (value: string) => void;
  onCreateSlot: (dateKey: string, startMin: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const hourHeight = useFitHourHeight(headerRef);
  const [hover, setHover] = useState<{ dateKey: string; startMin: number } | null>(null);
  const toY = (minute: number) => ((minute - DAY_START) / 60) * hourHeight;

  useEffect(() => {
    // จอกว้างพอแสดงครบ 7 วันอยู่แล้ว ไม่ต้องเลื่อน
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const target = scroller.querySelector<HTMLElement>(`[data-day="${selectedDay}"]`);
    if (!target) return;
    // วางวันที่เลือกเป็นช่องที่ 2 จากซ้าย ให้เห็นวันก่อนหน้า 1 วัน และช่องที่เห็นเต็มทุกช่อง
    const timeColumn = scroller.querySelector<HTMLElement>('[data-time-col]')?.offsetWidth ?? 64;
    scroller.scrollLeft = Math.max(0, target.offsetLeft - timeColumn - target.offsetWidth);
  }, [selectedDay, dates[0]]);

  const activeBookings = bookings.filter(
    (booking) => dates.includes(booking.dateKey) && ['confirmed', 'completed'].includes(booking.status) && booking.startMin < DAY_END && booking.endMin > DAY_START,
  );
  const slots = Array.from({ length: Math.ceil((DAY_END - DAY_START) / slotMinutes) }, (_, index) => DAY_START + index * slotMinutes);
  const columns = 'grid-cols-[48px_repeat(7,minmax(60px,1fr))] sm:grid-cols-[64px_repeat(7,minmax(118px,1fr))]';

  return (
    <div
      ref={scrollerRef}
      className="max-h-[70vh] snap-x snap-mandatory scroll-pl-12 overflow-auto rounded-lg border border-line sm:scroll-pl-16 lg:max-h-none"
      aria-label="ตารางเวลาในสัปดาห์"
      onMouseLeave={() => setHover(null)}
    >
      <div className="min-w-[468px] sm:min-w-[900px]">
        <div ref={headerRef} className={`sticky top-0 z-20 grid ${columns} border-b border-line bg-surface`}>
          <div data-time-col className="sticky left-0 z-10 flex items-end justify-center border-r border-line bg-surface pb-2 text-[10px] font-medium text-ink-subtle sm:text-[11px]">GMT+07</div>
          {dates.map((key) => {
            const date = dateFromKey(key);
            const weekday = new Intl.DateTimeFormat('th-TH', { weekday: 'long', timeZone: 'UTC' }).format(date);
            const weekdayShort = new Intl.DateTimeFormat('th-TH', { weekday: 'short', timeZone: 'UTC' }).format(date);
            return (
              <button
                key={key}
                data-day={key}
                onClick={() => onDay(key)}
                style={{ scrollSnapAlign: 'start' }}
                aria-pressed={selectedDay === key}
                className="flex min-h-16 flex-col items-center justify-center gap-1 border-r border-line last:border-r-0 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand sm:min-h-[72px]"
              >
                <span className={`text-xs sm:text-sm ${key === today ? 'font-semibold text-brand' : 'text-ink-muted'}`}>
                  <span className="sm:hidden">{weekdayShort}</span>
                  <span className="hidden sm:inline">{weekday}</span>
                </span>
                <span className={`grid size-8 place-items-center rounded-full text-base sm:size-9 sm:text-lg ${key === today ? 'bg-brand text-ink-inverse' : selectedDay === key ? 'bg-brand-soft font-semibold text-brand' : 'text-ink'}`}>
                  {date.getUTCDate()}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`grid ${columns}`} style={{ height: `${HOURS * hourHeight}px` }}>
          <div className="sticky left-0 z-[15] border-r border-line bg-surface">
            {Array.from({ length: HOURS + 1 }, (_, index) => {
              const shift = index === 0 ? 'translate-y-0.5' : index === HOURS ? '-translate-y-full' : '-translate-y-1/2';
              return (
                <div key={index} className={`absolute right-1.5 ${shift} text-[10px] font-medium tabular-nums text-ink-muted sm:right-2 sm:text-[11px]`} style={{ top: `${index * hourHeight}px` }}>
                  {String(index + 8).padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {dates.map((key) => {
            const dayBookings = activeBookings.filter((booking) => booking.dateKey === key);
            const lanes = layoutLanes(dayBookings.map((booking) => ({ id: booking.bookingId, startMin: booking.startMin, endMin: booking.endMin })));
            const picked = selection?.dateKey === key ? selection : null;
            const ghost = hover?.dateKey === key && !picked ? hover : null;
            return (
              <div
                key={key}
                className={cn('relative border-r border-line last:border-r-0', key === selectedDay && 'bg-brand-soft/20')}
                style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${hourHeight - 1}px, var(--color-line) ${hourHeight - 1}px, var(--color-line) ${hourHeight}px)` }}
              >
                {slots.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    aria-label={`จองวันที่ ${dateText(key)} เวลา ${timeText(minute)}`}
                    onClick={() => onCreateSlot(key, minute)}
                    onMouseEnter={() => setHover({ dateKey: key, startMin: minute })}
                    onFocus={() => setHover({ dateKey: key, startMin: minute })}
                    className="absolute inset-x-0 z-0 cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ok"
                    style={{ top: `${toY(minute)}px`, height: `${(Math.min(slotMinutes, DAY_END - minute) / 60) * hourHeight}px` }}
                  />
                ))}

                {ghost && (
                  // ชี้ตรงไหน เห็นเลยว่าจะได้ช่วงไหน (ยาว 1 ชั่วโมงตามค่าเริ่มต้นของหน้าต่างจอง)
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-1 z-[5] flex items-start gap-1 overflow-hidden rounded-md border border-dashed border-ok-border bg-ok-soft/80 px-1.5 py-0.5 text-[11px] font-semibold text-ok sm:text-xs"
                    style={{ top: `${toY(ghost.startMin) + 1}px`, height: `${(Math.min(60, DAY_END - ghost.startMin) / 60) * hourHeight - 2}px` }}
                  >
                    <Plus className="mt-px size-3 shrink-0" strokeWidth={3} />
                    {timeText(ghost.startMin)}
                  </div>
                )}

                {dayBookings.map((booking) => {
                  const clippedStart = Math.max(booking.startMin, DAY_START);
                  const clippedEnd = Math.min(booking.endMin, DAY_END);
                  const height = Math.max(((clippedEnd - clippedStart) / 60) * hourHeight - 4, 26);
                  const place = lanes.get(booking.bookingId) ?? { lane: 0, lanes: 1 };
                  const roomName = rooms.find((room) => room.roomId === booking.roomId)?.name;
                  const color = roomColorOf(rooms.map((room) => room.roomId), booking.roomId);
                  return (
                    <button
                      key={booking.bookingId}
                      onClick={(event) => { event.stopPropagation(); onDay(key); onOpenBooking(booking); }}
                      title={`${timeText(booking.startMin)}–${timeText(booking.endMin)} · ${booking.bookerName || booking.userName}${roomName ? ` · ${roomName}` : ''}${booking.status === 'pending' ? ' (รออนุมัติ)' : ''}`}
                      className={cn(
                        'absolute z-10 overflow-hidden rounded-md py-1 text-left text-[11px] leading-tight shadow-sm ring-1 ring-inset focus-visible:outline-2 focus-visible:outline-brand sm:text-xs',
                        // แบ่งช่องกับรายการอื่นแล้วแคบลง ลดขอบในให้ยังเห็นเวลาเริ่มเต็ม ๆ
                        place.lanes > 1 ? 'px-1' : 'px-1.5 sm:px-2',
                        // สีประจำห้อง (ดูซ้อนกันได้ว่าห้องไหน) — รออนุมัติใช้กรอบเส้นประแทนสี
                        color.soft, color.text,
                        booking.status === 'pending' ? 'border border-dashed border-current ring-0' : color.ring,
                      )}
                      style={{
                        top: `${toY(clippedStart) + 2}px`,
                        height: `${height}px`,
                        left: `calc(${(place.lane / place.lanes) * 100}% + 3px)`,
                        width: `calc(${100 / place.lanes}% - 6px)`,
                      }}
                    >
                      <span className={cn('block font-semibold tabular-nums', place.lanes > 2 ? 'overflow-hidden text-clip whitespace-nowrap' : 'truncate')}>
                        {timeText(booking.startMin)}
                        {place.lanes === 1 && <span className="hidden sm:inline">–{timeText(booking.endMin)}</span>}
                      </span>
                      <span className="block truncate">{booking.bookerName || booking.userName}</span>
                      {roomName && height > 52 && place.lanes < 3 && <span className="block truncate opacity-75">{roomName}</span>}
                    </button>
                  );
                })}

                {picked && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-1 z-[12] overflow-hidden rounded-md bg-ok px-1.5 py-1 text-[11px] leading-tight text-ink-inverse shadow-raised ring-2 ring-ok ring-offset-1 ring-offset-surface sm:px-2 sm:text-xs"
                    style={{ top: `${toY(Math.max(picked.startMin, DAY_START)) + 1}px`, height: `${Math.max(((Math.min(picked.endMin, DAY_END) - Math.max(picked.startMin, DAY_START)) / 60) * hourHeight - 2, 22)}px` }}
                  >
                    <span className="block truncate font-semibold tabular-nums">{timeText(picked.startMin)}–{timeText(picked.endMin)}</span>
                    <span className="block truncate">ช่วงที่เลือก</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
