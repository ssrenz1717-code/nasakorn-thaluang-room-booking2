import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, UserRound } from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { DEMO_LOGINS } from '../../lib/api/demo';
import { USER_ROLE_LABEL_TH, PIN_LENGTH, PASSWORD_MAX_LENGTH } from '@shared/schemas/user';
import { readLocal, writeLocal } from '../../lib/storage';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';

const fieldClass =
  'min-h-12 w-full rounded-control border border-line bg-surface pl-10 pr-3 text-base text-ink outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20';

type Mode = 'password' | 'pin';
/** จำวิธีที่ใช้ล่าสุดในเครื่องนี้ เปิดเว็บครั้งหน้าจะอยู่ที่วิธีนั้นเลย */
const MODE_KEY = 'mrb.login.mode';

/**
 * เข้าสู่ระบบได้ 2 ทาง เลือกทางใดทางหนึ่ง:
 *  - ชื่อผู้ใช้ + รหัสผ่าน
 *  - PIN 6 หลักอย่างเดียว (ครบ 6 หลักแล้วเข้าระบบให้เลย)
 * ผู้ดูแลตั้งรหัสผ่านและ PIN ให้ในหน้าจัดการผู้ใช้
 * โหมดข้อมูลในเบราว์เซอร์มีรายชื่อบัญชีทดลองให้กดเลือก — ข้อมูลอยู่ในเครื่องผู้เปิดเว็บเท่านั้น
 */
