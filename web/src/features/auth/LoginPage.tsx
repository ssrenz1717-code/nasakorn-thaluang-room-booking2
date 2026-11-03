import { useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, UserRound } from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { DEMO_LOGINS } from '../../lib/api/demo';
import { USER_ROLE_LABEL_TH, PIN_LENGTH } from '@shared/schemas/user';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';

const fieldClass =
  'min-h-12 w-full rounded-control border border-line bg-surface pl-10 pr-3 text-base text-ink outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20';

/**
 * เข้าสู่ระบบด้วยชื่อผู้ใช้ + PIN 6 หลัก (ผู้ดูแลสร้างบัญชีและตั้ง PIN ให้ในหน้าจัดการผู้ใช้)
 * โหมดข้อมูลในเบราว์เซอร์มีรายชื่อบัญชีทดลองให้กดเลือก — ข้อมูลอยู่ในเครื่องผู้เปิดเว็บเท่านั้น
 */
export function LoginPage() {
  const { isDemo, signIn, bootError } = useApp();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(bootError);
  const pinRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (username.trim() === '' || pin.length !== PIN_LENGTH) {
      setError(username.trim() === '' ? 'กรุณากรอกชื่อผู้ใช้' : `กรุณากรอก PIN ให้ครบ ${PIN_LENGTH} หลัก`);
      return;
    }
    setBusy(true);
    setError(null);
    signIn(username, pin)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'เข้าสู่ระบบไม่สำเร็จ');
        setPin('');
        pinRef.current?.focus();
      })
      .finally(() => setBusy(false));
  };

  const pickDemo = (login: (typeof DEMO_LOGINS)[number]) => {
    setUsername(login.username);
    setPin(login.pin);
    setError(null);
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
          <p className="mt-1 text-[15px] text-ink-muted">ใช้ชื่อผู้ใช้และ PIN ที่ได้รับจากผู้ดูแลระบบ</p>

          {error !== null && (
            <Alert tone="danger" title="เข้าสู่ระบบไม่สำเร็จ" className="mt-5">
              <span role="alert">{error}</span>
            </Alert>
          )}

          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            <div>
              <label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-ink">ชื่อผู้ใช้</label>
              <div className="relative">
                <UserRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" />
                <input
                  id="login-username"
                  className={fieldClass}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={32}
                  placeholder="เช่น shoyu"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-pin" className="mb-1.5 block text-sm font-medium text-ink">PIN {PIN_LENGTH} หลัก</label>
              <div className="relative">
                <KeyRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" />
                <input
                  ref={pinRef}
                  id="login-pin"
                  className={cn(fieldClass, 'pr-12 tracking-[0.4em] tabular-nums placeholder:tracking-normal')}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="current-password"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin((value) => !value)}
                  aria-label={showPin ? 'ซ่อน PIN' : 'แสดง PIN'}
                  aria-pressed={showPin}
                  className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-control text-ink-muted hover:bg-neutral-soft hover:text-ink"
                >
                  {showPin ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth size="lg" loading={busy} loadingLabel="กำลังตรวจสอบ">
              เข้าสู่ระบบ
            </Button>
          </form>

          <p className="mt-4 text-sm text-ink-subtle">ลืม PIN หรือยังไม่มีบัญชี ติดต่อผู้ดูแลระบบให้รีเซ็ตหรือเพิ่มบัญชีให้</p>

          {isDemo && (
            <section aria-labelledby="demo-accounts" className="mt-8 border-t border-line pt-5">
              <h2 id="demo-accounts" className="text-sm font-semibold text-ink">บัญชีทดลอง</h2>
              <p className="mt-0.5 text-sm text-ink-muted">ยังไม่ได้เชื่อม Google ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้ กดเพื่อกรอกให้อัตโนมัติ</p>
              <ul className="mt-3 divide-y divide-line rounded-card bg-surface ring-1 ring-line">
                {DEMO_LOGINS.map((login) => (
                  <li key={login.username}>
                    <button
                      type="button"
                      onClick={() => pickDemo(login)}
                      aria-pressed={username === login.username}
                      className={cn(
                        'flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-sunken',
                        username === login.username && 'bg-brand-soft hover:bg-brand-soft',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{login.displayName}</span>
                        <span className="block truncate text-xs text-ink-muted">{USER_ROLE_LABEL_TH[login.role]}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs tabular-nums text-ink-muted">
                        {login.username}
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
