import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  activeLookups, defaultLookups, lookupLabel, type LookupItem, type LookupKind,
} from '@shared/schemas/lookup';
import { useOptionalApp } from '../../app/providers/AppProvider';
import { CATALOG_CHANGED_EVENT } from '../api/client';

/**
 * ค่าล่าสุดที่โหลดได้ ใช้ร่วมกันทุกหน้า — เปิดหน้าใหม่แล้วเห็นรายการทันที ไม่ต้องรอโหลดซ้ำ
 * ก่อนโหลดครั้งแรกใช้ชุดเริ่มต้น แบบฟอร์มจึงใช้ได้เสมอแม้เครือข่ายช้า
 */
let cached: LookupItem[] | null = null;

export interface Lookups {
  items: LookupItem[];
  /** ชื่อที่แสดงของรหัส (รวมรายการที่ปิดไปแล้ว) */
  label: (kind: LookupKind, key: string) => string;
  /** รายการที่เลือกได้ในแบบฟอร์ม เรียงตามลำดับที่ผู้ดูแลตั้ง */
  active: (kind: LookupKind) => LookupItem[];
  reload: () => Promise<void>;
}

export function useLookups(): Lookups {
  const app = useOptionalApp();
  const api = app?.api;
  const token = app?.token ?? '';
  const [items, setItems] = useState<LookupItem[]>(() => cached ?? defaultLookups());

  const reload = useCallback(async () => {
    if (!api || token === '') return;
    try {
      const { lookups } = await api.lookups(token);
      cached = lookups;
      setItems(lookups);
    } catch {
      // โหลดไม่ได้ใช้รายการเดิมต่อ — หน้าที่เรียกจะแสดงข้อผิดพลาดของมันเองถ้าจำเป็น
    }
  }, [api, token]);

  useEffect(() => {
    void reload();
    const onChange = () => { void reload(); };
    window.addEventListener(CATALOG_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CATALOG_CHANGED_EVENT, onChange);
  }, [reload]);

  return useMemo(() => ({
    items,
    label: (kind: LookupKind, key: string) => lookupLabel(items, kind, key),
    active: (kind: LookupKind) => activeLookups(items, kind),
    reload,
  }), [items, reload]);
}
