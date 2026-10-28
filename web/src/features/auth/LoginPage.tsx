import { useState } from 'react';
import {
  CalendarCheck2,
  TriangleAlert,
} from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { useGoogleSignIn } from '../../lib/hooks/useGoogleSignIn';
import { ApiError } from '../../lib/api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

export function LoginPage() {
  const { config, isDemo, signInWithGoogle, signInDemo, bootError } = useApp();
  const [error, setError] = useState<string | null>(bootError);
  const [busy, setBusy] = useState<'google' | 'demo-admin' | 'demo-staff' | null>(null);

  const handleCredential = (idToken: string) => {
    setBusy('google');
    setError(null);
    signInWithGoogle(idToken)
      .catch((cause: unknown) => {
        setError(
          cause instanceof ApiError || cause instanceof Error
            ? cause.message
            : 'เข้าสู่ระบบไม่สำเร็จ',
        );
      })
      .finally(() => setBusy(null));
  };

  const { status: googleStatus, buttonRef } = useGoogleSignIn({
    clientId: config.googleClientId,
    enabled: !isDemo,
    onCredential: handleCredential,
  });

  const handleDemo = (role: 'admin' | 'staff') => {
    setBusy(role === 'admin' ? 'demo-admin' : 'demo-staff');
    setError(null);
    signInDemo(role)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'เข้าสู่ระบบไม่สำเร็จ');
      })
      .finally(() => setBusy(null));
  };

  return (
    <div className="bg-brand-gradient grid min-h-dvh place-items-center p-4 sm:p-6">
      <section className="w-full max-w-md">
        <div className="w-full rounded-card bg-surface p-6 shadow-raised ring-1 ring-line/70 sm:p-8">
          <div className="mb-6">
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-inner bg-brand text-ink-inverse"
            >
              <CalendarCheck2 className="size-6" />
            </span>
            <p className="mt-3 text-sm font-medium text-ink-muted">ระบบจองห้องประชุม</p>
          </div>

          <h1 className="text-xl font-semibold text-ink">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-[15px] text-ink-muted">
            ใช้บัญชี Google ที่ผู้ดูแลเพิ่มไว้ในระบบ
          </p>

          {error !== null && (
            <Alert tone="danger" title="เข้าสู่ระบบไม่สำเร็จ" className="mt-6">
              {error}
            </Alert>
          )}

          {isDemo ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-2.5">
                <Button
                  fullWidth
                  size="lg"
                  loading={busy === 'demo-admin'}
                  loadingLabel="กำลังเข้าสู่ระบบ"
                  onClick={() => handleDemo('admin')}
                >
                  เข้าสู่ระบบในฐานะผู้ดูแลระบบ
                </Button>
                <Button
                  fullWidth
                  size="lg"
                  variant="secondary"
                  loading={busy === 'demo-staff'}
                  loadingLabel="กำลังเข้าสู่ระบบ"
                  onClick={() => handleDemo('staff')}
                >
                  เข้าสู่ระบบในฐานะเจ้าหน้าที่
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {/* ปุ่มของ Google ถูกวาดลงใน div นี้โดยสคริปต์ของ Google เอง */}
              <div ref={buttonRef} className="flex min-h-11 justify-center [color-scheme:light]" />

              {googleStatus === 'loading' && (
                <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
                  <Spinner size="sm" /> กำลังโหลดปุ่มเข้าสู่ระบบ
                </p>
              )}

              {googleStatus === 'unavailable' && (
                <Alert tone="danger" title="โหลดปุ่มเข้าสู่ระบบไม่ได้">
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                      ตรวจว่าตั้งค่า VITE_GOOGLE_CLIENT_ID ถูกต้อง และเพิ่มที่อยู่เว็บนี้ใน
                      Authorized JavaScript origins ของ OAuth Client แล้ว
                    </span>
                  </div>
                </Alert>
              )}

              {busy === 'google' && (
                <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
                  <Spinner size="sm" /> กำลังตรวจสอบสิทธิ์กับเซิร์ฟเวอร์
                </p>
              )}

              <p className="text-center text-sm text-ink-subtle">
                เข้าไม่ได้? อีเมลของคุณต้องถูกเพิ่มในระบบโดยผู้ดูแลก่อน
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
