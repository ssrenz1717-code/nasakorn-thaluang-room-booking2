import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../app/providers/AppProvider';
import { BOOKINGS_CHANGED_EVENT } from '../api/client';
import { isAwaitingRole } from '@shared/domain/approval';

/**
 * จำนวนคำขอที่รออนุมัติ — ใช้แสดงป้ายแดงบนเมนู
 *
 * ผู้ลงนามแต่ละขั้น: นับเฉพาะคำขอที่ "รอคุณ" อยู่ตอนนี้ (ขั้นก่อนหน้าผ่านแล้ว)
 * ผู้ดูแลระบบ: นับคำขอที่ยังค้างทุกขั้น / ผู้ใช้ทั่วไป: ไม่มีเมนูนี้
 * โหลดใหม่เมื่อ:
 *  - เปลี่ยนหน้า (ข้อมูลอาจเปลี่ยนระหว่างที่ผู้ใช้อยู่หน้าอื่น)
 *  - มีการจอง/ยกเลิก/อนุมัติ/ปฏิเสธ (สัญญาณจาก API client)
 */
export function usePendingApprovals(): number {
  const { api, token, user } = useApp();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);
  const [changes, setChanges] = useState(0);
  const role = user?.role ?? 'staff';
  const counts = role !== 'staff';

  useEffect(() => {
    const onChange = () => setChanges((value) => value + 1);
    window.addEventListener(BOOKINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(BOOKINGS_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!counts || token === '') {
      setCount(0);
      return;
    }
    let cancelled = false;
    api
      .bookings(token)
      .then(({ bookings }) => {
        if (!cancelled) setCount(bookings.filter((booking) => role === 'admin' ? booking.status === 'pending' : isAwaitingRole(booking, role)).length);
      })
      // โหลดไม่สำเร็จก็แค่ไม่แสดงป้าย ไม่ควรทำให้เมนูทั้งแถบพัง
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api, token, role, counts, pathname, changes]);

  return count;
}
