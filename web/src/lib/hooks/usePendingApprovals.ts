import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../app/providers/AppProvider';
import { BOOKINGS_CHANGED_EVENT } from '../api/client';

/**
 * จำนวนคำขอที่รออนุมัติ — ใช้แสดงป้ายแดงบนเมนู
 *
 * นับเฉพาะผู้ดูแลระบบ (พนักงานไม่มีเมนูอนุมัติ) โหลดใหม่เมื่อ:
 *  - เปลี่ยนหน้า (ข้อมูลอาจเปลี่ยนระหว่างที่ผู้ใช้อยู่หน้าอื่น)
 *  - มีการจอง/ยกเลิก/อนุมัติ/ปฏิเสธ (สัญญาณจาก API client)
 */
export function usePendingApprovals(): number {
  const { api, token, user } = useApp();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);
  const [changes, setChanges] = useState(0);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const onChange = () => setChanges((value) => value + 1);
    window.addEventListener(BOOKINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(BOOKINGS_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!isAdmin || token === '') {
      setCount(0);
      return;
    }
    let cancelled = false;
    api
      .bookings(token)
      .then(({ bookings }) => {
        if (!cancelled) setCount(bookings.filter((booking) => booking.status === 'pending').length);
      })
      // โหลดไม่สำเร็จก็แค่ไม่แสดงป้าย ไม่ควรทำให้เมนูทั้งแถบพัง
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api, token, isAdmin, pathname, changes]);

  return count;
}
