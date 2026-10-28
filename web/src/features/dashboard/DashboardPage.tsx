import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  CalendarPlus,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  PlugZap,
  ShieldCheck,
  Timer,
  Users,
} from 'lucide-react';
import { BOOKING_STATUS_LABEL_TH } from '@shared/domain/status';
import { REQUEST_FACILITY_LABEL_TH, REQUEST_FACILITIES } from '@shared/schemas/booking';
import { formatTimeOfDay } from '@shared/time/bangkok';
import { toDateKey } from '@shared/time/bangkok';
import { useApp, useCurrentUser, useSettings } from '../../app/providers/AppProvider';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { CountUp } from '../../components/ui/CountUp';
import { useAnimatedNumber } from '../../lib/hooks/useAnimatedNumber';
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/hooks/useMediaQuery';
import { formatClockWithSeconds, formatDuration, formatFullDate, formatShortDate } from '../../lib/format/thai';
import type { DemoBooking, DemoRoom } from '../../lib/api/demo';

const WEEKDAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export function DashboardPage() {
  const { api, isDemo, serverTime, dataVersion, token } = useApp();
  const user = useCurrentUser();
  const settings = useSettings();
  const isDesktop = useMediaQuery(DESKTOP_QUERY, true);

  const [pingState, setPingState] = useState<
    { status: 'idle' } | { status: 'busy' } | { status: 'done'; at: Date } | { status: 'failed'; message: string }
  >({ status: 'idle' });
  const [bookings,setBookings]=useState<DemoBooking[]>([]); const [rooms,setRooms]=useState<DemoRoom[]>([]);
  useEffect(()=>{Promise.all([api.bookings(token),api.rooms(token)]).then(([bookingResult,roomResult])=>{setBookings(bookingResult.bookings);setRooms(roomResult.rooms);}).catch(()=>undefined);},[api,token]);

  const today = toDateKey(new Date());

  const checkConnection = () => {
    setPingState({ status: 'busy' });
    api
      .ping()
      .then((result) => setPingState({ status: 'done', at: new Date(result.serverTime) }))
      .catch((error: unknown) =>
        setPingState({
          status: 'failed',
          message: error instanceof Error ? error.message : 'เชื่อมต่อไม่สำเร็จ',
        }),
      );
  };

  const bookableDays = settings.bookableWeekdays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day] ?? '?')
    .join(' ');

  const businessMinutes =
    Number(settings.businessHoursEnd.slice(0, 2)) * 60 +
    Number(settings.businessHoursEnd.slice(3, 5)) -
    (Number(settings.businessHoursStart.slice(0, 2)) * 60 +
      Number(settings.businessHoursStart.slice(3, 5)));

  const pendingCount=bookings.filter((booking)=>booking.status==='pending').length;
  const approvedCount=bookings.filter((booking)=>booking.status==='confirmed'||booking.status==='completed').length;
  const todayCount=bookings.filter((booking)=>booking.dateKey===today&&['pending','confirmed','completed'].includes(booking.status)).length;
  const roomStats=rooms.map((room)=>({room,count:bookings.filter((booking)=>booking.roomId===room.roomId&&['confirmed','completed'].includes(booking.status)).length})).sort((a,b)=>b.count-a.count);
  const facilityStats:{key:string;label:string;count:number}[]=[...REQUEST_FACILITIES.map((key)=>({key,label:REQUEST_FACILITY_LABEL_TH[key],count:bookings.filter((booking)=>booking.requestedFacilities?.includes(key)).length})),{key:'extra',label:'โต๊ะ/เก้าอี้เพิ่มเติม',count:bookings.filter((booking)=>(booking.extraFurnitureCount||0)>0).length},{key:'other',label:'อุปกรณ์อื่น ๆ',count:bookings.filter((booking)=>Boolean(booking.otherFacility?.trim())).length}].sort((a,b)=>b.count-a.count);
  const latest=bookings.slice().sort((a,b)=>b.dateKey.localeCompare(a.dateKey)||b.startMin-a.startMin).slice(0,5);
  const donutColors=['#1686e8','#11ad81','#f59e0b','#8b5cf6','#e84393','#06b6d4','#a855f7','#64748b'];
  const facilityTotal=facilityStats.reduce((sum,item)=>sum+item.count,0);
  // สัดส่วนที่วาดไปแล้วของวงกลม 0 -> 1 เริ่มวนเมื่อมีข้อมูล
  const sweep=useAnimatedNumber(facilityTotal>0?1:0,{duration:1100});
  // ชิ้นในวงกลมที่กำลังชี้อยู่ (ชี้ที่วงหรือที่คำอธิบายก็ได้)
  const [activeFacility,setActiveFacility]=useState<string|null>(null);

  return (
    <>
      <section className="enter relative mb-4 overflow-hidden rounded-[20px] bg-brand-gradient px-5 py-5 text-ink-inverse shadow-raised sm:mb-6 sm:px-8 sm:py-7">
        {/* วงกลมตกแต่งด้านหลัง — ไม่มีความหมาย ซ่อนจากโปรแกรมอ่านหน้าจอ */}
        <span aria-hidden="true" className="absolute -right-12 -top-20 size-64 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -bottom-24 right-28 size-48 rounded-full bg-cyan-300/20" />
        <span aria-hidden="true" className="absolute -left-10 -bottom-16 size-40 rounded-full bg-sky-300/15" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold sm:text-3xl">ระบบจองห้องประชุมออนไลน์</h1>
            <p className="mt-1 text-sm text-white/85 sm:mt-1.5 sm:text-[15px]">{formatFullDate(today)}</p>
            <p className="text-sm text-white/85 sm:text-[15px]">วันนี้มีการใช้ห้อง {todayCount} รายการ</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isDemo && (
              <Button
            variant="secondary"
            icon={<PlugZap className="size-4" />}
            loading={pingState.status === 'busy'}
            loadingLabel="กำลังตรวจ"
            onClick={checkConnection}
          >
            ตรวจการเชื่อมต่อ
          </Button>
            )}
            <Link
              to="/book"
              className="hidden min-h-11 items-center gap-2 rounded-control bg-white px-4 text-[15px] font-semibold text-brand lg:inline-flex shadow-card transition-transform duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-white"
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              จองห้องประชุม
            </Link>
          </div>
        </div>
      </section>

      {pingState.status === 'done' && (
        <Alert tone="ok" title="เชื่อมต่อเซิร์ฟเวอร์ได้" className="mb-6">
          เวลาของเซิร์ฟเวอร์ {formatClockWithSeconds(pingState.at)} — ใช้เวลานี้ตัดสินทุกเรื่อง
          ไม่ใช่เวลาจากเครื่องคุณ
        </Alert>
      )}
      {pingState.status === 'failed' && (
        <Alert tone="danger" title="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" className="mb-6">
          {pingState.message}
        </Alert>
      )}

      <section aria-label="สรุปการจอง" className="enter-stagger mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:gap-4 xl:grid-cols-4">
        <SummaryCard icon={<CalendarClock className="size-5"/>} label="ใช้ห้องวันนี้" value={todayCount} caption="รายการ" tone="blue"/>
        <SummaryCard icon={<Clock className="size-5"/>} label="รออนุมัติ" value={pendingCount} caption="รายการ" tone="orange" link="/approvals"/>
        <SummaryCard icon={<CheckCircle2 className="size-5"/>} label="อนุมัติแล้ว" value={approvedCount} caption="รายการ" tone="green"/>
        <SummaryCard icon={<ClipboardList className="size-5"/>} label="รวมทั้งหมด" value={bookings.length} caption="รายการ" tone="purple"/>
      </section>

      <section className="enter-stagger mb-5 grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
        <Card><CardHeader title="สถิติการใช้ห้องประชุมแต่ละห้อง" description="จำนวนรายการที่ยืนยันแล้ว"/><CardBody><div className="group/bars flex h-40 items-end gap-3 overflow-x-auto border-b border-line px-2 pt-6 sm:h-52">{roomStats.map(({room,count},index)=><RoomBar key={room.roomId} name={room.name} count={count} percent={Math.max(5,count/(roomStats[0]?.count||1)*65)} color={donutColors[index%donutColors.length]!} index={index}/>)}{!roomStats.length&&<p className="m-auto text-sm text-ink-muted">ยังไม่มีข้อมูลห้องประชุม</p>}</div></CardBody></Card>
        <Card><CardHeader title="สถิติการขอใช้อุปกรณ์/สิ่งอำนวยความสะดวก" description="จากคำขอจองทั้งหมด"/><CardBody><div className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-5"><div className="relative mx-auto grid size-32 place-items-center sm:size-44"><FacilityDonut items={facilityStats} colors={donutColors} total={facilityTotal} sweep={sweep} active={activeFacility} onActive={setActiveFacility}/><div className="relative grid size-20 place-items-center rounded-full bg-surface text-center sm:size-28"><div><strong data-numeric className="block text-xl text-ink sm:text-2xl"><CountUp value={facilityTotal} duration={1100}/></strong><span className="block text-[11px] leading-tight text-ink-muted sm:text-xs">รายการ<br className="sm:hidden"/>อุปกรณ์</span></div></div></div><ul className="space-y-2">{facilityStats.map((item,index)=><li key={item.key} onMouseEnter={()=>setActiveFacility(item.key)} onMouseLeave={()=>setActiveFacility(null)} className={`${item.count===0?'hidden sm:flex':'flex'} -mx-2 items-center justify-between gap-3 rounded-lg px-2 py-0.5 text-sm transition-colors duration-150 ${activeFacility===item.key?'bg-neutral-soft font-semibold':''}`}><span className="flex min-w-0 items-center gap-2"><i className={`size-3 shrink-0 rounded-sm transition-transform duration-150 ${activeFacility===item.key?'scale-125':''}`} style={{backgroundColor:donutColors[index%donutColors.length]}}/><span className="truncate">{item.label}</span></span><strong data-numeric><CountUp value={item.count} duration={1100}/></strong></li>)}</ul></div></CardBody></Card>
      </section>

      <Card className="mb-5"><CardHeader title="รายการจองล่าสุด" description="รายการใหม่และรายการที่กำลังจะมาถึง" action={<Link className="inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline" to="/my-bookings">ดูทั้งหมด</Link>}/>
      <ul className="divide-y divide-line sm:hidden">{latest.slice(0,3).map((booking)=><li key={booking.bookingId} className="px-5 py-3">
        <div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate font-medium text-ink">{booking.bookerName||booking.userName}</span><Badge tone={booking.status==='confirmed'?'ok':booking.status==='pending'?'warn':booking.status==='rejected'?'danger':'neutral'}>{BOOKING_STATUS_LABEL_TH[booking.status]}</Badge></div>
        <div className="mt-0.5 flex items-center justify-between gap-3 text-sm text-ink-muted"><span className="min-w-0 truncate">{rooms.find((room)=>room.roomId===booking.roomId)?.name||'ห้องประชุม'}</span><span data-numeric className="shrink-0">{formatShortDate(booking.dateKey)} {formatTimeOfDay(booking.startMin)}</span></div>
      </li>)}{latest.length===0&&<li className="px-5 py-8 text-center text-sm text-ink-muted">ยังไม่มีรายการจอง</li>}</ul>
      <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-surface-sunken text-xs text-ink-muted"><tr><th className="px-4 py-3 font-medium">ห้องประชุม</th><th className="px-4 py-3 font-medium">ผู้จอง</th><th className="px-4 py-3 font-medium">วันที่ / เวลา</th><th className="px-4 py-3 font-medium">สถานะ</th></tr></thead><tbody className="divide-y divide-line">{latest.map((booking)=><tr key={booking.bookingId}><td className="px-4 py-3">{rooms.find((room)=>room.roomId===booking.roomId)?.name||'ห้องประชุม'}</td><td className="px-4 py-3">{booking.bookerName||booking.userName}</td><td className="whitespace-nowrap px-4 py-3">{formatShortDate(booking.dateKey)} {formatTimeOfDay(booking.startMin)}–{formatTimeOfDay(booking.endMin)}</td><td className="px-4 py-3"><Badge tone={booking.status==='confirmed'?'ok':booking.status==='pending'?'warn':booking.status==='rejected'?'danger':'neutral'}>{BOOKING_STATUS_LABEL_TH[booking.status]}</Badge></td></tr>)}{latest.length===0&&<tr><td colSpan={4} className="px-4 py-8 text-center text-ink-muted">ยังไม่มีรายการจอง</td></tr>}</tbody></table></div></Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* สถานะระบบ — มีความหมายเฉพาะตอนต่อเซิร์ฟเวอร์จริง */}
        {!isDemo && <Card>
          <CardHeader title="สถานะระบบ" />
          <CardBody className="space-y-3.5 text-sm">
            <Row label="การเชื่อมต่อ">
              {isDemo ? (
                <Badge tone="warn">โหมดสาธิต</Badge>
              ) : (
                <Badge tone="ok" icon={<CheckCircle2 className="size-3.5" />}>
                  เชื่อมต่อแล้ว
                </Badge>
              )}
            </Row>
            <Row label="สิทธิ์ของคุณ">
              <Badge tone="brand" icon={<ShieldCheck className="size-3.5" />}>
                {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}
              </Badge>
            </Row>
            <Row label="เวลาเซิร์ฟเวอร์ล่าสุด">
              <span data-numeric className="text-ink">
                {serverTime === null ? '—' : formatClockWithSeconds(serverTime)}
              </span>
            </Row>
            <Row label="รุ่นข้อมูล">
              <span data-numeric className="text-ink">
                {dataVersion}
              </span>
            </Row>
          </CardBody>
        </Card>}

        {/* กฎการจองที่ใช้อยู่จริง อ่านจากชีต Settings */}
        <Card className={isDemo ? 'lg:col-span-3' : 'lg:col-span-2'}>
          {/* มือถือพับไว้ก่อน (ข้อมูลอ้างอิง ไม่ได้ใช้ทุกครั้ง) จอคอมเปิดไว้ */}
          <details open={isDesktop} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">กฎการจองที่ใช้อยู่</span>
              <span className="mt-0.5 block text-sm text-ink-muted">ค่าทั้งหมดนี้อ่านจากการตั้งค่าในระบบ ผู้ดูแลแก้ได้ภายหลัง</span>
            </span>
            <ChevronDown className="size-5 shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <CardBody className="border-t border-line/70">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Fact
                icon={<Clock className="size-4" />}
                label="เวลาที่เปิดให้จอง"
                value={`${formatTimeOfDay(Number(settings.businessHoursStart.slice(0, 2)) * 60 + Number(settings.businessHoursStart.slice(3, 5)))} - ${settings.businessHoursEnd}`}
                hint={`รวม ${formatDuration(businessMinutes)} ต่อวัน`}
              />
              <Fact
                icon={<CalendarClock className="size-4" />}
                label="วันที่เปิดให้จอง"
                value={bookableDays}
              />
              <Fact
                icon={<Timer className="size-4" />}
                label="ความละเอียดของเวลา"
                value={`ทุก ${settings.slotMinutes} นาที`}
                hint={`จองได้ ${formatDuration(settings.minBookingMinutes)} ถึง ${formatDuration(settings.maxBookingMinutes)}`}
              />
              <Fact
                icon={<Users className="size-4" />}
                label="จองค้างได้สูงสุดต่อคน"
                value={`${settings.maxActiveBookingsPerUser} รายการ`}
              />
              <Fact
                icon={<CheckCircle2 className="size-4" />}
                label="ระบบอนุมัติ"
                value={settings.approvalRequired ? 'เปิด — ต้องรออนุมัติ' : 'ปิด — จองแล้วใช้ได้เลย'}
              />
              <Fact
                icon={<Clock className="size-4" />}
                label="แจ้งเตือนก่อนประชุม"
                value={`${settings.reminderLeadMinutes} นาที`}
                hint={
                  settings.cancelCutoffMinutes > 0
                    ? `ยกเลิกได้ก่อนเริ่ม ${settings.cancelCutoffMinutes} นาที`
                    : 'ยกเลิกได้จนถึงเวลาเริ่ม'
                }
              />
            </dl>
          </CardBody>
          </details>
        </Card>

      </div>
    </>
  );
}

