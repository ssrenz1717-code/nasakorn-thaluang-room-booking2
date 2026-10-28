import { useEffect, useState } from 'react';
import type { BusySlot } from '@shared/domain/availability';
import { DATE_KEY_PATTERN } from '@shared/time/bangkok';
import { useApp } from '../../app/providers/AppProvider';
import { BOOKINGS_CHANGED_EVENT } from '../api/client';

/**
 * ช่วงเวลาที่ห้องนี้ถูกจองไว้ในวันที่เลือก — โหลดใหม่ทุกครั้งที่เปลี่ยนห้อง/วัน
 * และเมื่อมีการจอง/ยกเลิก/อนุมัติในแอป ฟอร์มจึงบอกผู้ใช้ได้ก่อนกดส่ง
 */
export function useRoomAvailability(roomId: string, dateKey: string): { busy: BusySlot[]; loading: boolean } {
  const { api, token } = useApp();
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState(0);

  useEffect(() => {
    const onChange = () => setChanges((value) => value + 1);
    window.addEventListener(BOOKINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(BOOKINGS_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (roomId === '' || !DATE_KEY_PATTERN.test(dateKey) || token === '') {
      setBusy([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .availability(token, roomId, dateKey)
      .then(({ busy: slots }) => {
        if (!cancelled) setBusy(slots);
      })
      // ดึงไม่สำเร็จก็ยังจองได้ เซิร์ฟเวอร์ตรวจซ้ำตอนส่งอยู่แล้ว
      .catch(() => {
        if (!cancelled) setBusy([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, token, roomId, dateKey, changes]);

  return { busy, loading };
}
