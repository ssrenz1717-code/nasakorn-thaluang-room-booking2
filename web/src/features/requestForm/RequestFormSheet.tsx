import type { ReactNode } from 'react';
import { APPROVAL_STEPS, type ApprovalEntry } from '@shared/domain/approval';
import { REQUEST_FACILITIES, REQUEST_FACILITY_LABEL_TH, type RequestFacility } from '@shared/schemas/booking';
import { COLLEGE_ROOMS, OPEN_LOCATION_ROOM_CODE } from '@shared/schemas/room';
import { cn } from '../../lib/cn';

/** ข้อมูลที่ใช้เติมแบบฟอร์ม — รับได้ทั้งรายการจองที่บันทึกแล้ว และข้อมูลที่กำลังกรอกอยู่ในหน้าจอง */
export interface RequestFormData {
  bookerName: string;
  requesterPosition?: string | undefined;
  department: string;
  requesterPhone?: string | undefined;
  roomId: string;
  customLocation?: string | undefined;
  title: string;
  dateKey: string;
  startMin: number;
  endMin: number;
  attendees: number;
  requestedFacilities?: readonly string[] | undefined;
  extraFurnitureCount?: number | undefined;
  otherFacility?: string | undefined;
  /** เวลาที่ยื่นคำขอ — ยังไม่ยื่น (ตัวอย่าง) ปล่อยว่าง */
  createdAt?: string | undefined;
  approvalLog?: readonly ApprovalEntry[] | undefined;
}