/** แท่งกราฟที่โตขึ้นจาก 0 เหลื่อมเวลากันทีละแท่งให้ดูเป็นลำดับ */
/**
 * แท่งกราฟ: โตขึ้นจาก 0 ด้วย scaleY (transform ล้วน ไม่คำนวณหน้าใหม่ทุกเฟรม)
 * ชี้แล้วแท่งนั้นยกขึ้น ตัวเลขขยาย แท่งอื่นจางลง (ดู group/bars ที่กล่องแม่)
 */
function RoomBar({name,count,percent,color,index}:{name:string;count:number;percent:number;color:string;index:number}) {
  const delay=index*80;
  const grow=useAnimatedNumber(1,{duration:900,delay});
  return <div className="group/bar flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 transition-opacity duration-200 group-hover/bars:opacity-50 hover:opacity-100!" title={`${name}: ${count} รายการ`}>
    <span data-numeric className="text-sm font-semibold text-ink transition-transform duration-200 ease-out group-hover/bar:-translate-y-1.5 group-hover/bar:scale-125"><CountUp value={count} delay={delay}/></span>
    <div className="w-full max-w-14 transition-transform duration-200 ease-out group-hover/bar:-translate-y-1.5" style={{height:`${percent}%`}}>
      <div className="h-full w-full origin-bottom rounded-t-md shadow-sm transition-shadow duration-200 group-hover/bar:shadow-raised" style={{transform:`scaleY(${grow})`,backgroundColor:color}}/>
    </div>
    <span className="line-clamp-2 min-h-9 w-full text-center text-[11px] leading-4 text-ink-muted transition-colors duration-200 group-hover/bar:font-semibold group-hover/bar:text-ink">{name}</span>
  </div>;
}

