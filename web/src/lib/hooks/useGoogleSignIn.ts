/**
 * ปุ่มเข้าสู่ระบบด้วย Google (Google Identity Services)
 *
 * ขั้นตอน: โหลดสคริปต์ GIS -> initialize ด้วย Client ID -> renderButton
 * ผู้ใช้กด -> GIS คืน ID token (JWT) -> เราส่งให้ Apps Script ตรวจกับ Google
 *
 * ไม่เก็บอะไรจาก GIS ไว้ฝั่งหน้าเว็บเลย ตัวตนจริงถูกตัดสินที่ server เท่านั้น
 */

import { useEffect, useRef, useState } from 'react';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'small' | 'medium' | 'large';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      locale?: string;
      width?: number;
    },
  ): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

type Status = 'loading' | 'ready' | 'unavailable';

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id !== undefined) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing !== null) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('โหลดสคริปต์ Google ไม่สำเร็จ')));
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('โหลดสคริปต์ Google ไม่สำเร็จ'));
    document.head.appendChild(script);
  });
}

export function useGoogleSignIn(options: {
  clientId: string;
  enabled: boolean;
  onCredential: (idToken: string) => void;
}): { status: Status; buttonRef: React.RefObject<HTMLDivElement | null> } {
  const [status, setStatus] = useState<Status>(options.enabled ? 'loading' : 'unavailable');
  const buttonRef = useRef<HTMLDivElement>(null);

  // เก็บ callback ล่าสุดไว้ใน ref เพื่อไม่ให้ GIS ถูก initialize ใหม่ทุกครั้งที่ re-render
  const callbackRef = useRef(options.onCredential);
  callbackRef.current = options.onCredential;

  useEffect(() => {
    if (!options.enabled || options.clientId === '') {
      setStatus('unavailable');
      return;
    }

    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled) return;
        const accounts = window.google?.accounts?.id;
        if (accounts === undefined || buttonRef.current === null) {
          setStatus('unavailable');
          return;
        }

        accounts.initialize({
          client_id: options.clientId,
          callback: (response) => {
            if (typeof response.credential === 'string' && response.credential !== '') {
              callbackRef.current(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        accounts.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'th',
        });

        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [options.clientId, options.enabled]);

  return { status, buttonRef };
}
