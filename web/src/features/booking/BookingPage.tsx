import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AirVent, CalendarDays, Check, Clock3, DoorOpen, MapPin, Mic, Projector, Send, Users, Volume2, Wifi, type LucideIcon,
} from 'lucide-react';
import { businessWindow } from '@shared/domain/booking-rules';
import { conflictingSlots, isEndBlocked, isStartBlocked } from '@shared/domain/availability';
import { addDaysToDateKey, dayOfWeekOfDateKey, toDateKey, toMinutesOfDay } from '@shared/time/bangkok';
import { ROOM_EQUIPMENT_LABEL_TH, isOpenLocationRoom } from '@shared/schemas/room';
import { REQUEST_FACILITIES, REQUEST_FACILITY_LABEL_TH, type RequestFacility } from '@shared/schemas/booking';
import type { SystemSettings } from '@shared/schemas/settings';
import { useApp, useCurrentUser } from '../../app/providers/AppProvider';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { TimeSelect } from '../../components/ui/TimeSelect';
import { RoomAvailability } from '../../components/ui/RoomAvailability';
import { DayTimeline } from '../../components/ui/DayTimeline';
import { useRoomAvailability } from '../../lib/hooks/useRoomAvailability';
import { cn } from '../../lib/cn';
import type { DemoRoom } from '../../lib/api/demo';
import { ROOM_BANDS } from './roomBands';
import { adjustEndTime, asMinute, endTimeOptions, firstFreeStart, startTimeOptions, timeText } from './timeOptions';

const inputClass = 'min-h-11 w-full rounded-control border border-line bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-ink';

const FACILITY_ICON: Record<RequestFacility, LucideIcon> = {
  projector: Projector,
  soundSystem: Volume2,
  microphone: Mic,
  airConditioning: AirVent,
  internet: Wifi,
};

/** ปุ่มลัดความยาวการประชุม — ส่วนใหญ่ประชุมกันครึ่งชั่วโมงถึงสองชั่วโมง */
const DURATIONS = [30, 60, 90, 120];
const durationText = (minutes: number) =>
  minutes < 60 ? `${minutes} นาที` : `${minutes / 60 % 1 === 0 ? minutes / 60 : (minutes / 60).toFixed(1)} ชม.`;

