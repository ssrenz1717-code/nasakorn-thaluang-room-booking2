import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, DoorOpen, Search } from 'lucide-react';
import { toDateKey } from '@shared/time/bangkok';
import type { SystemSettings } from '@shared/schemas/settings';
import { TimeSelect } from '../components/ui/TimeSelect';
import { RoomAvailability } from '../components/ui/RoomAvailability';
import { useRoomAvailability } from '../lib/hooks/useRoomAvailability';
import { conflictingSlots, isEndBlocked, isStartBlocked } from '@shared/domain/availability';
import { ROOM_EQUIPMENT_LABEL_TH } from '@shared/schemas/room';
import { REQUEST_FACILITIES, REQUEST_FACILITY_LABEL_TH, type BookingRequest, type RequestFacility } from '@shared/schemas/booking';
import { useApp, useCurrentUser, useSettings } from '../app/providers/AppProvider';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import type { DemoBooking, DemoRoom } from '../lib/api/demo';
import { ROOM_BANDS } from './booking/roomBands';
import { adjustEndTime, asMinute, endTimeOptions, startTimeOptions, timeText } from './booking/timeOptions';
import { WeekTimeGrid, type SlotSelection } from './booking/WeekTimeGrid';

export { BookingPage } from './booking/BookingPage';

const inputClass = 'min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-ink';
const dateText = (key: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(new Date(`${key}T12:00:00+07:00`));
const dateKeyOf = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
const dateFromKey = (key: string) => new Date(`${key}T12:00:00Z`);
const shiftDate = (key: string, amount: number) => { const date=dateFromKey(key); date.setUTCDate(date.getUTCDate()+amount); return dateKeyOf(date); };

export function RoomsPage() {
  const { api, token } = useApp();
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.rooms(token).then(({ rooms: result }) => setRooms(result)).catch((e: Error) => setError(e.message)); }, [api, token]);
  return <>
    <PageHeader title="ห้องประชุม" description="เลือกห้องที่เหมาะกับจำนวนผู้เข้าร่วมและอุปกรณ์ที่ต้องใช้" action={<Link className="hidden min-h-11 items-center gap-2 rounded-control bg-brand-gradient lg:inline-flex px-4 font-medium text-ink-inverse shadow-brand hover:brightness-110" to="/book"><CalendarPlus className="size-4"/>จองห้อง</Link>} />
    {error && <Alert tone="danger" title="โหลดห้องไม่สำเร็จ">{error}</Alert>}
    <div className="enter-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rooms.map((room, index) => <Card key={room.roomId} className="lift overflow-hidden"><div aria-hidden="true" className={`relative h-20 bg-gradient-to-br ${ROOM_BANDS[index % ROOM_BANDS.length]} ${room.status === 'active' ? '' : 'grayscale'}`}><span className="absolute -right-6 -top-8 size-28 rounded-full bg-white/15"/><span className="absolute bottom-0 left-5 grid size-12 translate-y-1/2 place-items-center rounded-2xl bg-white text-brand shadow-raised"><DoorOpen className="size-6"/></span></div><CardBody className="p-5 pt-9">
      <div className="mb-4 flex items-start justify-end"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${room.status === 'active' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>{room.status === 'active' ? 'เปิดจอง' : 'ปิดปรับปรุง'}</span></div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{room.code}</p><h2 className="mt-1 text-lg font-semibold text-ink">{room.name}</h2><p className="mt-1 text-sm text-ink-muted">{room.location}</p><p className="mt-3 min-h-10 text-sm text-ink-muted">{room.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
      <p className="mt-4 border-t border-line pt-3 text-sm font-medium">รองรับ {room.capacity} คน</p><div className="mt-2 flex flex-wrap gap-1.5">{room.equipment.map((key) => <span key={key} className="rounded-md bg-surface-sunken px-2 py-1 text-xs text-ink-muted">{ROOM_EQUIPMENT_LABEL_TH[key]}</span>)}</div>
      {room.status === 'active' && <Link className="mt-5 inline-flex min-h-10 items-center font-medium text-brand hover:underline" to={`/book?room=${room.roomId}`}>จองห้องนี้ →</Link>}
    </CardBody></Card>)}</div>
    {!rooms.length && !error && <p className="py-12 text-center text-ink-muted">กำลังโหลดห้องประชุม…</p>}
  </>;
}

