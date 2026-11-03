import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { KeyRound, LockKeyhole, Pencil, Search, Shuffle, Trash2, UserPlus } from 'lucide-react';
import { APPROVAL_STEPS } from '@shared/domain/approval';
import {
  PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PIN_LENGTH, USER_ROLE_LABEL_TH, USER_ROLES, passwordProblem, pinProblem,
  validateUserAccountInput, type UserRole,
} from '@shared/schemas/user';
import { useApp, useCurrentUser } from '../../app/providers/AppProvider';
import type { AdminUser } from '../../lib/api/types';
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

const inputClass = 'min-h-11 w-full rounded-control border border-line bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface-sunken disabled:text-ink-muted';
const labelClass = 'mb-1.5 block text-sm font-medium text-ink';

/** สิ่งที่แต่ละสิทธิ์ทำได้ — แสดงตอนเลือกสิทธิ์ให้ผู้ดูแลเห็นผลก่อนกดบันทึก */
const ROLE_HINT: Record<UserRole, string> = {
  staff: 'จองห้องและดูรายการของตัวเอง',
  inspector: `ลงนามขั้นที่ 1 · ${APPROVAL_STEPS[0].action}`,
  endorser: `ลงนามขั้นที่ 2 · ${APPROVAL_STEPS[1].action}`,
  director: `ลงนามขั้นที่ 3 · ${APPROVAL_STEPS[2].action}`,
  admin: 'จัดการผู้ใช้ ประกาศ และเห็นทุกรายการ',
};
const ROLE_ORDER: UserRole[] = ['staff', 'inspector', 'endorser', 'director', 'admin'];
const ROLE_TONE: Record<UserRole, 'neutral' | 'brand' | 'warn' | 'ok'> = {
  staff: 'neutral', inspector: 'warn', endorser: 'warn', director: 'ok', admin: 'brand',
};

/** PIN สุ่มที่ผ่านกฎเดาง่าย — ใช้ตัวสุ่มของเบราว์เซอร์ที่ปลอดภัยพอสำหรับรหัสผ่าน */
function randomPin(): string {
  for (;;) {
    const digits = Array.from(crypto.getRandomValues(new Uint8Array(PIN_LENGTH)), (byte) => String(byte % 10)).join('');
    if (pinProblem(digits) === null) return digits;
  }
}

/** รหัสผ่านสุ่ม 10 ตัว ตัดตัวที่อ่านสับสน (0/O, 1/l/I) ออก ให้จดส่งต่อง่าย */
function randomPassword(): string {
  const pool = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    const password = Array.from(crypto.getRandomValues(new Uint8Array(10)), (byte) => pool[byte % pool.length]).join('');
    if (passwordProblem(password) === null) return password;
  }
}

const loginText = (iso: string) => iso === ''
  ? 'ยังไม่เคยเข้าสู่ระบบ'
  : `เข้าล่าสุด ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(iso))}`;

/** รหัสที่เพิ่งออกให้ — ช่องที่ไม่ได้เปลี่ยนเป็น undefined */
interface Issued { displayName: string; username: string; pin?: string; password?: string }
type DoneFn = (message: string, credential?: Issued) => void;

type Panel =
  | { kind: 'create' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'pin'; user: AdminUser }
  | { kind: 'password'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser };

export function UsersPage() {
  const { api, token } = useApp();
  const me = useCurrentUser();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<Panel | null>(null);
  /** PIN ที่เพิ่งออกให้ — ค้างไว้จนกดรับทราบ เพราะระบบไม่เก็บ PIN จริงและดูย้อนหลังไม่ได้ */
  const [issued, setIssued] = useState<Issued | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.users(token), api.rooms(token)])
      .then(([userResult, roomResult]) => { setUsers(userResult.users); setRooms(roomResult.rooms); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ'));
  }, [api, token]);
  useEffect(load, [load]);

  const close = useCallback(() => setPanel(null), []);
  const done = useCallback((message: string, credential?: Issued) => {
    toast.success(message);
    setIssued(credential ?? null);
    setPanel(null);
    load();
  }, [toast, load]);

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    const list = (users ?? []).filter((user) => text === '' || `${user.displayName} ${user.email} ${user.department}`.toLowerCase().includes(text));
    return list.sort((a, b) => ROLE_ORDER.indexOf(b.role) - ROLE_ORDER.indexOf(a.role) || a.displayName.localeCompare(b.displayName, 'th'));
  }, [users, query]);

  const roomName = (roomId: string) => rooms.find((room) => room.roomId === roomId)?.name ?? roomId;

  if (error !== null && users === null) return <ErrorState title="โหลดรายชื่อผู้ใช้ไม่สำเร็จ" message={error} onRetry={load} />;
  if (users === null) return <LoadingState message="กำลังโหลดรายชื่อผู้ใช้" />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="จัดการผู้ใช้"
        description="เพิ่มบัญชี ตั้งรหัสผ่านและ PIN กำหนดสิทธิ์อนุมัติ และเลือกห้องที่แต่ละคนจองได้"
        action={<Button icon={<UserPlus className="size-4" />} onClick={() => setPanel({ kind: 'create' })}>เพิ่มผู้ใช้</Button>}
      />

      {issued !== null && (
        <Alert tone="ok" title={`ข้อมูลเข้าสู่ระบบของ ${issued.displayName}`} className="mb-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p>ชื่อผู้ใช้ <strong className="font-semibold">{issued.username}</strong></p>
            {issued.password !== undefined && <p>รหัสผ่าน <strong className="font-semibold">{issued.password}</strong></p>}
            {issued.pin !== undefined && <p>PIN <strong className="font-semibold tabular-nums tracking-[0.2em]">{issued.pin}</strong></p>}
            <Button size="sm" variant="secondary" onClick={() => setIssued(null)}>จดแล้ว ปิดข้อความนี้</Button>
          </div>
          <p className="mt-1 text-sm">ส่งให้เจ้าของบัญชีโดยตรง ปิดข้อความนี้แล้วดูย้อนหลังไม่ได้</p>
        </Alert>
      )}

      {/* ใครลงนามขั้นไหน — ขั้นที่ไม่มีคนถือสิทธิ์ คำขอจะค้างอยู่ขั้นนั้นตลอด */}
      <section aria-labelledby="signers-title" className="mb-6">
        <h2 id="signers-title" className="mb-2 text-sm font-semibold text-ink">ผู้ลงนามอนุมัติ 3 ขั้น</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {APPROVAL_STEPS.map((step) => {
            const holders = users.filter((user) => user.role === step.role && user.status === 'active');
            return (
              <li key={step.step} className={cn('rounded-card bg-surface p-4 ring-1', holders.length ? 'ring-line' : 'ring-warn-border bg-warn-soft')}>
                <p className="text-xs text-ink-muted">ขั้นที่ {step.step} · {step.action}</p>
                {holders.length ? (
                  <p className="mt-1 text-[15px] font-medium text-ink">{holders.map((user) => user.displayName).join(', ')}</p>
                ) : (
                  <p className="mt-1 text-[15px] font-medium text-warn">ยังไม่มีผู้ลงนาม คำขอจะค้างที่ขั้นนี้</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <Card>
        <CardBody className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <span className="sr-only">ค้นหาผู้ใช้</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
              <input className={cn(inputClass, 'pl-9')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ ชื่อผู้ใช้ หรือหน่วยงาน" />
            </label>
            <p className="text-sm text-ink-muted">{users.length} บัญชี</p>
          </div>

          {shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-muted">ไม่พบผู้ใช้ที่ค้นหา</p>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((user) => (
                <li key={user.email} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{user.displayName}</p>
                      <Badge tone={ROLE_TONE[user.role]}>{USER_ROLE_LABEL_TH[user.role]}</Badge>
                      {user.status !== 'active' && <Badge tone="danger">ปิดการใช้งาน</Badge>}
                      {user.email === me.email && <Badge>คุณ</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {user.email}{user.department ? ` · ${user.department}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {user.role === 'admin' || user.allowedRoomIds.length === 0
                        ? 'จองได้ทุกห้อง'
                        : `จองได้ ${user.allowedRoomIds.map(roomName).join(', ')}`}
                      {' · '}{loginText(user.lastLoginAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setPanel({ kind: 'edit', user })}>แก้ไข</Button>
                    <Button size="sm" variant="secondary" icon={<LockKeyhole className="size-4" />} onClick={() => setPanel({ kind: 'password', user })}>รีเซ็ตรหัสผ่าน</Button>
                    <Button size="sm" variant="secondary" icon={<KeyRound className="size-4" />} onClick={() => setPanel({ kind: 'pin', user })}>รีเซ็ต PIN</Button>
                    {user.email !== me.email && (
                      <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setPanel({ kind: 'delete', user })} aria-label={`ลบ ${user.displayName}`}>ลบ</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {(panel?.kind === 'create' || panel?.kind === 'edit') && (
        <UserFormDialog user={panel.kind === 'edit' ? panel.user : null} isSelf={panel.kind === 'edit' && panel.user.email === me.email} rooms={rooms} onClose={close} onDone={done} />
      )}
      {panel?.kind === 'pin' && <ResetPinDialog user={panel.user} onClose={close} onDone={done} />}
      {panel?.kind === 'password' && <ResetPasswordDialog user={panel.user} onClose={close} onDone={done} />}
      {panel?.kind === 'delete' && <DeleteUserDialog user={panel.user} onClose={close} onDone={done} />}
    </div>
  );
}

function UserFormDialog({
  user, isSelf, rooms, onClose, onDone,
}: { user: AdminUser | null; isSelf: boolean; rooms: DemoRoom[]; onClose: () => void; onDone: DoneFn }) {
  const { api, token } = useApp();
  const creating = user === null;
  const [username, setUsername] = useState(user?.email ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'staff');
  const [active, setActive] = useState((user?.status ?? 'active') === 'active');
  const [limitRooms, setLimitRooms] = useState((user?.allowedRoomIds.length ?? 0) > 0);
  const [roomIds, setRoomIds] = useState<string[]>(user?.allowedRoomIds ?? []);
  const [pin, setPin] = useState(() => (creating ? randomPin() : ''));
  const [password, setPassword] = useState(() => (creating ? randomPassword() : ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRoom = (roomId: string) => setRoomIds((list) => (list.includes(roomId) ? list.filter((id) => id !== roomId) : [...list, roomId]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = {
      username, displayName, department, role, status: active ? 'active' : 'disabled',
      allowedRoomIds: limitRooms && role !== 'admin' ? roomIds : [], pin, password,
    } as const;
    if (limitRooms && role !== 'admin' && roomIds.length === 0) { setError('เลือกห้องอย่างน้อย 1 ห้อง หรือเลือก "ทุกห้อง"'); return; }
    const parsed = validateUserAccountInput(input, { requirePin: creating });
    if (!parsed.ok) { setError(parsed.issues.map((issue) => issue.message).join(' · ')); return; }
    setBusy(true);
    setError(null);
    const { pin: newPin, password: newPassword, ...account } = parsed.value;
    (creating ? api.createUser(token, parsed.value) : api.updateUser(token, account))
      .then(() => (creating
        ? onDone(`เพิ่ม ${account.displayName} แล้ว`, { displayName: account.displayName, username: account.username, password: newPassword, pin: newPin })
        : onDone(`บันทึก ${account.displayName} แล้ว`)))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ'))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      labelId="user-form-title"
      title={creating ? 'เพิ่มผู้ใช้' : `แก้ไข ${user.displayName}`}
      description={creating ? 'จดรหัสผ่านและ PIN ไว้ให้เจ้าของบัญชี ระบบไม่เก็บค่าจริงและดูย้อนหลังไม่ได้' : `ชื่อผู้ใช้ ${user.email}`}
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
        <Button type="submit" form="user-form" loading={busy} loadingLabel="กำลังบันทึก">{creating ? 'เพิ่มผู้ใช้' : 'บันทึก'}</Button>
      </>}
    >
      <form id="user-form" className="space-y-4" onSubmit={submit} noValidate>
        {error !== null && <Alert tone="danger" title="บันทึกไม่ได้"><span role="alert">{error}</span></Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="uf-name">ชื่อ-นามสกุล</label>
            <input id="uf-name" className={inputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} placeholder="เช่น นายสมชาย ใจดี" required />
          </div>
          <div>
            <label className={labelClass} htmlFor="uf-username">ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)</label>
            <input
              id="uf-username" className={inputClass} value={username} disabled={!creating}
              onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
              maxLength={32} autoCapitalize="none" spellCheck={false} placeholder="a-z, 0-9, . _ -" required
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="uf-dept">หน่วยงาน / ตำแหน่ง <span className="font-normal text-ink-subtle">(ถ้ามี)</span></label>
          <input id="uf-dept" className={inputClass} value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={100} placeholder="เช่น แผนกวิชาการบัญชี" />
        </div>

        {creating && (
          <div>
            <label className={labelClass} htmlFor="uf-password">รหัสผ่านแรกเข้า</label>
            <div className="flex gap-2">
              <input
                id="uf-password" className={cn(inputClass, 'min-w-0 flex-1')} maxLength={PASSWORD_MAX_LENGTH}
                value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" spellCheck={false} required
              />
              <Button variant="secondary" icon={<Shuffle className="size-4" />} onClick={() => setPassword(randomPassword())} aria-label="สุ่มรหัสผ่านใหม่">สุ่มใหม่</Button>
            </div>
            <p className="mt-1 text-xs text-ink-muted">อย่างน้อย {PASSWORD_MIN_LENGTH} ตัว มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข</p>
          </div>
        )}

        {creating && (
          <div>
            <label className={labelClass} htmlFor="uf-pin">PIN แรกเข้า {PIN_LENGTH} หลัก <span className="font-normal text-ink-subtle">(ใช้หน้าที่ 2 ตอนเข้าระบบ และตอนลงนามอนุมัติ)</span></label>
            <div className="flex gap-2">
              <input
                id="uf-pin" className={cn(inputClass, 'min-w-0 flex-1 tabular-nums tracking-[0.3em]')} inputMode="numeric" maxLength={PIN_LENGTH}
                value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))} required
              />
              <Button variant="secondary" icon={<Shuffle className="size-4" />} onClick={() => setPin(randomPin())} aria-label="สุ่ม PIN ใหม่">สุ่มใหม่</Button>
            </div>
          </div>
        )}

        <fieldset className="min-w-0">
          <legend className={labelClass}>สิทธิ์การใช้งาน</legend>
          {isSelf && <p className="mb-2 text-sm text-ink-muted">เปลี่ยนสิทธิ์ของตัวเองไม่ได้ ให้ผู้ดูแลคนอื่นทำแทน</p>}
          <div className="grid gap-2">
            {USER_ROLES.slice().sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b)).map((value) => (
              <label
                key={value}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-3 py-2 ring-1 transition-colors',
                  role === value ? 'bg-brand-soft ring-brand' : 'ring-line hover:bg-surface-sunken',
                  isSelf && 'cursor-not-allowed opacity-60',
                )}
              >
                <input type="radio" name="uf-role" value={value} checked={role === value} disabled={isSelf} onChange={() => setRole(value)} className="size-4 accent-brand" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{USER_ROLE_LABEL_TH[value]}</span>
                  <span className="block text-xs text-ink-muted">{ROLE_HINT[value]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {role !== 'admin' && (
          <fieldset className="min-w-0">
            <legend className={labelClass}>ห้องที่จองได้</legend>
            <div className="flex gap-2" role="radiogroup">
              {[{ value: false, label: 'ทุกห้อง' }, { value: true, label: 'เลือกเฉพาะบางห้อง' }].map((option) => (
                <button
                  key={option.label} type="button" role="radio" aria-checked={limitRooms === option.value}
                  onClick={() => setLimitRooms(option.value)}
                  className={cn('min-h-11 flex-1 rounded-control px-3 text-sm font-medium ring-1 transition-colors', limitRooms === option.value ? 'bg-brand-soft text-brand ring-brand' : 'text-ink-muted ring-line hover:bg-surface-sunken')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {limitRooms && (
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {rooms.map((room) => (
                  <label key={room.roomId} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control px-3 ring-1 ring-line hover:bg-surface-sunken">
                    <input type="checkbox" checked={roomIds.includes(room.roomId)} onChange={() => toggleRoom(room.roomId)} className="size-4" />
                    <span className="min-w-0 truncate text-sm text-ink">{room.name}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {!creating && !isSelf && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-4" />
            <span className="text-sm text-ink">เปิดใช้งานบัญชีนี้ <span className="text-ink-muted">(ปิดแล้วเข้าสู่ระบบไม่ได้ แต่ประวัติยังอยู่)</span></span>
          </label>
        )}
      </form>
    </Dialog>
  );
}

function ResetPinDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: DoneFn }) {
  const { api, token } = useApp();
  const [pin, setPin] = useState(randomPin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = pinProblem(pin);
    if (problem !== null) { setError(problem); return; }
    setBusy(true);
    setError(null);
    api.resetUserPin(token, user.email, pin)
      .then(() => onDone(`ตั้ง PIN ใหม่ของ ${user.displayName} แล้ว`, { displayName: user.displayName, username: user.email, pin }))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'รีเซ็ต PIN ไม่สำเร็จ'))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      labelId="reset-pin-title"
      title={`รีเซ็ต PIN · ${user.displayName}`}
      description="PIN เดิมใช้ไม่ได้ทันที และทุกเครื่องที่เข้าสู่ระบบด้วยบัญชีนี้จะถูกออกจากระบบ (รหัสผ่านยังเหมือนเดิม)"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
        <Button type="submit" form="reset-pin-form" loading={busy} loadingLabel="กำลังบันทึก">ตั้ง PIN ใหม่</Button>
      </>}
    >
      <form id="reset-pin-form" onSubmit={submit} noValidate className="space-y-3">
        {error !== null && <Alert tone="danger" title="ใช้ PIN นี้ไม่ได้"><span role="alert">{error}</span></Alert>}
        <label className={labelClass} htmlFor="rp-pin">PIN ใหม่ {PIN_LENGTH} หลัก</label>
        <div className="flex gap-2">
          <input
            id="rp-pin" className={cn(inputClass, 'min-w-0 flex-1 tabular-nums tracking-[0.3em]')} inputMode="numeric" maxLength={PIN_LENGTH}
            value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
          />
          <Button variant="secondary" icon={<Shuffle className="size-4" />} onClick={() => setPin(randomPin())}>สุ่มใหม่</Button>
        </div>
        <p className="text-sm text-ink-muted">ห้ามเลขซ้ำทั้งหมดหรือเลขเรียง เช่น 000000, 123456</p>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: DoneFn }) {
  const { api, token } = useApp();
  const [password, setPassword] = useState(randomPassword);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem !== null) { setError(problem); return; }
    setBusy(true);
    setError(null);
    api.resetUserPassword(token, user.email, password)
      .then(() => onDone(`ตั้งรหัสผ่านใหม่ของ ${user.displayName} แล้ว`, { displayName: user.displayName, username: user.email, password }))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'รีเซ็ตรหัสผ่านไม่สำเร็จ'))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      labelId="reset-password-title"
      title={`รีเซ็ตรหัสผ่าน · ${user.displayName}`}
      description="รหัสผ่านเดิมใช้ไม่ได้ทันที และทุกเครื่องที่เข้าสู่ระบบด้วยบัญชีนี้จะถูกออกจากระบบ (PIN ยังเหมือนเดิม)"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
        <Button type="submit" form="reset-password-form" loading={busy} loadingLabel="กำลังบันทึก">ตั้งรหัสผ่านใหม่</Button>
      </>}
    >
      <form id="reset-password-form" onSubmit={submit} noValidate className="space-y-3">
        {error !== null && <Alert tone="danger" title="ใช้รหัสผ่านนี้ไม่ได้"><span role="alert">{error}</span></Alert>}
        <label className={labelClass} htmlFor="rpw-password">รหัสผ่านใหม่</label>
        <div className="flex gap-2">
          <input
            id="rpw-password" className={cn(inputClass, 'min-w-0 flex-1')} maxLength={PASSWORD_MAX_LENGTH}
            value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" spellCheck={false}
          />
          <Button variant="secondary" icon={<Shuffle className="size-4" />} onClick={() => setPassword(randomPassword())}>สุ่มใหม่</Button>
        </div>
        <p className="text-sm text-ink-muted">อย่างน้อย {PASSWORD_MIN_LENGTH} ตัว มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข</p>
      </form>
    </Dialog>
  );
}

function DeleteUserDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: DoneFn }) {
  const { api, token } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    setBusy(true);
    setError(null);
    api.deleteUser(token, user.email)
      .then(() => onDone(`ลบบัญชี ${user.displayName} แล้ว`))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'ลบไม่สำเร็จ'))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      labelId="delete-user-title"
      title={`ลบบัญชี ${user.displayName}?`}
      description={`ชื่อผู้ใช้ ${user.email} จะเข้าสู่ระบบไม่ได้อีก รายการจองที่เคยส่งไว้ยังอยู่ ถ้าแค่ต้องการพักบัญชี ให้ใช้ "แก้ไข" แล้วปิดการใช้งานแทน`}
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} data-autofocus>ยกเลิก</Button>
        <Button variant="danger" onClick={confirm} loading={busy} loadingLabel="กำลังลบ">ลบบัญชี</Button>
      </>}
    >
      {error !== null ? <Alert tone="danger" title="ลบไม่ได้"><span role="alert">{error}</span></Alert> : <p className="text-sm text-ink">การลบย้อนกลับไม่ได้</p>}
    </Dialog>
  );
}
