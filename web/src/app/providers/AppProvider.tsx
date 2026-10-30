import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SystemSettings } from '@shared/schemas/settings';
import { createApiClient, type ApiClient } from '../../lib/api/client';
import { readAppConfig, type AppConfig } from '../../lib/api/config';
import { ApiError, type SessionUser } from '../../lib/api/types';
import { readLocal, removeLocal, writeLocal } from '../../lib/storage';

const TOKEN_KEY = 'mrb.session.token';
/** บัญชีตัวอย่างที่เลือกไว้ในโหมดข้อมูลในเบราว์เซอร์ — รีเฟรชแล้วยังเป็นคนเดิม */
const DEMO_ACCOUNT_KEY = 'mrb.demo.account';

type Phase = 'booting' | 'anonymous' | 'ready';

interface AppState {
  config: AppConfig;
  api: ApiClient;
  /** โหมดสาธิต = ข้อมูลอยู่ในหน่วยความจำเบราว์เซอร์ ไม่ใช่ข้อมูลจริง */
  isDemo: boolean;
  phase: Phase;
  user: SessionUser | null;
  token: string;
  settings: SystemSettings | null;
  serverTime: Date | null;
  dataVersion: number;
  bootError: string | null;
  signInWithGoogle(idToken: string): Promise<void>;
  signInDemo(role: 'admin' | 'staff'): Promise<void>;
  /** โหมดข้อมูลในเบราว์เซอร์: สลับไปเป็นบัญชีตัวอย่างอื่น (ใช้ลองอนุมัติ 3 ขั้นทีละคน) */
  switchDemoAccount(email: string): Promise<void>;
  signOut(): void;
  retryBoot(): void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const config = useMemo(readAppConfig, []);

  /*
   * เข้าโหมดสาธิตเมื่อ (ก) ผู้ใช้ขอเองด้วย ?demo=1 หรือ (ข) ยังไม่ได้ตั้งค่า server
   * กรณี (ข) สำคัญ: เปิดเว็บจาก GitHub Pages ก่อนตั้งค่าเสร็จ ต้องได้เห็นหน้าตาระบบ
   * พร้อมข้อความบอกตรง ๆ ว่ายังไม่เชื่อมต่อ ไม่ใช่เจอหน้าขาวหรือ error ดิบ ๆ
   */
  const isDemo = config.isDemoRequested || !config.isConnected;

  const api = useMemo(
    () => createApiClient({ apiUrl: config.apiUrl, demo: isDemo }),
    [config.apiUrl, isDemo],
  );

  const [phase, setPhase] = useState<Phase>('booting');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);

  const applyBootstrap = useCallback(
    (result: {
      user: SessionUser;
      settings: SystemSettings;
      dataVersion: number;
      serverTime: string;
    }) => {
      setUser(result.user);
      setSettings(result.settings);
      setDataVersion(result.dataVersion);
      setServerTime(new Date(result.serverTime));
      setBootError(null);
      setPhase('ready');
    },
    [],
  );

  // ยังไม่ได้ต่อเซิร์ฟเวอร์: เข้าระบบในฐานะผู้ดูแลให้ทันที ข้อมูลเก็บในเบราว์เซอร์ของผู้ใช้เอง
  useEffect(() => {
    if (isDemo) {
      let cancelled = false;
      setPhase('booting');
      api
        .loginDemo('admin', readLocal(DEMO_ACCOUNT_KEY) ?? undefined)
        .then((login) => api.bootstrap(login.token).then((result) => ({ login, result })))
        .then(({ login, result }) => {
          if (cancelled) return;
          setToken(login.token);
          applyBootstrap(result);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setBootError(error instanceof Error ? error.message : 'เปิดระบบไม่สำเร็จ');
          setPhase('anonymous');
        });
      return () => { cancelled = true; };
    }

    const token = readLocal(TOKEN_KEY);
    if (token === null) {
      setToken('');
      setPhase('anonymous');
      return;
    }

    let cancelled = false;
    setPhase('booting');

    api
      .bootstrap(token)
      .then((result) => {
        if (!cancelled) { setToken(token); applyBootstrap(result); }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && (error.requiresLogin || error.code === 'FORBIDDEN')) {
          removeLocal(TOKEN_KEY);
          setPhase('anonymous');
          return;
        }
        setBootError(
          error instanceof Error ? error.message : 'เชื่อมต่อระบบไม่สำเร็จ',
        );
        setPhase('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, [api, isDemo, applyBootstrap, bootAttempt]);

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const result = await api.loginWithGoogle(idToken);
      writeLocal(TOKEN_KEY, result.token);
      setToken(result.token);
      const boot = await api.bootstrap(result.token);
      applyBootstrap(boot);
    },
    [api, applyBootstrap],
  );

  const signInDemo = useCallback(
    async (role: 'admin' | 'staff') => {
      const result = await api.loginDemo(role);
      const boot = await api.bootstrap(result.token);
      writeLocal(TOKEN_KEY, result.token);
      setToken(result.token);
      applyBootstrap(boot);
    },
    [api, applyBootstrap],
  );

  const switchDemoAccount = useCallback(
    async (email: string) => {
      const result = await api.loginDemo('admin', email);
      const boot = await api.bootstrap(result.token);
      writeLocal(DEMO_ACCOUNT_KEY, email);
      setToken(result.token);
      applyBootstrap(boot);
    },
    [api, applyBootstrap],
  );

  const signOut = useCallback(() => {
    removeLocal(TOKEN_KEY);
    setToken('');
    window.google?.accounts?.id?.disableAutoSelect();
    setUser(null);
    setSettings(null);
    setPhase('anonymous');
  }, []);

  const retryBoot = useCallback(() => {
    setBootError(null);
    setBootAttempt((count) => count + 1);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      config,
      api,
      isDemo,
      phase,
      user,
      token,
      settings,
      serverTime,
      dataVersion,
      bootError,
      signInWithGoogle,
      signInDemo,
      switchDemoAccount,
      signOut,
      retryBoot,
    }),
    [
      config,
      api,
      isDemo,
      phase,
      user,
      token,
      settings,
      serverTime,
      dataVersion,
      bootError,
      signInWithGoogle,
      signInDemo,
      switchDemoAccount,
      signOut,
      retryBoot,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const context = useContext(AppContext);
  if (context === null) throw new Error('useApp ต้องอยู่ภายใน AppProvider');
  return context;
}

/** ใช้ในหน้าที่ต้องล็อกอินแล้วเท่านั้น — การ์ดหน้าเว็บรับประกันว่ามีผู้ใช้แล้ว */
export function useCurrentUser(): SessionUser {
  const { user } = useApp();
  if (user === null) throw new Error('ยังไม่มีผู้ใช้ที่เข้าสู่ระบบ');
  return user;
}

export function useSettings(): SystemSettings {
  const { settings } = useApp();
  if (settings === null) throw new Error('ยังไม่ได้โหลดค่าตั้งค่าระบบ');
  return settings;
}