const thaiDate = (key: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('th-TH', { ...options, timeZone: 'Asia/Bangkok' }).format(new Date(`${key}T12:00:00+07:00`));

/** วันที่จองได้ 7 วันถัดไป (ข้ามวันที่ไม่เปิดจอง และข้ามวันนี้ถ้าเลยเวลาที่ยังจองทัน) */
function upcomingBookableDays(today: string, nowMinute: number, settings: SystemSettings, count = 7): string[] {
  const { endMin } = businessWindow(settings);
  const days: string[] = [];
  for (let offset = 0; days.length < count && offset < 31; offset += 1) {
    const key = addDaysToDateKey(today, offset);
    if (!settings.bookableWeekdays.includes(dayOfWeekOfDateKey(key))) continue;
    if (offset === 0 && nowMinute + settings.minBookingMinutes > endMin) continue;
    days.push(key);
  }
  return days;
}

export function BookingPage() {
  const { api, token, settings } = useApp();
  const rules = settings!;
  const user = useCurrentUser();
  const nav = useNavigate();

  const today = toDateKey(new Date());
  const nowMinute = toMinutesOfDay(new Date());
  const days = useMemo(() => upcomingBookableDays(today, nowMinute, rules), [today, rules]);

  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [roomOrder, setRoomOrder] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [roomId, setRoomId] = useState(() => new URLSearchParams(window.location.search).get('room') || '');
  const [dateKey, setDateKey] = useState(days[0] ?? today);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [bookerName, setBookerName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState(user.department);
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [attendees, setAttendees] = useState('2');
  const [note, setNote] = useState('');
  const [requestedFacilities, setRequestedFacilities] = useState<RequestFacility[]>([]);
  const [extraFurnitureCount, setExtraFurnitureCount] = useState('0');
  const [otherFacility, setOtherFacility] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  // ผู้ใช้เลือกเวลาเองแล้ว ห้ามระบบเลื่อนให้อีก
  const timeTouched = useRef(false);

  useEffect(() => {
    api.rooms(token).then(({ rooms: data }) => {
      setRoomOrder(data.map((r) => r.roomId));
      const active = data.filter((r) => r.status === 'active');
      setRooms(active);
      setRoomId((current) => (active.some((r) => r.roomId === current) ? current : active[0]?.roomId || ''));
    }).catch((e: Error) => setError(e.message));
  }, [api, token]);

  const room = rooms.find((r) => r.roomId === roomId);
  // ห้อง "อื่น ๆ": ผู้ขอระบุสถานที่เอง ไม่มีการตรวจเวลาซ้อน
  const openLocation = isOpenLocationRoom(room);
  const band = (id: string) => ROOM_BANDS[Math.max(roomOrder.indexOf(id), 0) % ROOM_BANDS.length];
  const { busy: busySlots, loading: checkingRoom } = useRoomAvailability(roomId, dateKey);
  const startMin = asMinute(start);
  const endMin = asMinute(end);
  const roomConflict = conflictingSlots({ startMin, endMin }, busySlots).length > 0;

  // เปิดฟอร์มที่เวลาว่างแรกของวัน (และไม่ย้อนหลังถ้าเป็นวันนี้) แทนเวลาตายตัวที่อาจชนอยู่แล้ว
  useEffect(() => {
    if (timeTouched.current || checkingRoom || roomId === '') return;
    const first = firstFreeStart(rules, busySlots, dateKey === today ? nowMinute : 0);
    if (first === undefined) return;
    setStart(timeText(first));
    setEnd(timeText(adjustEndTime(rules, first, first + 60, busySlots)));
  }, [busySlots, checkingRoom, roomId, dateKey]);

  const chooseTime = (startValue: number, endValue: number) => {
    timeTouched.current = true;
    setStart(timeText(startValue));
    setEnd(timeText(endValue));
  };
  const changeStart = (value: string) => chooseTime(asMinute(value), adjustEndTime(rules, asMinute(value), endMin, busySlots));
  const durationAvailable = (minutes: number) =>
    endTimeOptions(rules, startMin).includes(startMin + minutes) && !isEndBlocked(startMin, startMin + minutes, busySlots);

  const capacity = room?.capacity ?? 0;
  const attendeeCount = Number(attendees) || 0;
  const overCapacity = room !== undefined && !openLocation && attendeeCount > capacity;
  const dayClosed = !rules.bookableWeekdays.includes(dayOfWeekOfDateKey(dateKey));

  const missing = [
    roomId === '' && 'เลือกห้อง',
    openLocation && customLocation.trim() === '' && 'ระบุสถานที่',
    roomConflict && 'เลือกเวลาที่ห้องว่าง',
    bookerName.trim() === '' && 'กรอกชื่อผู้จอง',
    position.trim() === '' && 'ตำแหน่ง',
    department.trim() === '' && 'หน่วยงาน',
    phone.trim() === '' && 'เบอร์โทร',
    title.trim() === '' && 'เรื่องที่ใช้ห้อง',
    !termsAccepted && 'ติ๊กยอมรับเงื่อนไข',
  ].filter((item): item is string => typeof item === 'string');
  const done = {
    room: roomId !== '' && (!openLocation || customLocation.trim() !== ''),
    time: !roomConflict && !dayClosed,
    booker: [bookerName, position, department, phone, title].every((value) => value.trim() !== '') && attendeeCount > 0 && !overCapacity,
    terms: termsAccepted,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createBooking(token, {
        bookerName, title, roomId, dateKey, startMin, endMin, attendees: attendeeCount,
        department, requesterPosition: position, requesterPhone: phone, note, equipment: [], customLocation: openLocation ? customLocation : '',
        requestedFacilities, extraFurnitureCount: Number(extraFurnitureCount), otherFacility, termsAccepted,
      });
      nav('/my-bookings', { state: { success: 'ส่งคำขอจองเรียบร้อยแล้ว' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="จองห้องประชุม" description="เลือกห้อง วัน และเวลา ระบบเช็กให้ทันทีว่าห้องว่างไหม" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <form id="booking-form" className="enter-stagger min-w-0 space-y-5" onSubmit={submit}>
          {error && <Alert tone="danger" title="จองไม่สำเร็จ">{error}</Alert>}

          <Section step={1} title="เลือกห้อง" hint="แตะการ์ดห้องที่ต้องการ" done={done.room}>
            <fieldset className="min-w-0">
              <legend className="sr-only">ห้องประชุม</legend>
              <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
                {rooms.map((item) => (
                  <label
                    key={item.roomId}
                    className="group relative flex w-[15.5rem] shrink-0 snap-start cursor-pointer flex-col overflow-hidden rounded-card border border-line bg-surface transition-[border-color,box-shadow,transform] duration-150 hover:border-brand-border active:scale-[0.98] has-[:checked]:border-brand has-[:checked]:shadow-raised has-[:checked]:ring-1 has-[:checked]:ring-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand sm:w-auto"
                  >
                    <input type="radio" name="room" value={item.roomId} checked={roomId === item.roomId} onChange={() => setRoomId(item.roomId)} className="sr-only" />
                    <span aria-hidden="true" className={`h-1.5 bg-gradient-to-r ${band(item.roomId)}`} />
                    <span className="flex items-start gap-3 p-3.5">
                      <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-ink-inverse ${band(item.roomId)}`}>
                        <DoorOpen className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{item.name}</span>
                        {item.location && <span className="block truncate text-xs text-ink-muted">{item.location}</span>}
                      </span>
                      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-transparent transition-colors duration-150 group-has-[:checked]:border-brand group-has-[:checked]:bg-brand group-has-[:checked]:text-ink-inverse">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    </span>
                    <span className="mt-auto flex items-center gap-1.5 px-3.5 pb-3 text-xs text-ink-muted">
                      {isOpenLocationRoom(item) ? <><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span>พิมพ์สถานที่ที่ต้องการเอง</span></> : <><Users className="size-3.5 shrink-0" aria-hidden="true" /><span className="shrink-0">รองรับประมาณ {item.capacity} คน</span></>}
                      {item.equipment.length > 0 && <span className="min-w-0 truncate">· มี{item.equipment.map((key) => ROOM_EQUIPMENT_LABEL_TH[key]).join(', ')}</span>}
                    </span>
                  </label>
                ))}
              </div>
              {rooms.length === 0 && !error && <p className="py-6 text-center text-sm text-ink-muted">กำลังโหลดห้องประชุม…</p>}
            </fieldset>
            {openLocation && (
              <div className="mt-4">
                <label className={labelClass} htmlFor="custom-location">ระบุสถานที่</label>
                <input className={inputClass} id="custom-location" required maxLength={200} value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} placeholder="เช่น ลานกิจกรรมหน้าอาคาร 2" />
                <p className="mt-1 text-xs text-ink-subtle">สถานที่อื่นไม่มีตารางในระบบ จึงไม่ตรวจเวลาซ้อนให้ ผู้อนุมัติจะตรวจสอบอีกครั้ง</p>
              </div>
            )}
          </Section>

          <Section step={2} title="วันและเวลา" hint={thaiDate(dateKey, { dateStyle: 'full' })} done={done.time}>
            <div className="flex items-baseline justify-between gap-3">
              <label className={labelClass} htmlFor="date">วันที่</label>
            </div>
            <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {days.map((key) => {
                const selected = key === dateKey;
                const label = key === today ? 'วันนี้' : key === addDaysToDateKey(today, 1) ? 'พรุ่งนี้' : thaiDate(key, { weekday: 'short' });
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    aria-label={thaiDate(key, { dateStyle: 'full' })}
                    onClick={() => setDateKey(key)}
                    className={cn(
                      'flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl py-2 transition-[background-color,box-shadow,transform] duration-150 active:scale-95',
                      selected ? 'bg-brand-gradient text-ink-inverse shadow-brand' : 'bg-surface text-ink ring-1 ring-inset ring-line hover:ring-brand-border',
                    )}
                  >
                    <span className={cn('text-xs', selected ? 'text-ink-inverse/85' : 'text-ink-muted')}>{label}</span>
                    <span className="text-xl font-semibold leading-7 tabular-nums">{thaiDate(key, { day: 'numeric' })}</span>
                    <span className={cn('text-[11px]', selected ? 'text-ink-inverse/85' : 'text-ink-subtle')}>{thaiDate(key, { month: 'short' })}</span>
                  </button>
                );
              })}
              <span
                className={cn(
                  'relative flex shrink-0 items-center gap-2 rounded-2xl px-3 ring-1 ring-inset transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                  days.includes(dateKey) ? 'ring-line text-ink-muted' : 'bg-brand-soft text-brand ring-brand',
                )}
              >
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                <input
                  id="date"
                  type="date"
                  required
                  min={today}
                  value={dateKey}
                  onChange={(e) => e.target.value && setDateKey(e.target.value)}
                  className="min-h-11 w-[8.5rem] bg-transparent text-sm text-inherit outline-none"
                />
              </span>
            </div>
            {dayClosed && (
              <p className="mt-2 text-sm font-medium text-warn">วันนี้ไม่เปิดให้จอง เลือกวันทำการอื่น</p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="start">เริ่ม</label>
                <TimeSelect className={inputClass} id="start" value={start} options={startTimeOptions(rules)} isDisabled={(minute) => isStartBlocked(minute, rules.minBookingMinutes, busySlots)} onChange={changeStart} />
              </div>
              <div>
                <label className={labelClass} htmlFor="end">สิ้นสุด</label>
                <TimeSelect className={inputClass} id="end" value={end} options={endTimeOptions(rules, startMin)} isDisabled={(minute) => isEndBlocked(startMin, minute, busySlots)} onChange={(value) => chooseTime(startMin, asMinute(value))} />
              </div>
            </div>
            <div role="group" aria-label="ความยาวการประชุม" className="mt-3 flex flex-wrap gap-2">
              {DURATIONS.map((minutes) => {
                const active = endMin - startMin === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    aria-pressed={active}
                    disabled={!durationAvailable(minutes)}
                    onClick={() => chooseTime(startMin, startMin + minutes)}
                    className={cn(
                      'min-h-9 rounded-pill px-3.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
                      active ? 'bg-brand text-ink-inverse' : 'bg-surface-sunken text-ink-muted ring-1 ring-inset ring-line hover:text-brand hover:ring-brand-border',
                    )}
                  >
                    {durationText(minutes)}
                  </button>
                );
              })}
            </div>

            {!openLocation && <><div className="mt-5">
              <DayTimeline
                busy={busySlots}
                startMin={startMin}
                endMin={endMin}
                settings={rules}
                conflict={roomConflict}
                onPickStart={(minute) => {
                  if (isStartBlocked(minute, rules.minBookingMinutes, busySlots)) return;
                  chooseTime(minute, adjustEndTime(rules, minute, minute + (endMin - startMin), busySlots));
                }}
              />
            </div>
            <div className="mt-4">
              <RoomAvailability busy={busySlots} loading={checkingRoom} startMin={startMin} endMin={endMin} settings={rules} onPick={chooseTime} />
            </div></>}
          </Section>

          <Section step={3} title="ข้อมูลผู้ขอใช้" hint="ตามแบบคำขออนุญาตใช้ห้องประชุม" done={done.booker}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="booker-name">ชื่อผู้จอง</label>
                <input className={inputClass} id="booker-name" required maxLength={100} autoComplete="name" value={bookerName} onChange={(e) => setBookerName(e.target.value)} placeholder="ชื่อ-นามสกุล ผู้จอง" />
              </div>
              <div>
                <label className={labelClass} htmlFor="position">ตำแหน่ง</label>
                <input className={inputClass} id="position" required maxLength={100} autoComplete="organization-title" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="เช่น ครู, หัวหน้าแผนกวิชา" />
              </div>
              <div>
                <label className={labelClass} htmlFor="department">หน่วยงาน / สาขาวิชา</label>
                <input className={inputClass} id="department" required maxLength={100} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="เช่น แผนกวิชาการบัญชี" />
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">หมายเลขโทรศัพท์</label>
                <input className={inputClass} id="phone" type="tel" inputMode="tel" required maxLength={30} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เช่น 081-234-5678" />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <div>
                <label className={labelClass} htmlFor="title">เพื่อใช้ในการดำเนินงาน เรื่อง</label>
                <input className={inputClass} id="title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ประชุมครูประจำแผนกวิชา" />
              </div>
              <div>
                <label className={labelClass} htmlFor="attendees">ผู้เข้าร่วม (คน)</label>
                <input className={cn(inputClass, overCapacity && 'border-warn')} id="attendees" type="number" inputMode="numeric" required min="1" max={capacity || 1000} value={attendees} onChange={(e) => setAttendees(e.target.value)} aria-describedby="attendees-hint" />
                <p id="attendees-hint" className={cn('mt-1 text-xs', overCapacity ? 'font-medium text-warn' : 'text-ink-subtle')}>
                  {room && !openLocation ? (overCapacity ? `เกินความจุห้อง (${capacity} คน)` : `ห้องนี้รับได้ประมาณ ${capacity} คน`) : 'จำนวนโดยประมาณ'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass} htmlFor="note">รายละเอียดเพิ่มเติม <span className="font-normal text-ink-subtle">(ถ้ามี)</span></label>
              <textarea className={cn(inputClass, 'min-h-24 py-2.5')} id="note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="วาระการประชุมหรือข้อมูลที่ต้องแจ้งผู้ดูแล" />
            </div>
          </Section>

          <Section step={4} title="อุปกรณ์และเงื่อนไข" hint="เลือกเฉพาะที่ต้องการให้เตรียม" done={done.terms}>
            <fieldset className="min-w-0">
              <legend className="sr-only">ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวกที่ขอใช้</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {REQUEST_FACILITIES.map((key) => {
                  const Icon = FACILITY_ICON[key];
                  return (
                    <label key={key} className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-control border border-line px-3 text-sm text-ink transition-colors duration-150 hover:border-ok-border has-[:checked]:border-ok-border has-[:checked]:bg-ok-soft has-[:checked]:font-medium has-[:checked]:text-ok has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ok">
                      <input type="checkbox" className="sr-only" checked={requestedFacilities.includes(key)} onChange={() => setRequestedFacilities((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))} />
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 leading-tight">{REQUEST_FACILITY_LABEL_TH[key]}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <div>
                <label className={labelClass} htmlFor="extra-furniture">โต๊ะ/เก้าอี้เพิ่ม (ตัว)</label>
                <input className={inputClass} id="extra-furniture" type="number" inputMode="numeric" min="0" max="500" value={extraFurnitureCount} onChange={(e) => setExtraFurnitureCount(e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="other-facility">อุปกรณ์อื่น ๆ</label>
                <input className={inputClass} id="other-facility" maxLength={300} value={otherFacility} onChange={(e) => setOtherFacility(e.target.value)} placeholder="ระบุเพิ่มเติมถ้ามี" />
              </div>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-control border border-line p-3.5 text-sm leading-6 text-ink-muted transition-colors duration-150 has-[:checked]:border-ok-border has-[:checked]:bg-ok-soft has-[:checked]:font-medium has-[:checked]:text-ok">
              <input className="mt-1" type="checkbox" required checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
              <span>ข้าพเจ้าจะดูแลรักษาทรัพย์สินของทางราชการ และปฏิบัติตามระเบียบของวิทยาลัยทุกประการ</span>
            </label>
          </Section>
        </form>

        <aside
          aria-label="สรุปการจอง"
          className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:top-6 lg:bottom-auto lg:mx-0 lg:overflow-hidden lg:rounded-card lg:border lg:bg-surface lg:p-0 lg:shadow-raised lg:backdrop-blur-none"
        >
          <div className="hidden lg:block">
            <div className={`relative overflow-hidden bg-gradient-to-br px-5 py-4 text-ink-inverse ${room ? band(room.roomId) : 'from-blue-700 to-blue-950'}`}>
              <span aria-hidden="true" className="absolute -right-8 -top-10 size-32 rounded-full bg-white/10" />
              <p className="text-sm text-ink-inverse/80">สรุปการจอง</p>
              <p className="mt-0.5 text-lg font-semibold leading-snug">{openLocation ? customLocation.trim() || 'สถานที่อื่น (ยังไม่ระบุ)' : room?.name ?? 'ยังไม่ได้เลือกห้อง'}</p>
              {title.trim() && <p className="mt-0.5 line-clamp-2 text-sm text-ink-inverse/85">เรื่อง {title.trim()}</p>}
            </div>
            <dl className="space-y-3 px-5 py-4 text-sm">
              <SummaryRow icon={CalendarDays} label="วันที่">{thaiDate(dateKey, { dateStyle: 'long' })}</SummaryRow>
              <SummaryRow icon={Clock3} label="เวลา">
                <span className={cn(roomConflict && 'text-danger')}>{start}–{end} น.</span>
                <span className="text-ink-muted"> ({durationText(endMin - startMin)})</span>
              </SummaryRow>
              <SummaryRow icon={Users} label="ผู้เข้าร่วม">
                <span className={cn(overCapacity && 'text-warn')}>{attendeeCount} คน</span>
                {room && !openLocation && <span className="text-ink-muted"> จาก {capacity} ที่นั่ง</span>}
              </SummaryRow>
              {requestedFacilities.length > 0 && (
                <SummaryRow icon={Projector} label="ขอใช้">
                  {requestedFacilities.map((key) => REQUEST_FACILITY_LABEL_TH[key]).join(', ')}
                </SummaryRow>
              )}
            </dl>
          </div>

          <p className="truncate text-sm font-medium text-ink lg:hidden">
            {room?.name ?? 'เลือกห้อง'} · {thaiDate(dateKey, { day: 'numeric', month: 'short' })} · <span className={cn(roomConflict && 'text-danger')}>{start}–{end} น.</span>
          </p>
          <p className={cn('mt-0.5 text-xs lg:mt-0 lg:border-t lg:border-line lg:px-5 lg:py-3', missing.length ? 'text-warn' : 'text-ok')}>
            {missing.length ? `ยังขาด: ${missing.join(' · ')}` : rules.approvalRequired ? 'พร้อมส่ง คำขอจะผ่านการอนุมัติ 3 ขั้น ติดตามได้ที่รายการจองของฉัน' : 'พร้อมส่ง ส่งแล้วได้ห้องทันที'}
          </p>
          <div className="mt-2 flex gap-3 lg:mt-0 lg:flex-col-reverse lg:gap-2 lg:px-5 lg:pb-5">
            <Button variant="secondary" onClick={() => nav(-1)}>กลับ</Button>
            <Button form="booking-form" className="flex-1" type="submit" icon={<Send className="size-4" aria-hidden="true" />} loading={busy} loadingLabel="กำลังบันทึก" disabled={!roomId || !termsAccepted || roomConflict}>
              ส่งคำขอจอง
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}

function Section({ step, title, hint, done, children }: { step: number; title: string; hint?: string; done: boolean; children: ReactNode }) {
  const id = `booking-step-${step}`;
  return (
    <section aria-labelledby={id} className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
      <header className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors duration-200',
            done ? 'bg-ok text-ink-inverse' : 'bg-brand-soft text-brand',
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : step}
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-base font-semibold text-ink">
            {title}
            {done && <span className="sr-only"> (เรียบร้อย)</span>}
          </h2>
          {hint && <p className="truncate text-sm text-ink-muted">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function SummaryRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-subtle">{label}</dt>
        <dd className="font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}
