import { useEffect, useRef } from 'react';
import { BOOKINGS_CHANGED_EVENT } from '../api/client';

/**
 * โหลดข้อมูลใหม่เองเมื่อสถานะการจองอาจเปลี่ยน — ไม่ต้องกดรีเฟรช:
 *  - มีการจอง/ยกเลิก/อนุมัติในแอปนี้ (สัญญาณจาก API client)
 *  - กลับมาที่แท็บนี้ (อาจมีคนอื่นอนุมัติระหว่างที่ไปทำอย่างอื่น)
 *  - ทุก 30 วินาทีขณะเปิดหน้าอยู่ (รับการเปลี่ยนจากเครื่องอื่น)
 */
export function useLiveRefresh(reload: () => unknown, intervalMs = 30_000): void {
  const latest = useRef(reload);
  latest.current = reload;

  useEffect(() => {
    const run = () => { void latest.current(); };
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    const timer = window.setInterval(onVisible, intervalMs);
    window.addEventListener(BOOKINGS_CHANGED_EVENT, run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(BOOKINGS_CHANGED_EVENT, run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
}