/** กราฟวงกลมแบบ SVG: แต่ละสีเป็นชิ้นของตัวเอง จึงชี้ทีละชิ้นได้ (conic-gradient ทำไม่ได้) */
function FacilityDonut({items,colors,total,sweep,active,onActive}:{items:{key:string;count:number}[];colors:string[];total:number;sweep:number;active:string|null;onActive:(key:string|null)=>void}) {
  const radius=38; const circumference=2*Math.PI*radius;
  let cursor=0;
  return <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
    <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-neutral-soft)" strokeWidth="14"/>
    {total>0&&items.map((item,index)=>{
      if(item.count===0) return null;
      const length=item.count/total*circumference*sweep; const offset=cursor*sweep; cursor+=item.count/total*circumference;
      const isActive=active===item.key;
      return <circle key={item.key} cx="50" cy="50" r={radius} fill="none" stroke={colors[index%colors.length]} strokeWidth="14"
        strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-offset}
        onMouseEnter={()=>onActive(item.key)} onMouseLeave={()=>onActive(null)}
        className="cursor-pointer transition-[transform,opacity] duration-200 ease-out"
        style={{transformOrigin:'50px 50px',transform:isActive?'scale(1.08)':'scale(1)',opacity:active!==null&&!isActive?0.4:1}}/>;
    })}
  </svg>;
}


