import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
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
import { formatClockWithSeconds, formatDuration, formatFullDate, formatShortDate } from '../../lib/format/thai';
import type { DemoBooking, DemoRoom } from '../../lib/api/demo';

const WEEKDAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export function DashboardPage() {
  const { api, isDemo, serverTime, dataVersion, token } = useApp();
  const user = useCurrentUser();
  const settings = useSettings();

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
  let donutCursor=0;
  const donutStops=facilityStats.map((item,index)=>{const start=facilityTotal?donutCursor/facilityTotal*100*sweep:0;donutCursor+=item.count;const end=facilityTotal?donutCursor/facilityTotal*100*sweep:0;return `${donutColors[index%donutColors.length]} ${start}% ${end}%`;}).join(', ');

  return (
    <>
      <section className="enter relative mb-6 overflow-hidden rounded-[20px] bg-brand-gradient px-6 py-7 text-ink-inverse shadow-raised sm:px-8">
        {/* วงกลมตกแต่งด้านหลัง — ไม่มีความหมาย ซ่อนจากโปรแกรมอ่านหน้าจอ */}
        <span aria-hidden="true" className="absolute -right-12 -top-20 size-64 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -bottom-24 right-28 size-48 rounded-full bg-cyan-300/20" />
        <span aria-hidden="true" className="absolute -left-10 -bottom-16 size-40 rounded-full bg-indigo-300/15" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{`สวัสดี ${user.displayName}`}</h1>
            <p className="mt-1.5 text-[15px] text-white/85">
              {formatFullDate(today)} · วันนี้มีการใช้ห้อง {todayCount} รายการ
            </p>
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
              className="inline-flex min-h-11 items-center gap-2 rounded-control bg-white px-4 text-[15px] font-semibold text-brand shadow-card transition-transform duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-white"
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

      <section aria-label="สรุปการจอง" className="enter-stagger mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<CalendarClock className="size-5"/>} label="ใช้ห้องวันนี้" value={todayCount} caption="รายการ" tone="blue"/>
        <SummaryCard icon={<Clock className="size-5"/>} label="รออนุมัติ" value={pendingCount} caption="รายการ" tone="orange" link="/approvals"/>
        <SummaryCard icon={<CheckCircle2 className="size-5"/>} label="อนุมัติแล้ว" value={approvedCount} caption="รายการ" tone="green"/>
        <SummaryCard icon={<ClipboardList className="size-5"/>} label="รวมทั้งหมด" value={bookings.length} caption="รายการ" tone="purple"/>
      </section>

      <section className="enter-stagger mb-5 grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
        <Card><CardHeader title="สถิติการใช้ห้องประชุมแต่ละห้อง" description="จำนวนรายการที่ยืนยันแล้ว"/><CardBody><div className="flex h-52 items-end gap-3 overflow-x-auto border-b border-line px-2 pt-4">{roomStats.map(({room,count},index)=><RoomBar key={room.roomId} name={room.name} count={count} percent={Math.max(5,count/(roomStats[0]?.count||1)*65)} color={donutColors[index%donutColors.length]!} index={index}/>)}{!roomStats.length&&<p className="m-auto text-sm text-ink-muted">ยังไม่มีข้อมูลห้องประชุม</p>}</div></CardBody></Card>
        <Card><CardHeader title="สถิติการขอใช้อุปกรณ์/สิ่งอำนวยความสะดวก" description="จากคำขอจองทั้งหมด"/><CardBody><div className="grid items-center gap-5 sm:grid-cols-[190px_1fr]"><div className="mx-auto grid size-44 place-items-center rounded-full" style={{background:facilityTotal?`conic-gradient(${donutStops}, var(--color-neutral-soft) ${sweep*100}% 100%)`:'var(--color-neutral-soft)'}}><div className="grid size-28 place-items-center rounded-full bg-surface text-center"><div><strong data-numeric className="block text-2xl text-ink"><CountUp value={facilityTotal} duration={1100}/></strong><span className="text-xs text-ink-muted">รายการอุปกรณ์</span></div></div></div><ul className="space-y-2">{facilityStats.map((item,index)=><li key={item.key} className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2"><i className="size-3 shrink-0 rounded-sm" style={{backgroundColor:donutColors[index%donutColors.length]}}/><span className="truncate">{item.label}</span></span><strong data-numeric><CountUp value={item.count} duration={1100}/></strong></li>)}</ul></div></CardBody></Card>
      </section>

      <Card className="mb-5"><CardHeader title="รายการจองล่าสุด" description="รายการใหม่และรายการที่กำลังจะมาถึง" action={<Link className="text-sm font-medium text-brand hover:underline" to="/my-bookings">ดูรายการทั้งหมด</Link>}/><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-surface-sunken text-xs text-ink-muted"><tr><th className="px-4 py-3 font-medium">ห้องประชุม</th><th className="px-4 py-3 font-medium">ผู้จอง</th><th className="px-4 py-3 font-medium">วันที่ / เวลา</th><th className="px-4 py-3 font-medium">สถานะ</th></tr></thead><tbody className="divide-y divide-line">{latest.map((booking)=><tr key={booking.bookingId}><td className="px-4 py-3">{rooms.find((room)=>room.roomId===booking.roomId)?.name||'ห้องประชุม'}</td><td className="px-4 py-3">{booking.bookerName||booking.userName}</td><td className="whitespace-nowrap px-4 py-3">{formatShortDate(booking.dateKey)} {formatTimeOfDay(booking.startMin)}–{formatTimeOfDay(booking.endMin)}</td><td className="px-4 py-3"><Badge tone={booking.status==='confirmed'?'ok':booking.status==='pending'?'warn':booking.status==='rejected'?'danger':'neutral'}>{BOOKING_STATUS_LABEL_TH[booking.status]}</Badge></td></tr>)}{latest.length===0&&<tr><td colSpan={4} className="px-4 py-8 text-center text-ink-muted">ยังไม่มีรายการจอง</td></tr>}</tbody></table></div></Card>

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
          <CardHeader
            title="กฎการจองที่ใช้อยู่"
            description="ค่าทั้งหมดนี้อ่านจากการตั้งค่าในระบบ ผู้ดูแลแก้ได้ภายหลัง"
          />
          <CardBody>
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
        </Card>

      </div>
    </>
  );
}

/** แท่งกราฟที่โตขึ้นจาก 0 เหลื่อมเวลากันทีละแท่งให้ดูเป็นลำดับ */
function RoomBar({name,count,percent,color,index}:{name:string;count:number;percent:number;color:string;index:number}) {
  const delay=index*80;
  const height=useAnimatedNumber(percent,{duration:900,delay});
  return <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
    <span data-numeric className="text-sm font-semibold text-ink"><CountUp value={count} delay={delay}/></span>
    <div className="w-full max-w-14 rounded-t-md" style={{height:`${height}%`,backgroundColor:color}} title={`${name}: ${count} รายการ`}/>
    <span className="line-clamp-2 min-h-9 w-full text-center text-[11px] leading-4 text-ink-muted">{name}</span>
  </div>;
}

function SummaryCard({icon,label,value,caption,tone,link}:{icon:React.ReactNode;label:string;value:number;caption:string;tone:'blue'|'orange'|'green'|'purple';link?:string}) {
  // สีของการ์ดตรงกับความหมาย: รออนุมัติ=เหลือง อนุมัติแล้ว=เขียว ส่วนน้ำเงิน/ม่วงเป็นสีตกแต่ง
  const styles={
    blue:{card:'from-sky-50 ring-sky-100',tile:'from-sky-500 to-blue-600 shadow-sky-500/30'},
    orange:{card:'from-amber-50 ring-amber-100',tile:'from-amber-400 to-orange-500 shadow-amber-500/30'},
    green:{card:'from-emerald-50 ring-emerald-100',tile:'from-emerald-500 to-teal-600 shadow-emerald-500/30'},
    purple:{card:'from-violet-50 ring-violet-100',tile:'from-violet-500 to-indigo-600 shadow-violet-500/30'},
  }[tone];
  const content=<div className="flex items-center gap-3.5 px-4 py-4">
    <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${styles.tile}`}>{icon}</span>
    <span className="min-w-0"><span className="block text-sm font-medium text-ink-muted">{label}</span><strong data-numeric className="block text-[1.75rem] font-semibold leading-tight text-ink"><CountUp value={value}/></strong><span className="text-xs text-ink-subtle">{caption}</span></span>
  </div>;
  const shell=`block rounded-[18px] bg-gradient-to-br to-white shadow-card ring-1 ${styles.card}`;
  return link?<Link to={link} className={`lift ${shell}`}>{content}</Link>:<div className={shell}>{content}</div>;
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
