import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, DoorOpen, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  LOOKUP_KINDS, LOOKUP_KIND_LABEL_TH, LOOKUP_NOTE_LABEL_TH, sortLookups, type LookupItem, type LookupKind,
} from '@shared/schemas/lookup';
import { ROOM_IMAGE_MAX_CHARS, ROOM_STATUSES, ROOM_STATUS_LABEL_TH, isOpenLocationRoom, type RoomStatus } from '@shared/schemas/room';
import { useApp } from '../../app/providers/AppProvider';
import type { DemoRoom } from '../../lib/api/demo';
import { PageHeader } from '../../components/layout/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/cn';
import { useLookups } from '../../lib/hooks/useLookups';
import { shrinkImage } from '../../lib/image/shrinkImage';

const inputClass = 'min-h-11 w-full rounded-control border border-line bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-ink';

type Tab = 'rooms' | LookupKind;
const TABS: { id: Tab; label: string }[] = [
  { id: 'rooms', label: 'ห้องประชุม' },
  ...LOOKUP_KINDS.map((kind) => ({ id: kind, label: LOOKUP_KIND_LABEL_TH[kind] })),
];

/** คำอธิบายใต้หัวแต่ละแท็บ — บอกว่ารายการนี้ไปโผล่ที่ไหน */
const TAB_HINT: Record<Tab, string> = {
  rooms: 'ห้องที่ปิดปรับปรุงหรือไม่เปิดให้จองจะไม่อยู่ในแบบฟอร์มจอง แต่ประวัติการจองยังอยู่ครบ',
  roomEquipment: 'อุปกรณ์ที่มีติดห้อง แสดงในหน้าห้องประชุมและตอนเลือกห้อง',
  facility: 'อุปกรณ์ที่ผู้จองติ๊กขอให้เตรียม รายการที่เพิ่มเองจะพิมพ์ในช่อง "อื่น ๆ" ของแบบคำขอ',
  meetingType: 'ตัวเลือกประเภทการประชุมในแบบฟอร์มจอง ใช้แยกสถิติในรายงาน',
  department: 'รายชื่อให้เลือกในแบบฟอร์มจองและบัญชีผู้ใช้ ใส่ชื่อหัวหน้าแผนกไว้ได้',
  position: 'รายชื่อตำแหน่งให้เลือกในแบบฟอร์มจองและบัญชีผู้ใช้',
};