export function LoginPage() {
  const { isDemo, signInWithPassword, signInWithPin, bootError } = useApp();
  const [mode, setModeState] = useState<Mode>(() => (readLocal(MODE_KEY) === 'pin' ? 'pin' : 'password'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(bootError);
  const pinRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const setMode = (next: Mode) => {
    setModeState(next);
    writeLocal(MODE_KEY, next);
    setError(null);
  };

  const fail = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'เข้าสู่ระบบไม่สำเร็จ');

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (username.trim() === '' || password === '') {
      setError(username.trim() === '' ? 'กรุณากรอกชื่อผู้ใช้' : 'กรุณากรอกรหัสผ่าน');
      return;
    }
    setBusy(true);
    setError(null);
    signInWithPassword(username, password)
      .catch((cause: unknown) => { fail(cause); setPassword(''); passwordRef.current?.focus(); })
      .finally(() => setBusy(false));
  };

  const submitPin = (value: string) => {
    if (busy) return;
    if (value.length !== PIN_LENGTH) { setError(`กรุณากรอก PIN ให้ครบ ${PIN_LENGTH} หลัก`); return; }
    setBusy(true);
    setError(null);
    signInWithPin(value)
      .catch((cause: unknown) => { fail(cause); setPin(''); window.setTimeout(() => pinRef.current?.focus(), 0); })
      .finally(() => setBusy(false));
  };

  // ใส่ครบ 6 หลักแล้วเข้าระบบให้เลย ไม่ต้องกดปุ่ม
  const changePin = (value: string) => {
    setPin(value);
    if (value.length === PIN_LENGTH) submitPin(value);
  };

  const pickDemo = (login: (typeof DEMO_LOGINS)[number]) => {
    setError(null);
    if (mode === 'pin') { setPin(''); submitPin(login.pin); return; }
    setUsername(login.username);
    setPassword(login.password);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* แผงซ้าย (จอใหญ่) — ตัวตนของวิทยาลัย มือถือย่อเหลือแถบหัวด้านบน */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-panel px-6 py-6 text-ink-inverse lg:px-12 lg:py-12">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}college-logo.png`} alt="" className="size-11 shrink-0 rounded-full bg-surface p-0.5 lg:size-14" />
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug lg:text-lg">ระบบจองห้องประชุม</p>
            <p className="truncate text-sm text-ink-inverse/70">วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</p>
          </div>
        </div>

        <div className="hidden max-w-md lg:block">
          <p className="text-[2.5rem] font-semibold leading-[1.15] tracking-tight text-balance">
            จองห้อง ส่งคำขอ และอนุมัติ ครบในที่เดียว
          </p>
          <ol className="mt-8 space-y-3 text-[15px] text-ink-inverse/80">
            {['ผู้ขอใช้กรอกแบบฟอร์มคำขอในเว็บ', 'ผู้ลงนาม 3 ขั้นอนุมัติตามลำดับ', 'อนุมัติครบแล้วขึ้นปฏิทินให้ทุกคนเห็น'].map((text, index) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold text-sm font-semibold text-panel">{index + 1}</span>
                {text}
              </li>
            ))}
          </ol>
        </div>

        <p className="hidden text-sm text-ink-inverse/55 lg:block">งานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
      </aside>

      <main className="flex items-start justify-center bg-canvas px-4 py-8 sm:items-center sm:px-6 lg:py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-[15px] text-ink-muted">เลือกเข้าด้วยรหัสผ่าน หรือ PIN ที่ได้รับจากผู้ดูแลระบบ</p>

          <div role="tablist" aria-label="วิธีเข้าสู่ระบบ" className="mt-6 grid grid-cols-2 gap-1 rounded-control bg-neutral-soft p-1">
            {([
              { value: 'password', label: 'ชื่อผู้ใช้และรหัสผ่าน', icon: LockKeyhole },
              { value: 'pin', label: 'PIN', icon: KeyRound },
            ] as const).map((tab) => (
              <button
                key={tab.value} type="button" role="tab" aria-selected={mode === tab.value} aria-controls={`login-panel-${tab.value}`}
                onClick={() => setMode(tab.value)}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-2 rounded-inner px-2 text-sm font-medium transition-colors',
                  mode === tab.value ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                )}
              >
                <tab.icon className="size-4 shrink-0" aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>

          {error !== null && (
            <Alert tone="danger" title="เข้าสู่ระบบไม่สำเร็จ" className="mt-5">
              <span role="alert">{error}</span>
            </Alert>
          )}

          {mode === 'password' ? (
            <form id="login-panel-password" role="tabpanel" className="mt-5 space-y-4" onSubmit={submitPassword} noValidate>
              <div>
                <label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-ink">ชื่อผู้ใช้</label>
                <div className="relative">
                  <UserRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" />
                  <input
                    id="login-username" className={fieldClass} value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    maxLength={32} placeholder="เช่น shoyu" required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-ink">รหัสผ่าน</label>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" />
                  <input
                    ref={passwordRef} id="login-password" className={cn(fieldClass, 'pr-12')}
                    type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                    maxLength={PASSWORD_MAX_LENGTH} value={password} onChange={(event) => setPassword(event.target.value)} required
                  />
                  <button
                    type="button" onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <Button type="submit" fullWidth size="lg" loading={busy} loadingLabel="กำลังตรวจสอบ">เข้าสู่ระบบ</Button>
            </form>
          ) : (
            <form id="login-panel-pin" role="tabpanel" className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); submitPin(pin); }} noValidate>
              <PinBoxes inputRef={pinRef} value={pin} onChange={changePin} disabled={busy} />
              <p className="text-sm text-ink-muted">ใส่ครบ {PIN_LENGTH} หลักแล้วเข้าระบบให้ทันที</p>
              <Button type="submit" fullWidth size="lg" loading={busy} loadingLabel="กำลังตรวจสอบ" disabled={pin.length !== PIN_LENGTH}>
                เข้าสู่ระบบด้วย PIN
              </Button>
            </form>
          )}

          <p className="mt-4 text-sm text-ink-subtle">ลืมรหัสผ่านหรือ PIN ติดต่อผู้ดูแลระบบให้รีเซ็ตให้</p>

          {isDemo && (
            <section aria-labelledby="demo-accounts" className="mt-8 border-t border-line pt-5">
              <h2 id="demo-accounts" className="text-sm font-semibold text-ink">บัญชีทดลอง</h2>
              <p className="mt-0.5 text-sm text-ink-muted">ยังไม่ได้เชื่อม Google ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้ กดเพื่อ{mode === 'pin' ? 'เข้าด้วย PIN ของบัญชีนั้น' : 'กรอกชื่อผู้ใช้และรหัสผ่านให้'}</p>
              <ul className="mt-3 divide-y divide-line rounded-card bg-surface ring-1 ring-line">
                {DEMO_LOGINS.map((login) => (
                  <li key={login.username}>
                    <button
                      type="button"
                      onClick={() => pickDemo(login)}
                      aria-pressed={mode === 'password' && username === login.username}
                      className={cn(
                        'flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-sunken',
                        mode === 'password' && username === login.username && 'bg-brand-soft hover:bg-brand-soft',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{login.displayName}</span>
                        <span className="block truncate text-xs text-ink-muted">{USER_ROLE_LABEL_TH[login.role]}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs tabular-nums text-ink-muted">
                        {login.username} · {login.password}
                        <br />
                        PIN {login.pin}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * ช่อง PIN แบบ 6 กล่อง — ข้างใต้เป็น input ช่องเดียว (วาง/เติมอัตโนมัติจากคีย์บอร์ดมือถือได้ปกติ)
 * กล่องเป็นแค่ภาพแสดงว่าพิมพ์ไปกี่หลักแล้ว
 */
function PinBoxes({
  inputRef, value, onChange, disabled,
}: { inputRef: RefObject<HTMLInputElement | null>; value: string; onChange: (pin: string) => void; disabled: boolean }) {
  const [focused, setFocused] = useState(false);
  useEffect(() => { inputRef.current?.focus(); }, [inputRef]);
  return (
    <div>
      <label htmlFor="login-pin" className="mb-1.5 block text-sm font-medium text-ink">PIN {PIN_LENGTH} หลัก</label>
      <div className="relative">
        <input
          ref={inputRef} id="login-pin" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code"
          maxLength={PIN_LENGTH} value={value} disabled={disabled}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div aria-hidden="true" className="grid grid-cols-6 gap-2">
          {Array.from({ length: PIN_LENGTH }, (_, index) => {
            const filled = index < value.length;
            const active = focused && (index === value.length || (index === PIN_LENGTH - 1 && value.length === PIN_LENGTH));
            return (
              <span
                key={index}
                className={cn(
                  'grid aspect-square max-h-14 place-items-center rounded-control border bg-surface transition-colors duration-150',
                  active ? 'border-brand ring-2 ring-brand/20' : filled ? 'border-line-strong' : 'border-line',
                )}
              >
                {filled && <span className="size-3 rounded-full bg-ink" />}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
