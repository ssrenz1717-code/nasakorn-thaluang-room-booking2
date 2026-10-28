import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Printer, X } from 'lucide-react';
import { BOOKING_STATUS_LABEL_TH } from '@shared/domain/status';
import { REQUEST_FACILITIES, REQUEST_FACILITY_LABEL_TH } from '@shared/schemas/booking';
import { useApp, useCurrentUser } from '../app/providers/AppProvider';
import { PageHeader } from '../components/layout/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import type { DemoBooking, DemoRoom } from '../lib/api/demo';

const dateText=(key:string)=>new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'Asia/Bangkok'}).format(new Date(`${key}T12:00:00+07:00`));
const timeText=(min:number)=>`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;

export function ApprovalsPage() {
  const {api,token}=useApp(); const user=useCurrentUser(); const [bookings,setBookings]=useState<DemoBooking[]>([]); const [rooms,setRooms]=useState<DemoRoom[]>([]); const [reasonId,setReasonId]=useState(''); const [reason,setReason]=useState(''); const [busyId,setBusyId]=useState(''); const [error,setError]=useState(''); const [notice,setNotice]=useState('');
  const load=()=>Promise.all([api.bookings(token),api.rooms(token)]).then(([b,r])=>{setBookings(b.bookings);setRooms(r.rooms);}).catch((e:Error)=>setError(e.message));
  useEffect(()=>{void load();},[api,token]);
  const pending=bookings.filter((booking)=>booking.status==='pending').sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.startMin-b.startMin);
  const decide=async(bookingId:string,decision:'approve'|'reject')=>{setBusyId(bookingId);setError('');try{await api.decideBooking(token,bookingId,decision,decision==='reject'?reason:'');setNotice(decision==='approve'?'อนุมัติคำขอแล้ว':'ไม่อนุมัติคำขอแล้ว');setReasonId('');setReason('');await load();}catch(e){setError(e instanceof Error?e.message:'บันทึกผลการพิจารณาไม่สำเร็จ');}finally{setBusyId('');}};
  if(user.role!=='admin')return <Alert tone="danger" title="ไม่มีสิทธิ์เข้าถึง">หน้านี้สำหรับผู้ดูแลระบบ</Alert>;
  return <><PageHeader title="อนุมัติการใช้ห้องประชุม" description={`มีคำขอรอพิจารณา ${pending.length} รายการ`}/>
    {error&&<Alert className="mb-4" tone="danger" title="เกิดข้อผิดพลาด">{error}</Alert>}{notice&&<Alert className="mb-4" tone="ok" title="บันทึกแล้ว">{notice}</Alert>}
    {pending.length?<div className="space-y-4">{pending.map((booking)=><Card key={booking.bookingId}><CardHeader title={booking.bookerName||booking.userName} description={`${rooms.find((room)=>room.roomId===booking.roomId)?.name||'ห้องประชุม'} · ${dateText(booking.dateKey)} · ${timeText(booking.startMin)}–${timeText(booking.endMin)}`} action={<span className="rounded-full bg-warn-soft px-3 py-1 text-xs font-medium text-warn">รออนุมัติ</span>}/><CardBody><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-ink-muted">หน่วยงาน</p><p className="font-medium">{booking.department||'ไม่ระบุหน่วยงาน'}</p></div><div><p className="text-xs text-ink-muted">จำนวนผู้เข้าร่วม</p><p className="font-medium">{booking.attendees} คน</p><p className="text-sm text-ink-muted">{booking.note||'ไม่มีรายละเอียดเพิ่มเติม'}</p></div></div>
      <div className="mt-4 flex flex-wrap gap-2">{booking.requestedFacilities?.map((key)=><span key={key} className="rounded-md bg-brand-soft px-2.5 py-1 text-xs text-brand">{REQUEST_FACILITY_LABEL_TH[key as keyof typeof REQUEST_FACILITY_LABEL_TH]}</span>)}{(booking.extraFurnitureCount||0)>0&&<span className="rounded-md bg-brand-soft px-2.5 py-1 text-xs text-brand">โต๊ะ/เก้าอี้เพิ่ม {booking.extraFurnitureCount} ตัว</span>}{booking.otherFacility&&<span className="rounded-md bg-brand-soft px-2.5 py-1 text-xs text-brand">{booking.otherFacility}</span>}</div>
      {reasonId===booking.bookingId&&<div className="mt-4"><label className="mb-1 block text-sm font-medium" htmlFor={`reject-${booking.bookingId}`}>เหตุผลที่ไม่อนุมัติ</label><textarea id={`reject-${booking.bookingId}`} autoFocus required className="min-h-20 w-full rounded-control border border-line bg-surface px-3 py-2 text-sm" value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="แจ้งเหตุผลให้ผู้ขอทราบ"/></div>}
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">{reasonId===booking.bookingId?<><Button variant="secondary" onClick={()=>{setReasonId('');setReason('');}}>กลับ</Button><Button variant="danger" loading={busyId===booking.bookingId} disabled={!reason.trim()} icon={<X className="size-4"/>} onClick={()=>void decide(booking.bookingId,'reject')}>ยืนยันไม่อนุมัติ</Button></>:<><Button variant="secondary" disabled={Boolean(busyId)} onClick={()=>setReasonId(booking.bookingId)}>ไม่อนุมัติ</Button><Button loading={busyId===booking.bookingId} disabled={Boolean(busyId)} icon={<Check className="size-4"/>} onClick={()=>void decide(booking.bookingId,'approve')}>อนุมัติ</Button></>}</div>
    </CardBody></Card>)}</div>:<Card><CardBody className="py-14 text-center"><Check className="mx-auto size-9 text-ok"/><h2 className="mt-3 font-semibold">ไม่มีคำขอค้างอนุมัติ</h2><p className="mt-1 text-sm text-ink-muted">คำขอจองใหม่จะแสดงที่หน้านี้</p><Link to="/calendar" className="mt-4 inline-flex text-sm font-medium text-brand hover:underline">ดูปฏิทินการจอง</Link></CardBody></Card>}
  </>;
}

export function PrintFormPage() {
  const {api,token}=useApp();const [searchParams,setSearchParams]=useSearchParams();const [bookings,setBookings]=useState<DemoBooking[]>([]);const [rooms,setRooms]=useState<DemoRoom[]>([]);const [error,setError]=useState('');
  const [selected,setSelected]=useState(searchParams.get('booking')||'');
  const [templateMode,setTemplateMode]=useState<'filled'|'original'>('original');
  useEffect(()=>{Promise.all([api.bookings(token),api.rooms(token)]).then(([b,r])=>{setBookings(b.bookings);setRooms(r.rooms);setSelected((current)=>current||searchParams.get('booking')||b.bookings[0]?.bookingId||'');}).catch((e:Error)=>setError(e.message));},[api,token]);
  const booking=useMemo(()=>bookings.find((item)=>item.bookingId===selected),[bookings,selected]);
  const room=rooms.find((item)=>item.roomId===booking?.roomId);
  const print=()=>window.print();
  const originalFormUrl=`${import.meta.env.BASE_URL}แบบคำขออนุญาตใช้ห้องประชุม-ต้นฉบับ.pdf`;
  return <><div className="no-print"><PageHeader title="พิมพ์แบบฟอร์ม A4" description="ใช้แบบฟอร์ม PDF ต้นฉบับ หรือพิมพ์สำเนาที่เติมข้อมูลจากรายการจองแล้ว" action={templateMode==='filled'?<Button variant="secondary" icon={<Printer className="size-4"/>} onClick={print} disabled={!booking}>พิมพ์ข้อมูลการจอง</Button>:<a className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand px-4 font-medium text-ink-inverse shadow-card hover:bg-brand-hover" href={originalFormUrl} target="_blank" rel="noreferrer"><Printer className="size-4"/>เปิด/พิมพ์ PDF ต้นฉบับ</a>}/>
    {error&&<Alert className="mb-4" tone="danger" title="โหลดข้อมูลไม่สำเร็จ">{error}</Alert>}
    <Card className="mb-5"><CardBody className="flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1"><span className="mb-1.5 block text-sm font-medium">รายการจอง</span><select className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm" value={selected} onChange={(event)=>{setSelected(event.target.value);setSearchParams(event.target.value?{booking:event.target.value}:{});}}><option value="">เลือกรายการจอง</option>{bookings.map((item)=><option key={item.bookingId} value={item.bookingId}>{dateText(item.dateKey)} · {item.bookerName||item.userName} ({BOOKING_STATUS_LABEL_TH[item.status]})</option>)}</select></label><div className="flex rounded-control bg-surface-sunken p-1" role="group" aria-label="รูปแบบแบบฟอร์ม"><button className={`rounded px-3 py-2 text-sm ${templateMode==='original'?'bg-surface font-medium text-ink shadow-card':'text-ink-muted'}`} aria-pressed={templateMode==='original'} onClick={()=>setTemplateMode('original')}>PDF ต้นฉบับ</button><button className={`rounded px-3 py-2 text-sm ${templateMode==='filled'?'bg-surface font-medium text-ink shadow-card':'text-ink-muted'}`} aria-pressed={templateMode==='filled'} onClick={()=>setTemplateMode('filled')}>กรอกข้อมูลแล้ว</button></div></CardBody></Card>
    {!bookings.length&&!error&&<Card><CardBody className="py-12 text-center text-sm text-ink-muted">ยังไม่มีรายการจองให้พิมพ์</CardBody></Card>}
  </div>
  {templateMode==='original'&&<section className="no-print overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line"><iframe title="แบบคำขออนุญาตใช้ห้องประชุม PDF ต้นฉบับ" src={originalFormUrl} className="h-[78vh] min-h-[680px] w-full bg-white"/><p className="px-4 py-3 text-sm text-ink-muted">นี่คือไฟล์ PDF ต้นฉบับที่แนบมา เปิดหรือพิมพ์จากปุ่มด้านบนได้โดยตรง</p></section>}
  {booking&&templateMode==='filled'&&<article className="print-sheet mx-auto max-w-[210mm] rounded-card bg-white p-8 text-[13px] leading-6 text-black shadow-card ring-1 ring-line sm:p-10">
    <header className="mb-5 text-center"><p className="text-[11px]">แบบฟอร์ม</p><h1 className="text-xl font-bold">แบบคำขออนุญาตใช้ห้องประชุม</h1><p className="text-sm">วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</p><p className="mt-2 text-right text-xs">เขียนวันที่ ........................................................</p></header>
    <p>เรื่อง&nbsp;&nbsp; ขออนุญาตใช้ห้องประชุม</p><p>เรียน&nbsp;&nbsp; ผู้อำนวยการวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</p>
    <p className="mt-2">ข้าพเจ้า <span className="print-value">{booking.bookerName||booking.userName}</span> ตำแหน่ง <span className="print-value">{booking.requesterPosition||'........................................'}</span></p>
    <p>หน่วยงาน / สาขาวิชา <span className="print-value">{booking.department||'................................................'}</span> หมายเลขโทรศัพท์ <span className="print-value">{booking.requesterPhone||'............................'}</span></p>
    <p className="mt-2 font-semibold">มีความประสงค์ขออนุญาตใช้ห้องประชุม</p><p className="print-value">{room?.name||'........................................................'} ({room?.location||''})</p>
    <p className="mt-1">เพื่อใช้ในการดำเนินงาน เรื่อง <span className="print-value">{booking.title}</span></p>
    <p className="mt-1">กำหนดการใช้งานวันที่ <span className="print-value">{dateText(booking.dateKey)}</span> ตั้งแต่เวลา <span className="print-value">{timeText(booking.startMin)}</span> ถึง <span className="print-value">{timeText(booking.endMin)}</span> จำนวนผู้เข้าใช้ (โดยประมาณ) <span className="print-value">{booking.attendees}</span> คน</p>
    <p className="mt-2 font-semibold">ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวกที่ขอใช้</p><div className="grid grid-cols-2 gap-x-4">{REQUEST_FACILITIES.map((key)=><p key={key}>{booking.requestedFacilities?.includes(key)?'☑':'☐'}&nbsp;{REQUEST_FACILITY_LABEL_TH[key]}</p>)}<p>{(booking.extraFurnitureCount||0)>0?'☑':'☐'}&nbsp;โต๊ะ/เก้าอี้เพิ่มเติม จำนวน {booking.extraFurnitureCount||0} ตัว</p><p>{booking.otherFacility?'☑':'☐'}&nbsp;อื่น ๆ {booking.otherFacility||'........................................'}</p></div>
    {booking.note&&<p className="mt-2">รายละเอียดเพิ่มเติม: {booking.note}</p>}
    <p className="mt-3 border-t border-black pt-2 text-xs">ข้าพเจ้าขอรับรองว่าจะดูแลรักษาทรัพย์สินของทางราชการ และปฏิบัติตามระเบียบของวิทยาลัยทุกประการ</p>
    <div className="mt-5 grid grid-cols-2 border border-black text-center text-xs leading-5"><SignatureBlock title="ผู้ยื่นคำขอ" name={booking.bookerName||booking.userName}/><SignatureBlock title="หัวหน้างาน / ผู้รับรอง"/><SignatureBlock title="เจ้าหน้าที่ผู้ตรวจสอบห้อง" extra="□ พร้อมใช้งาน　□ ไม่พร้อมใช้งาน"/><SignatureBlock title="ผู้พิจารณา" extra="□ อนุมัติ　□ ไม่อนุมัติ"/></div>
    <p className="mt-1 text-xs">หมายเหตุ: ........................................................................................................................................................................</p>
  </article>}
  </>;
}

function SignatureBlock({title,name,extra}:{title:string;name?:string;extra?:string}) {return <section className="min-h-[34mm] border-b border-r border-black p-3 last:border-r-0"><h2 className="font-bold">{title}</h2><p className="mt-3">ลงชื่อ ........................................................</p>{name&&<p>({name})</p>}{extra&&<p>{extra}</p>}<p>วันที่ .............................................................</p></section>;}