function SummaryCard({icon,label,value,caption,tone,link}:{icon:React.ReactNode;label:string;value:number;caption:string;tone:'blue'|'orange'|'green'|'purple';link?:string}) {
  // สีของการ์ดตรงกับความหมาย: รออนุมัติ=เหลือง อนุมัติแล้ว=เขียว ส่วนฟ้า/น้ำเงินเข้มเป็นสีตกแต่ง
  const styles={
    blue:{card:'from-sky-50 ring-sky-100',tile:'from-sky-500 to-blue-600 shadow-sky-500/30'},
    orange:{card:'from-amber-50 ring-amber-100',tile:'from-amber-400 to-orange-500 shadow-amber-500/30'},
    green:{card:'from-emerald-50 ring-emerald-100',tile:'from-emerald-500 to-teal-600 shadow-emerald-500/30'},
    purple:{card:'from-slate-50 ring-slate-200',tile:'from-blue-800 to-slate-900 shadow-slate-700/30'},
  }[tone];
  const content=<div className="flex items-center gap-3 p-3 sm:gap-3.5 sm:px-4 sm:py-4">
    <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-200 ease-out group-hover:-rotate-6 group-hover:scale-110 sm:size-12 ${styles.tile}`}>{icon}</span>
    <span className="min-w-0"><span className="block truncate text-xs font-medium text-ink-muted sm:text-sm">{label}</span><strong data-numeric className="block text-2xl font-semibold leading-tight text-ink sm:text-[1.75rem]"><CountUp value={value}/></strong><span className="hidden text-xs text-ink-subtle sm:inline">{caption}</span></span>
  </div>;
  const shell=`group lift block rounded-2xl bg-gradient-to-br to-white shadow-card ring-1 sm:rounded-[18px] ${styles.card}`;
  return link?<Link to={link} className={shell}>{content}</Link>:<div className={shell}>{content}</div>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-inner bg-brand-soft text-brand"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-sm text-ink-muted">{label}</dt>
        <dd data-numeric className="font-medium text-ink">
          {value}
        </dd>
        {hint !== undefined && <p className="text-xs text-ink-subtle">{hint}</p>}
      </div>
    </div>
  );
}