export function BookingsPage({ calendar = false }: { calendar?: boolean }) {
  const { api, token } = useApp(); const settings=useSettings(); const user = useCurrentUser(); const [bookings, setBookings] = useState<DemoBooking[]>([]); const [rooms, setRooms] = useState<DemoRoom[]>([]); const [day, setDay] = useState(toDateKey(new Date())); const [calendarMode, setCalendarMode] = useState<'month'|'week'>('week'); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busyId, setBusyId] = useState(''); const [draft,setDraft]=useState<{dateKey:string;startMin:number}|null>(null); const [selection,setSelection]=useState<SlotSelection|null>(null);
  const load = () => Promise.all([api.bookings(token), api.rooms(token)]).then(([b,r])=>{setBookings(b.bookings);setRooms(r.rooms);}).catch((e:Error)=>setError(e.message));
  useEffect(()=>{void load();},[api,token]);
  const rows = useMemo(()=>bookings.filter((b)=>calendar ? b.dateKey===day : b.userEmail===user.email).sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.startMin-b.startMin),[bookings,calendar,day,user.email]);
  const cancel = async (bookingId:string) => { setBusyId(bookingId); try { await api.cancelBooking(token,bookingId); setNotice('ยกเลิกรายการจองแล้ว'); await load(); } catch(e) { setError(e instanceof Error?e.message:'ยกเลิกไม่สำเร็จ'); } finally {setBusyId('');} };
  const createFromCalendar = async (values:Omit<BookingRequest,'department'|'equipment'>) => {
    setBusyId('create');setError('');
    try { await api.createBooking(token,{...values,department:user.department,equipment:[]});setDraft(null);setSelection(null);setNotice('จองห้องเรียบร้อยแล้ว');await load(); }
    catch(e){setError(e instanceof Error?e.message:'จองห้องไม่สำเร็จ');}
    finally{setBusyId('');}
  };
  return <><PageHeader title={calendar?'ปฏิทินการจอง':'รายการจองของฉัน'} description={calendar?'ดูตารางการใช้ห้องในวันที่เลือก':'ติดตามสถานะและจัดการรายการจองของคุณ'} action={<Link className="hidden min-h-11 items-center gap-2 rounded-control bg-brand-gradient lg:inline-flex px-4 font-medium text-ink-inverse shadow-brand hover:brightness-110" to="/book"><CalendarPlus className="size-4"/>จองห้อง</Link>}/>
    {(error||notice)&&!draft&&<Alert tone={error?'danger':'ok'} title={error?'เกิดข้อผิดพลาด':'เรียบร้อย'}>{error||notice}</Alert>}
    {calendar && <CalendarView bookings={bookings} rooms={rooms} day={day} mode={calendarMode} slotMinutes={settings.slotMinutes} selection={draft?selection:null} onDay={setDay} onMode={setCalendarMode} onCreateSlot={(dateKey,startMin)=>{setDraft({dateKey,startMin});setError('');}}/>}
    {calendar&&draft&&<CalendarBookingDialog draft={draft} rooms={rooms} settings={settings} busy={busyId==='create'} error={error} onClose={()=>{setDraft(null);setSelection(null);}} onTimeChange={setSelection} side={dateFromKey(draft.dateKey).getUTCDay()>=4?'left':'right'} onSubmit={createFromCalendar}/>}
    {!calendar && <div className="space-y-3">{rows.map((booking)=><Card key={booking.bookingId}><CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink">{booking.bookerName||booking.userName}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${booking.status==='confirmed'?'bg-ok-soft text-ok':booking.status==='pending'?'bg-warn-soft text-warn':'bg-neutral-soft text-ink-muted'}`}>{booking.status==='confirmed'?'ยืนยันแล้ว':booking.status==='pending'?'รออนุมัติ':booking.status==='cancelled'?'ยกเลิกแล้ว':booking.status}</span></div><p className="mt-1 text-sm text-ink-muted">{rooms.find((r)=>r.roomId===booking.roomId)?.name||'ห้องประชุม'} · {dateText(booking.dateKey)} · {timeText(booking.startMin)}–{timeText(booking.endMin)}</p><p className="mt-1 text-xs text-ink-subtle">{booking.attendees} คน</p></div>{['confirmed','pending'].includes(booking.status)&&(booking.userEmail===user.email||user.role==='admin')&&<Button variant="danger" size="sm" loading={busyId===booking.bookingId} onClick={()=>void cancel(booking.bookingId)}>ยกเลิก</Button>}</CardBody></Card>)}
    {!calendar&&!rows.length&&<Card><CardBody className="py-14 text-center"><Search className="mx-auto size-8 text-ink-subtle"/><p className="mt-3 font-medium text-ink">ยังไม่มีรายการจอง</p><p className="mt-1 text-sm text-ink-muted">เลือกห้องและเวลาที่สะดวกเพื่อสร้างรายการแรก</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-control bg-brand px-4 font-medium text-ink-inverse" to="/book">จองห้องประชุม</Link></CardBody></Card>}</div>}
  </>;
}

function CalendarView({bookings,rooms,day,mode,slotMinutes,selection,onDay,onMode,onCreateSlot}:{bookings:DemoBooking[];rooms:DemoRoom[];day:string;mode:'month'|'week';slotMinutes:number;selection:SlotSelection|null;onDay:(value:string)=>void;onMode:(value:'month'|'week')=>void;onCreateSlot:(dateKey:string,startMin:number)=>void}) {
  const anchor=dateFromKey(day); // ตารางเดือนต้องเริ่มที่วันอาทิตย์ของสัปดาห์ที่มีวันที่ 1 ไม่ใช่เริ่มที่วันที่ 1 เลย
  // (เดิมวันที่ 1 ถูกวางใต้ช่อง อา. เสมอ ทำให้ทั้งเดือนเลื่อนผิดวัน)
  const monthStart=dateKeyOf(new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth(),1)));
  const first=mode==='month' ? shiftDate(monthStart,-dateFromKey(monthStart).getUTCDay()):shiftDate(day,-anchor.getUTCDay());
  const count=mode==='month' ? 42 : 7; const dates=Array.from({length:count},(_,index)=>shiftDate(first,index));
  const heading=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric',timeZone:'UTC'}).format(anchor);
  const dayBookings=bookings.filter((booking)=>booking.dateKey===day).sort((a,b)=>a.startMin-b.startMin);
  const today=toDateKey(new Date());
  const goToPeriod=(direction:number)=>{if(mode==='week'){onDay(shiftDate(day,direction*7));return;}const next=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+direction,1));onDay(dateKeyOf(next));};
  return <div className="space-y-4">
    <Card><CardBody className="p-3 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1"><Button variant="ghost" size="sm" aria-label="ช่วงก่อนหน้า" onClick={()=>goToPeriod(-1)}><ChevronLeft className="size-4"/></Button><Button variant="ghost" size="sm" aria-label="ช่วงถัดไป" onClick={()=>goToPeriod(1)}><ChevronRight className="size-4"/></Button><h2 className="ml-2 text-lg font-semibold capitalize text-ink">{mode==='month'?heading:`${dateText(dates[0]!)} – ${dateText(dates[6]!)}`}</h2></div>
        <div className="flex items-center gap-2"><Button size="sm" variant="secondary" onClick={()=>onDay(today)}>วันนี้</Button><div className="flex rounded-control bg-surface-sunken p-1" role="group" aria-label="มุมมองปฏิทิน"><button className={`rounded px-3 py-1.5 text-sm ${mode==='month'?'bg-surface font-medium text-ink shadow-card':'text-ink-muted'}`} aria-pressed={mode==='month'} onClick={()=>onMode('month')}>เดือน</button><button className={`rounded px-3 py-1.5 text-sm ${mode==='week'?'bg-surface font-medium text-ink shadow-card':'text-ink-muted'}`} aria-pressed={mode==='week'} onClick={()=>onMode('week')}>สัปดาห์</button></div></div>
      </div>
      {mode==='week' ? <WeekTimeGrid dates={dates} bookings={bookings} rooms={rooms} selectedDay={day} today={today} slotMinutes={slotMinutes} selection={selection} onDay={onDay} onCreateSlot={onCreateSlot}/> : <div className="grid grid-cols-7 border-l border-t border-line" role="grid" aria-label={`ปฏิทิน ${heading}`}>
        {['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'].map((label)=><div key={label} role="columnheader" className="border-b border-r border-line bg-surface-sunken px-1 py-2 text-center text-xs font-semibold text-ink-muted sm:px-3">{label}</div>)}
        {dates.map((key)=>{const date=dateFromKey(key);const inMonth=date.getUTCMonth()===anchor.getUTCMonth();const items=bookings.filter((booking)=>booking.dateKey===key).sort((a,b)=>a.startMin-b.startMin);return <button key={key} role="gridcell" aria-selected={day===key} aria-label={`${dateText(key)} มี ${items.length} รายการจอง`} onClick={()=>onDay(key)} className={`min-h-14 border-b border-r border-line p-1 text-left sm:min-h-28 transition-colors hover:bg-brand-soft focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand sm:min-h-28 sm:p-2 ${day===key?'bg-brand-soft/70':''} ${mode==='month'&&!inMonth?'bg-surface-sunken/60 text-ink-subtle':''}`}><span className={`inline-grid size-7 place-items-center rounded-full text-sm ${key===today?'bg-brand font-semibold text-ink-inverse':''} ${day===key&&key!==today?'font-bold text-brand':''}`}>{date.getUTCDate()}</span>{items.length>0&&<span aria-hidden="true" className="mt-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-soft px-1 text-[11px] font-semibold text-brand sm:hidden">{items.length}</span>}<div className="mt-1 hidden space-y-1 sm:block">{items.slice(0,2).map((item)=><div key={item.bookingId} className={`truncate rounded px-1.5 py-1 text-[11px] leading-tight sm:text-xs ${item.status==='pending'?'bg-warn-soft text-warn':'bg-brand-soft text-brand'}`}><span className="font-semibold">{timeText(item.startMin)}</span><span className="hidden sm:inline"> {item.bookerName||item.userName}</span></div>)}{items.length>2&&<p className="px-1 text-[11px] text-ink-muted">+{items.length-2} รายการ</p>}</div></button>;})}
      </div>}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-muted"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-brand"/>ยืนยันแล้ว</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-warn"/>รออนุมัติ</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-ok"/>ช่วงที่กำลังเลือก</span></div>
    </CardBody></Card>
    <section aria-live="polite"><h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink"><CalendarDays className="size-4 text-brand"/>{dateText(day)} <span className="font-normal text-ink-muted">· {dayBookings.length} รายการ</span></h3>{dayBookings.length?<div className="space-y-2">{dayBookings.map((booking)=><Card key={booking.bookingId}><CardBody className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium text-ink">{timeText(booking.startMin)}–{timeText(booking.endMin)} · {booking.bookerName||booking.userName}</p><p className="mt-1 text-sm text-ink-muted">{rooms.find((room)=>room.roomId===booking.roomId)?.name||'ห้องประชุม'} · {booking.attendees} คน</p></div><span className="text-xs text-ink-muted">{booking.status==='pending'?'รออนุมัติ':booking.status==='confirmed'?'ยืนยันแล้ว':booking.status}</span></CardBody></Card>)}</div>:<Card><CardBody className="py-8 text-center text-sm text-ink-muted">ไม่มีรายการจองในวันนี้</CardBody></Card>}</section>
  </div>;
}