const fromKey = (key: string) => new Date(`${key}T12:00:00+07:00`);
const part = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('th-TH', { ...options, timeZone: 'Asia/Bangkok' }).format(date);
const time = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}.${String(min % 60).padStart(2, '0')}`;
const longDate = (iso: string) => part(new Date(iso), { day: 'numeric', month: 'long', year: 'numeric' });

/** คำนำหน้าตามแบบฟอร์ม — ยาวก่อน ("นางสาว" ต้องเช็กก่อน "นาง") */
const PREFIXES = ['นางสาว', 'นาง', 'นาย'] as const;
function splitPrefix(fullName: string): { prefix: string; name: string } {
  const trimmed = fullName.trim();
  const prefix = PREFIXES.find((item) => trimmed.startsWith(item)) ?? '';
  return { prefix, name: trimmed.slice(prefix.length).trim() };
}

/**
 * แบบคำขออนุญาตใช้ห้องประชุม — วางตามแบบฟอร์มต้นฉบับของวิทยาลัยทุกบรรทัด
 * กรอกผ่านเว็บแล้วพิมพ์ออกมาได้หน้าตาเหมือนกระดาษเดิม (A4 แนวตั้ง 1 หน้า)
 */
export function RequestFormSheet({ data, roomCode, roomName, className }: {
  data: RequestFormData;
  /** รหัสห้องที่เลือก (R01–R06 หรือ OTHER) ใช้ติ๊กช่องห้อง */
  roomCode: string;
  /** ชื่อห้องในระบบ — ใช้เมื่อห้องไม่อยู่ใน 6 ห้องของแบบฟอร์ม (พิมพ์ลงช่อง "อื่นๆ") */
  roomName?: string | undefined;
  className?: string;
}) {
  const date = fromKey(data.dateKey);
  const { prefix, name } = splitPrefix(data.bookerName);
  const known = COLLEGE_ROOMS.some((room) => room.code === roomCode && room.code !== OPEN_LOCATION_ROOM_CODE);
  const otherPlace = roomCode === OPEN_LOCATION_ROOM_CODE ? data.customLocation ?? '' : known ? '' : roomName ?? '';
  const facilities = new Set(data.requestedFacilities ?? []);
  const extra = data.extraFurnitureCount ?? 0;
  const signed = (step: number) => data.approvalLog?.find((entry) => entry.step === step);
  const dateParts = (
    <>
      <Fill w="7.5mm" center>{String(Number(data.dateKey.slice(8, 10)))}</Fill> เดือน <Fill grow center>{part(date, { month: 'long' })}</Fill> พ.ศ. <Fill w="11mm" center>{String(Number(data.dateKey.slice(0, 4)) + 543)}</Fill>
    </>
  );

  return (
    <article className={cn('form-sheet print-sheet', className)} aria-label="แบบคำขออนุญาตใช้ห้องประชุม">
      <img src={`${import.meta.env.BASE_URL}college-logo.png`} alt="ตราวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์" className="mx-auto h-[24mm] w-[24mm]" />
      <h1 className="mt-[2mm] text-center font-bold">แบบคำขออนุญาตใช้ห้องประชุม</h1>
      <p className="text-center font-bold">วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</p>

      <p className="mt-[3mm] text-right">เขียนวันที่ <Fill w="42mm" center>{data.createdAt ? longDate(data.createdAt) : ''}</Fill></p>
      <p className="mt-[2mm]">เรื่อง&emsp;ขออนุญาตใช้ห้องประชุม</p>
      <p>เรียน&emsp;ผู้อำนวยการวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</p>
      <Line>
        ข้าพเจ้า{' '}
        <span>
          {/* แบบกระดาษ: ขีดฆ่าคำนำหน้าที่ไม่ใช้ */}
          {['นาย', 'นาง', 'นางสาว'].map((item, index) => (
            <span key={item}>{index > 0 && '/'}<span className={cn(prefix && item !== prefix && 'line-through')}>{item}</span></span>
          ))}
        </span>
        <Fill grow>{prefix ? name : data.bookerName}</Fill>
      </Line>
      <Line>ตำแหน่ง <Fill grow>{data.requesterPosition}</Fill></Line>
      <Line>หน่วยงาน / สาขาวิชา<Fill grow>{data.department}</Fill>หมายเลขโทรศัพท์<Fill w="38mm" center>{data.requesterPhone}</Fill></Line>

      <p className="font-bold">มีความประสงค์ขออนุญาตใช้ห้องประชุม</p>
      <div className="grid grid-cols-[1fr_1fr_1.25fr] gap-x-[3mm] pl-[11mm]">
        {COLLEGE_ROOMS.filter((room) => room.code !== OPEN_LOCATION_ROOM_CODE).map((room) => (
          <p key={room.code}><Box checked={room.code === roomCode} /> {room.name}</p>
        ))}
        <p className="col-span-3"><Box checked={otherPlace !== ''} /> อื่นๆ <Fill w="62mm">{otherPlace}</Fill></p>
      </div>

      <Line>เพื่อใช้ในการดำเนินงาน เรื่อง <Fill grow>{data.title}</Fill></Line>
      <Line tight>กำหนดการใช้งานวันที่ {dateParts} ถึงวันที่ {dateParts}</Line>
      <Line>
        ตั้งแต่เวลา <Fill grow center>{time(data.startMin)}</Fill> น. ถึงเวลา <Fill grow center>{time(data.endMin)}</Fill> น.
        จำนวนผู้เข้าเข้าใช้ (โดยประมาณ) <Fill w="20mm" center>{data.attendees ? String(data.attendees) : ''}</Fill> คน
      </Line>

      <p className="font-bold">ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวกที่ขอใช้</p>
      <p className="flex flex-wrap gap-x-[4.5mm]">
        {REQUEST_FACILITIES.map((key) => (
          <span key={key}><Box checked={facilities.has(key)} /> {REQUEST_FACILITY_LABEL_TH[key as RequestFacility]}</span>
        ))}
      </p>
      <Line>
        <Box checked={extra > 0} />&nbsp;โต๊ะ/เก้าอี้เพิ่มเติม <Fill w="20mm" center>{extra > 0 ? String(extra) : ''}</Fill> ตัว
        <span className="w-[10mm]" />
        <Box checked={Boolean(data.otherFacility)} />&nbsp;อื่น ๆ <Fill grow>{data.otherFacility}</Fill>
      </Line>
      <p>ข้าพเจ้าขอรับรองว่าจะดูแลรักษาทรัพย์สินของทางราชการ และปฏิบัติตามระเบียบของวิทยาลัยโดยเคร่งครัด</p>

      <div className="mt-[2mm] grid grid-cols-2 border border-black">
        <SignBox title="ผู้ยื่นคำขอ" signedText={data.createdAt ? 'ยื่นคำขอผ่านระบบ' : ''} name={data.bookerName} date={data.createdAt ? longDate(data.createdAt) : ''} />
        <ApproverBox step={2} entry={signed(2)} title="หัวหน้างาน/ผู้รับรอง" />
        <ApproverBox step={1} entry={signed(1)} title="เจ้าหน้าที่ผู้ตรวจสอบห้อง" inspector />
        <ApproverBox step={3} entry={signed(3)} title="ผู้พิจารณา" />
      </div>
    </article>
  );
}

/** ช่องกรอกแบบเส้นประของแบบฟอร์ม — ว่างก็ยังเห็นเส้นให้เขียนด้วยมือได้ */
function Fill({ children, w, grow = false, center = false }: { children?: ReactNode; w?: string; grow?: boolean; center?: boolean }) {
  return (
    <span className={cn('form-fill', grow && 'min-w-[20mm] flex-1', center && 'text-center')} style={w ? { width: w } : undefined}>
      {children || ' '}
    </span>
  );
}

function Line({ children, tight = false }: { children: ReactNode; tight?: boolean }) {
  return <p className={cn('flex items-baseline whitespace-nowrap', tight ? 'gap-x-[0.8mm]' : 'gap-x-[1.5mm]')}>{children}</p>;
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span className="form-box" role="img" aria-label={checked ? 'เลือก' : 'ไม่เลือก'}>
      {checked && (
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </span>
  );
}

function SignBox({ title, signedText, name, position, date, children, showDate = true }: {
  title: string; signedText: string; name: string; position?: string; date: string; children?: ReactNode; showDate?: boolean;
}) {
  return (
    <section className="flex min-h-[40mm] flex-col items-center border-black px-[2mm] pb-[2mm] pt-[1mm] text-center odd:border-r [&:nth-child(-n+2)]:border-b">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-[5mm]">ลงชื่อ <Fill w="42mm" center>{signedText}</Fill></p>
      <p>(<Fill w="48mm" center>{name}</Fill>)</p>
      {position && <p className="whitespace-nowrap text-[10.5pt]">{position}</p>}
      {children}
      {showDate && <p>วันที่ <Fill w="42mm" center>{date}</Fill></p>}
    </section>
  );
}

function ApproverBox({ step, entry, title, inspector = false }: { step: number; entry: ApprovalEntry | undefined; title: string; inspector?: boolean }) {
  const info = APPROVAL_STEPS[step - 1]!;
  const signedText = entry ? (entry.decision === 'approve' ? 'ลงนามผ่านระบบแล้ว' : 'ไม่อนุมัติ (ผ่านระบบ)') : '';
  const date = entry ? longDate(entry.at) : '';
  return (
    <SignBox title={title} signedText={signedText} name={entry?.name ?? info.printedName} position={info.printedPosition} date={date} showDate={!inspector}>
      {inspector && (
        <>
          <p className="mt-[1mm]"><Box checked={entry?.decision === 'approve'} /> พร้อมใช้งาน&emsp;<Box checked={entry?.decision === 'reject'} /> ไม่พร้อมใช้งาน</p>
          <p className="mt-auto flex w-full items-baseline gap-x-[1.5mm] whitespace-nowrap text-left">
            <span className="font-bold">หมายเหตุ</span>
            <Fill grow>{entry ? [entry.reason, `ตรวจเมื่อ ${date}`].filter(Boolean).join(', ') : ''}</Fill>
          </p>
        </>
      )}
    </SignBox>
  );
}