/** หน้าตั้งค่าข้อมูล (ผู้ดูแล) — ห้องประชุมและรายการตั้งต้นที่แบบฟอร์มใช้ แก้ได้เองไม่ต้องแก้โค้ด */
export function ManagePage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TABS.some((item) => item.id === requested) ? (requested as Tab) : 'rooms';
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const choose = (next: Tab) => setParams({ tab: next }, { replace: true });
  // ลูกศรซ้าย/ขวาเลื่อนแท็บตามแบบ tablist มาตรฐาน
  const onKey = (event: KeyboardEvent, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + TABS.length) % TABS.length;
    choose(TABS[next]!.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <PageHeader title="ตั้งค่าข้อมูล" description="เพิ่ม แก้ไข หรือปิดรายการที่ใช้ในระบบได้เอง มีผลกับทุกคนทันที" />
      <div role="tablist" aria-label="ชนิดข้อมูล" className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => { tabRefs.current[index] = node; }}
            type="button"
            role="tab"
            id={`manage-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="manage-panel"
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => choose(item.id)}
            onKeyDown={(event) => onKey(event, index)}
            className={cn(
              'min-h-11 shrink-0 whitespace-nowrap rounded-pill px-4 text-sm font-medium transition-colors duration-150',
              tab === item.id ? 'bg-brand text-ink-inverse shadow-card' : 'bg-surface text-ink-muted ring-1 ring-line hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section id="manage-panel" role="tabpanel" aria-labelledby={`manage-tab-${tab}`}>
        <p className="mb-4 max-w-2xl text-sm text-ink-muted">{TAB_HINT[tab]}</p>
        {tab === 'rooms' ? <RoomsPanel /> : <LookupPanel key={tab} kind={tab} />}
      </section>
    </>
  );
}

/* ---------- ห้องประชุม ---------- */

function RoomsPanel() {
  const { api, token } = useApp();
  const toast = useToast();
  const lookups = useLookups();
  const [rooms, setRooms] = useState<DemoRoom[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<DemoRoom | 'new' | null>(null);
  const [deleting, setDeleting] = useState<DemoRoom | null>(null);

  const load = useCallback(() => api.rooms(token).then(({ rooms: data }) => { setRooms(data); setError(''); })
    .catch((e: Error) => setError(e.message)), [api, token]);
  useEffect(() => { void load(); }, [load]);

  const close = useCallback(() => { setEditing(null); setDeleting(null); }, []);
  const done = (message: string) => { close(); toast.success(message); void load(); };

  if (error && rooms === null) return <ErrorState message={error} onRetry={() => void load()} />;
  if (rooms === null) return <LoadingState message="กำลังโหลดห้องประชุม" />;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>เพิ่มห้อง</Button>
      </div>
      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-line">
            {rooms.map((room) => (
              <li key={room.roomId} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {room.imageUrl
                    ? <img src={room.imageUrl} alt="" className="size-14 shrink-0 rounded-control object-cover" />
                    : <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-control bg-brand-soft text-brand"><DoorOpen className="size-6" /></span>}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{room.name}</p>
                      {room.status !== 'active' && <Badge tone="warn">{ROOM_STATUS_LABEL_TH[room.status]}</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {[room.code, isOpenLocationRoom(room) ? 'ผู้จองระบุสถานที่เอง' : `รองรับ ${room.capacity} คน`, room.location].filter(Boolean).join(' · ')}
                    </p>
                    {room.equipment.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-ink-subtle">มี{room.equipment.map((key) => lookups.label('roomEquipment', key)).join(', ')}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(room)}>แก้ไข</Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(room)} aria-label={`ลบ ${room.name}`}>ลบ</Button>
                </div>
              </li>
            ))}
            {rooms.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-muted">ยังไม่มีห้องประชุม กด "เพิ่มห้อง" เพื่อเริ่ม</li>}
          </ul>
        </CardBody>
      </Card>

      {editing !== null && <RoomFormDialog room={editing === 'new' ? null : editing} onClose={close} onDone={done} />}
      {deleting !== null && <DeleteRoomDialog room={deleting} onClose={close} onDone={done} />}
    </>
  );
}

function RoomFormDialog({ room, onClose, onDone }: { room: DemoRoom | null; onClose: () => void; onDone: (message: string) => void }) {
  const { api, token } = useApp();
  const lookups = useLookups();
  const [code, setCode] = useState(room?.code ?? '');
  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 20));
  const [location, setLocation] = useState(room?.location ?? '');
  const [description, setDescription] = useState(room?.description ?? '');
  const [status, setStatus] = useState<RoomStatus>(room?.status ?? 'active');
  const [equipment, setEquipment] = useState<string[]>(room?.equipment ?? []);
  const [imageUrl, setImageUrl] = useState(room?.imageUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [shrinking, setShrinking] = useState(false);
  const [error, setError] = useState('');

  // อุปกรณ์ที่ปิดไปแล้วแต่ห้องยังติ๊กไว้ — แสดงให้เห็นเพื่อเอาออก (บันทึกทั้งที่ยังติ๊กอยู่ไม่ได้)
  const options = [
    ...lookups.active('roomEquipment'),
    ...equipment.filter((key) => !lookups.active('roomEquipment').some((item) => item.key === key))
      .map((key) => ({ key, label: `${lookups.label('roomEquipment', key)} (ปิดใช้แล้ว)`, lookupId: `off-${key}` })),
  ];

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setShrinking(true);
    setError('');
    try {
      setImageUrl(await shrinkImage(file, ROOM_IMAGE_MAX_CHARS));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เปิดรูปไม่ได้');
    } finally {
      setShrinking(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    api.saveRoom(token, {
      roomId: room?.roomId ?? '', code: code.trim(), name: name.trim(), capacity: Number(capacity), location, description,
      status, equipment, imageUrl: imageUrl || null,
    })
      .then(({ room: saved }) => onDone(room ? `บันทึก ${saved.name} แล้ว` : `เพิ่ม ${saved.name} แล้ว`))
      .catch((e: Error) => { setError(e.message); setBusy(false); });
  };

  return (
    <Dialog
      labelId="room-form-title"
      title={room ? `แก้ไข ${room.name}` : 'เพิ่มห้องประชุม'}
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>ยกเลิก</Button>
        <Button type="submit" form="room-form" loading={busy} loadingLabel="กำลังบันทึก" disabled={shrinking}>บันทึก</Button>
      </>}
    >
      <form id="room-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger" title="บันทึกไม่สำเร็จ">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <div>
            <label className={labelClass} htmlFor="rf-code">รหัสห้อง</label>
            <input id="rf-code" className={inputClass} required maxLength={20} pattern="[A-Za-z0-9\-]+" title="ใช้ได้เฉพาะ A-Z 0-9 และขีดกลาง" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="R07" />
          </div>
          <div>
            <label className={labelClass} htmlFor="rf-name">ชื่อห้อง</label>
            <input id="rf-name" className={inputClass} required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ห้องประชุมอาคาร 3" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rf-capacity">ความจุ (คน)</label>
            <input id="rf-capacity" className={inputClass} type="number" inputMode="numeric" required min={1} max={1000} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="rf-status">สถานะ</label>
            <select id="rf-status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as RoomStatus)}>
              {ROOM_STATUSES.map((value) => <option key={value} value={value}>{value === 'active' ? 'พร้อมใช้งาน (เปิดให้จอง)' : ROOM_STATUS_LABEL_TH[value]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="rf-location">ที่ตั้ง <span className="font-normal text-ink-subtle">(ถ้ามี)</span></label>
          <input id="rf-location" className={inputClass} maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="เช่น อาคาร 2 ชั้น 3" />
        </div>
        <div>
          <label className={labelClass} htmlFor="rf-description">รายละเอียด <span className="font-normal text-ink-subtle">(ถ้ามี)</span></label>
          <textarea id="rf-description" className={cn(inputClass, 'min-h-20 py-2')} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <fieldset>
          <legend className={labelClass}>อุปกรณ์ประจำห้อง</legend>
          <div className="grid grid-cols-2 gap-2">
            {options.map((item) => (
              <label key={item.lookupId} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 text-sm transition-colors duration-150 has-[:checked]:border-brand-border has-[:checked]:bg-brand-soft has-[:checked]:font-medium has-[:checked]:text-brand">
                <input type="checkbox" checked={equipment.includes(item.key)} onChange={() => setEquipment((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])} />
                <span className="min-w-0 leading-tight">{item.label}</span>
              </label>
            ))}
          </div>
          {options.length === 0 && <p className="text-sm text-ink-muted">ยังไม่มีรายการ เพิ่มได้ที่แท็บ "อุปกรณ์ประจำห้อง"</p>}
        </fieldset>
        <div>
          <p className={labelClass}>รูปห้อง <span className="font-normal text-ink-subtle">(ถ้ามี)</span></p>
          {imageUrl && <img src={imageUrl} alt="ตัวอย่างรูปห้อง" className="mb-2 aspect-[16/7] w-full rounded-control object-cover" />}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control px-4 text-sm font-medium text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
              <ImagePlus className="size-4" aria-hidden="true" />
              {shrinking ? 'กำลังย่อรูป…' : imageUrl ? 'เปลี่ยนรูป' : 'เลือกรูป'}
              <input type="file" accept="image/*" className="sr-only" disabled={shrinking} onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {imageUrl && <Button variant="ghost" size="sm" onClick={() => setImageUrl('')}>เอารูปออก</Button>}
          </div>
          <p className="mt-1.5 text-xs text-ink-subtle">ระบบย่อรูปให้อัตโนมัติ ถ่ายจากมือถือได้เลย</p>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteRoomDialog({ room, onClose, onDone }: { room: DemoRoom; onClose: () => void; onDone: (message: string) => void }) {
  const { api, token } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remove = () => {
    setBusy(true);
    api.deleteRoom(token, room.roomId)
      .then(() => onDone(`ลบ ${room.name} แล้ว`))
      .catch((e: Error) => { setError(e.message); setBusy(false); });
  };
  return (
    <Dialog
      labelId="room-delete-title"
      title={`ลบ ${room.name}?`}
      description="ลบได้เฉพาะห้องที่ยังไม่เคยมีการจอง"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy} data-autofocus>ยกเลิก</Button>
        <Button variant="danger" loading={busy} onClick={remove}>ลบห้อง</Button>
      </>}
    >
      {error
        ? <Alert tone="warn" title="ลบไม่ได้">{error}</Alert>
        : <p className="text-sm text-ink-muted">ถ้าห้องนี้แค่ปิดซ่อมหรือเลิกใช้ชั่วคราว ให้แก้สถานะเป็น "ปิดปรับปรุง" แทน จะเปิดกลับมาได้ภายหลัง</p>}
    </Dialog>
  );
}

/* ---------- รายการตั้งต้น ---------- */

function LookupPanel({ kind }: { kind: LookupKind }) {
  const { api, token } = useApp();
  const toast = useToast();
  const lookups = useLookups();
  const items = sortLookups(lookups.items.filter((item) => item.kind === kind));
  const noteLabel = LOOKUP_NOTE_LABEL_TH[kind];
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<LookupItem | null>(null);
  const [deleting, setDeleting] = useState<LookupItem | null>(null);

  const save = (item: LookupItem, patch: Partial<LookupItem>, busyKey = item.lookupId) => {
    setBusy(busyKey);
    setError('');
    const next = { ...item, ...patch };
    return api.saveLookup(token, { lookupId: next.lookupId, kind, label: next.label, note: next.note, sortOrder: next.sortOrder, active: next.active })
      .catch((e: Error) => { setError(e.message); throw e; })
      .finally(() => setBusy(''));
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    const sortOrder = (items.at(-1)?.sortOrder ?? 0) + 10;
    setBusy('new');
    setError('');
    api.saveLookup(token, { lookupId: '', kind, label: label.trim(), note: note.trim(), sortOrder, active: true })
      .then(() => { toast.success(`เพิ่ม "${label.trim()}" แล้ว`); setLabel(''); setNote(''); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(''));
  };

  // สลับลำดับกับรายการข้างเคียง — ลำดับนี้คือลำดับที่ผู้จองเห็นในแบบฟอร์ม
  const move = async (index: number, step: -1 | 1) => {
    const a = items[index];
    const b = items[index + step];
    if (!a || !b) return;
    const [orderA, orderB] = a.sortOrder === b.sortOrder ? [b.sortOrder + step, a.sortOrder] : [b.sortOrder, a.sortOrder];
    try {
      await save(a, { sortOrder: orderA });
      await save(b, { sortOrder: orderB });
    } catch {
      // ข้อความผิดพลาดแสดงจาก save แล้ว
    }
  };

  return (
    <>
      {error && <Alert tone="danger" title="บันทึกไม่สำเร็จ" className="mb-4">{error}</Alert>}
      <Card className="mb-4">
        <CardBody className="p-4">
          <form onSubmit={add} className={cn('grid gap-3', noteLabel ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]' : 'sm:grid-cols-[minmax(0,1fr)_auto]')}>
            <div>
              <label className={labelClass} htmlFor="lookup-new">เพิ่ม{LOOKUP_KIND_LABEL_TH[kind]}</label>
              <input id="lookup-new" className={inputClass} required maxLength={100} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="พิมพ์ชื่อรายการ" />
            </div>
            {noteLabel && (
              <div>
                <label className={labelClass} htmlFor="lookup-new-note">{noteLabel} <span className="font-normal text-ink-subtle">(ถ้ามี)</span></label>
                <input id="lookup-new-note" className={inputClass} maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น นายสมชาย ใจดี" />
              </div>
            )}
            <div className="flex items-end">
              <Button type="submit" icon={<Plus className="size-4" />} loading={busy === 'new'} loadingLabel="กำลังเพิ่ม" fullWidth>เพิ่ม</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <ol className="divide-y divide-line">
            {items.map((item, index) => (
              <li key={item.lookupId} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !item.active && 'bg-surface-sunken/60')}>
                <div className="flex shrink-0 flex-col">
                  <button type="button" aria-label={`เลื่อน ${item.label} ขึ้น`} disabled={index === 0 || busy !== ''} onClick={() => void move(index, -1)} className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft hover:text-ink disabled:opacity-30"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label={`เลื่อน ${item.label} ลง`} disabled={index === items.length - 1 || busy !== ''} onClick={() => void move(index, 1)} className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft hover:text-ink disabled:opacity-30"><ArrowDown className="size-4" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('font-medium', item.active ? 'text-ink' : 'text-ink-muted line-through decoration-ink-subtle')}>{item.label}</p>
                  {noteLabel && <p className="text-sm text-ink-muted">{item.note ? `${noteLabel}: ${item.note}` : `ยังไม่ระบุ${noteLabel}`}</p>}
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-muted">
                  <input type="checkbox" role="switch" className="peer sr-only" checked={item.active} disabled={busy !== ''} onChange={() => void save(item, { active: !item.active }).catch(() => undefined)} />
                  <span aria-hidden="true" className="relative h-6 w-10 rounded-full bg-line transition-colors duration-150 peer-checked:bg-ok peer-focus-visible:ring-2 peer-focus-visible:ring-brand after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-4" />
                  <span className="w-12">{item.active ? 'ใช้อยู่' : 'ปิดไว้'}</span>
                </label>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(item)}>แก้ไข</Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} aria-label={`ลบ ${item.label}`} onClick={() => setDeleting(item)}>ลบ</Button>
                </div>
              </li>
            ))}
            {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-muted">ยังไม่มีรายการ</li>}
          </ol>
        </CardBody>
      </Card>

      {editing && (
        <LookupEditDialog item={editing} noteLabel={noteLabel} onClose={() => setEditing(null)} onSave={(patch) => save(editing, patch).then(() => { setEditing(null); toast.success('บันทึกแล้ว'); })} />
      )}
      {deleting && (
        <Dialog
          labelId="lookup-delete-title"
          title={`ลบ "${deleting.label}"?`}
          onClose={() => setDeleting(null)}
          footer={<>
            <Button variant="secondary" onClick={() => setDeleting(null)} data-autofocus>ยกเลิก</Button>
            <Button variant="danger" loading={busy === deleting.lookupId} onClick={() => {
              setBusy(deleting.lookupId);
              api.archiveLookup(token, deleting.lookupId)
                .then(() => { toast.success(`ลบ "${deleting.label}" แล้ว`); setDeleting(null); })
                .catch((e: Error) => setError(e.message))
                .finally(() => setBusy(''));
            }}>ลบ</Button>
          </>}
        >
          <p className="text-sm text-ink-muted">รายการนี้จะหายจากแบบฟอร์ม การจองเก่าที่เคยเลือกไว้ยังแสดงชื่อเดิมได้ ถ้าแค่ไม่อยากให้เลือกชั่วคราว ให้กดปิดไว้แทน</p>
        </Dialog>
      )}
    </>
  );
}

function LookupEditDialog({ item, noteLabel, onClose, onSave }: {
  item: LookupItem; noteLabel: string | undefined; onClose: () => void; onSave: (patch: Partial<LookupItem>) => Promise<void>;
}) {
  const [label, setLabel] = useState(item.label);
  const [note, setNote] = useState(item.note);
  const [busy, setBusy] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    onSave({ label: label.trim(), note: note.trim() }).catch(() => setBusy(false));
  };
  return (
    <Dialog
      labelId="lookup-edit-title"
      title={`แก้ไข${LOOKUP_KIND_LABEL_TH[item.kind]}`}
      description="การจองเก่าจะแสดงชื่อใหม่ตามไปด้วย"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>ยกเลิก</Button>
        <Button type="submit" form="lookup-edit-form" loading={busy} loadingLabel="กำลังบันทึก">บันทึก</Button>
      </>}
    >
      <form id="lookup-edit-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="lookup-edit-label">ชื่อรายการ</label>
          <input id="lookup-edit-label" className={inputClass} required maxLength={100} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        {noteLabel && (
          <div>
            <label className={labelClass} htmlFor="lookup-edit-note">{noteLabel}</label>
            <input id="lookup-edit-note" className={inputClass} maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
      </form>
    </Dialog>
  );
}