function CalendarBookingDialog({draft,rooms,settings,busy,error,onClose,onTimeChange,side,onSubmit}:{draft:{dateKey:string;startMin:number};rooms:DemoRoom[];settings:SystemSettings;busy:boolean;error:string;onClose:()=>void;onTimeChange:(value:SlotSelection)=>void;side:'left'|'right';onSubmit:(values:Omit<BookingRequest,'department'|'equipment'>)=>void}) {
  const activeRooms=rooms.filter((room)=>room.status==='active');
  const [roomId,setRoomId]=useState(activeRooms[0]?.roomId||'');
  const [dateKey,setDateKey]=useState(draft.dateKey);
  const [start,setStart]=useState(timeText(draft.startMin));
  const [end,setEnd]=useState(timeText(Math.min(draft.startMin+60,18*60)));
  const [bookerName,setBookerName]=useState(''); const [attendees,setAttendees]=useState('2'); const [note,setNote]=useState('');
  const [requestedFacilities,setRequestedFacilities]=useState<RequestFacility[]>([]); const [extraFurnitureCount,setExtraFurnitureCount]=useState('0'); const [otherFacility,setOtherFacility]=useState(''); const [termsAccepted,setTermsAccepted]=useState(false);
  useEffect(()=>{if(!roomId&&activeRooms.length)setRoomId(activeRooms[0]!.roomId);},[activeRooms,roomId]);
  const room=activeRooms.find((item)=>item.roomId===roomId);
  const { busy: busySlots, loading: checkingRoom } = useRoomAvailability(roomId, dateKey);
  const roomConflict = conflictingSlots({ startMin: asMinute(start), endMin: asMinute(end) }, busySlots).length > 0;
  const asMin=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
  // แจ้งปฏิทินด้านหลังให้ไฮไลต์ช่วงที่กำลังจองตามเวลาที่แก้ในหน้าต่างนี้
  useEffect(()=>{onTimeChange({dateKey,startMin:asMin(start),endMin:asMin(end)});},[dateKey,start,end]);
  return <div className={`fixed inset-0 z-50 grid place-items-center bg-ink/25 p-4 lg:px-10 ${side==='left'?'lg:justify-items-start':'lg:justify-items-end'}`} onMouseDown={(event)=>{if(event.target===event.currentTarget&&!busy)onClose();}} onKeyDown={(event)=>{if(event.key==='Escape'&&!busy)onClose();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="calendar-booking-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface shadow-overlay">
      <form onSubmit={(event)=>{event.preventDefault();onSubmit({dateKey,startMin:asMin(start),endMin:asMin(end),roomId,bookerName,title:'',attendees:Number(attendees),note,requesterPosition:'',requesterPhone:'',requestedFacilities,extraFurnitureCount:Number(extraFurnitureCount),otherFacility,termsAccepted});}}>
        <header className="flex items-start justify-between border-b border-line px-5 py-4"><div><h2 id="calendar-booking-title" className="text-lg font-semibold text-ink">จองห้องประชุม</h2><p className="mt-1 text-sm text-ink-muted">{dateText(dateKey)} · เริ่ม {start}</p></div><button type="button" aria-label="ปิดหน้าต่าง" onClick={onClose} className="grid size-10 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft">×</button></header>
        <div className="space-y-4 p-5">
          {error&&<Alert tone="danger" title="จองไม่สำเร็จ">{error}</Alert>}
                    <div><label className={labelClass} htmlFor="calendar-booker-name">ชื่อผู้จอง</label><input autoFocus className={inputClass} id="calendar-booker-name" required maxLength={100} autoComplete="name" value={bookerName} onChange={(event)=>setBookerName(event.target.value)} placeholder="ชื่อ-นามสกุล ผู้จอง"/></div>
          <div><label className={labelClass} htmlFor="calendar-room">ห้องประชุม</label><select className={inputClass} id="calendar-room" required value={roomId} onChange={(event)=>setRoomId(event.target.value)}>{activeRooms.map((item)=><option key={item.roomId} value={item.roomId}>{item.name} · {item.capacity} คน</option>)}</select>{room&&<p className="mt-1 text-xs text-ink-muted">{room.location} · จองได้ทุก {settings.slotMinutes} นาที</p>}</div>
          <div className="grid grid-cols-3 gap-3"><div><label className={labelClass} htmlFor="calendar-date">วันที่</label><input className={inputClass} id="calendar-date" type="date" required value={dateKey} onChange={(event)=>setDateKey(event.target.value)}/></div><div><label className={labelClass} htmlFor="calendar-start">เริ่ม</label><TimeSelect className={inputClass} id="calendar-start" value={start} options={startTimeOptions(settings)} isDisabled={(minute)=>isStartBlocked(minute,settings.minBookingMinutes,busySlots)} onChange={(value)=>{setStart(value);setEnd(timeText(adjustEndTime(settings,asMin(value),asMin(end),busySlots)));}}/></div><div><label className={labelClass} htmlFor="calendar-end">สิ้นสุด</label><TimeSelect className={inputClass} id="calendar-end" value={end} options={endTimeOptions(settings,asMin(start))} isDisabled={(minute)=>isEndBlocked(asMin(start),minute,busySlots)} onChange={setEnd}/></div></div>
          <div><label className={labelClass} htmlFor="calendar-attendees">ผู้เข้าร่วม</label><input className={inputClass} id="calendar-attendees" type="number" inputMode="numeric" required min="1" max={room?.capacity||1000} value={attendees} onChange={(event)=>setAttendees(event.target.value)}/></div>
          <RoomAvailability busy={busySlots} loading={checkingRoom} startMin={asMin(start)} endMin={asMin(end)} settings={settings} onPick={(startMin,endMin)=>{setStart(timeText(startMin));setEnd(timeText(endMin));}}/>
          <fieldset><legend className={labelClass}>ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวกที่ขอใช้</legend><div className="grid gap-2 sm:grid-cols-2">{REQUEST_FACILITIES.map((key)=><label key={key} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-control border border-line px-3 text-sm transition-colors duration-150 has-[:checked]:border-ok-border has-[:checked]:bg-ok-soft has-[:checked]:font-medium has-[:checked]:text-ok"><input type="checkbox" checked={requestedFacilities.includes(key)} onChange={()=>setRequestedFacilities((current)=>current.includes(key)?current.filter((item)=>item!==key):[...current,key])}/>{REQUEST_FACILITY_LABEL_TH[key]}</label>)}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className={labelClass} htmlFor="calendar-furniture">โต๊ะ/เก้าอี้เพิ่มเติม (ตัว)</label><input className={inputClass} id="calendar-furniture" type="number" inputMode="numeric" min="0" max="500" value={extraFurnitureCount} onChange={(event)=>setExtraFurnitureCount(event.target.value)}/></div><div><label className={labelClass} htmlFor="calendar-other">อุปกรณ์อื่น ๆ</label><input className={inputClass} id="calendar-other" maxLength={300} value={otherFacility} onChange={(event)=>setOtherFacility(event.target.value)}/></div></div></fieldset>
          <div><label className={labelClass} htmlFor="calendar-note">รายละเอียดเพิ่มเติม</label><textarea className={`${inputClass} min-h-20 py-2`} id="calendar-note" maxLength={1000} value={note} onChange={(event)=>setNote(event.target.value)}/></div>
          <label className="flex cursor-pointer items-start gap-2 rounded-control border border-line p-3 text-sm leading-5 text-ink-muted transition-colors duration-150 has-[:checked]:border-ok-border has-[:checked]:bg-ok-soft has-[:checked]:font-medium has-[:checked]:text-ok"><input className="mt-1" type="checkbox" required checked={termsAccepted} onChange={(event)=>setTermsAccepted(event.target.checked)}/><span>ข้าพเจ้าจะดูแลรักษาทรัพย์สินของทางราชการ และปฏิบัติตามระเบียบของวิทยาลัยทุกประการ</span></label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-4"><Button variant="secondary" onClick={onClose} disabled={busy}>ยกเลิก</Button><Button type="submit" loading={busy} loadingLabel="กำลังจอง" disabled={!roomId||!termsAccepted||asMin(end)<=asMin(start)||roomConflict}>ยืนยันการจอง</Button></footer>
      </form>
    </section>
  </div>;
}
