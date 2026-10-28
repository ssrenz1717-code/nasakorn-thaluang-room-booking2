import { buildSync } from 'esbuild';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * เทสนี้ปกป้องความเสี่ยงทางสถาปัตยกรรมอันดับ 1 ของโปรเจกต์
 *
 * โค้ดใน shared/ ต้องรันได้บน Google Apps Script ซึ่งเป็น V8 ที่
 *  - ไม่มี ES Modules, ไม่มี require(), ไม่มี npm
 *  - ไม่มี Node API (process, Buffer, TextEncoder)
 *  - ไม่รองรับ dynamic import()
 *
 * ถ้าใครเผลอใช้ของเหล่านี้ ปัญหาจะไปโผล่ตอนรันบน Apps Script จริง
 * ซึ่ง debug ยากมาก (ไม่มี stack trace ที่อ่านรู้เรื่อง) เทสนี้จึงดักไว้ที่เครื่อง
 */

const FORBIDDEN = [
  'require(',
  'module.exports',
  'process.',
  'import(',
  'TextEncoder',
  'structuredClone',
  'queueMicrotask',
  'WeakRef',
];

function bundleForAppsScript(): string {
  const result = buildSync({
    entryPoints: [join(import.meta.dirname, '..', 'index.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'Domain',
    target: 'es2019',
    platform: 'neutral',
    logLevel: 'silent',
  });
  const file = result.outputFiles[0];
  if (file === undefined) throw new Error('esbuild ไม่ได้คืนไฟล์ผลลัพธ์');
  return file.text;
}

describe('bundle สำหรับ Google Apps Script', () => {
  const code = bundleForAppsScript();

  it('ไม่มีสิ่งที่ Apps Script ไม่รองรับหลุดเข้ามาใน bundle', () => {
    const found = FORBIDDEN.filter((token) => code.includes(token));
    expect(found).toEqual([]);
  });

  it('ขนาดไม่บานเกินควร (Apps Script แก้ไฟล์ใหญ่แล้วหนืด)', () => {
    expect(code.length).toBeLessThan(150_000);
  });

  it('รันได้จริงในสภาพแวดล้อมที่ไม่มี module system เลย', () => {
    const host: Record<string, unknown> = {};
    // เลียนแบบ Apps Script: ไม่มี require/module/exports ให้ใช้
    new Function('globalThis', `${code};globalThis.Domain = Domain;`)(host);
    const domain = host.Domain as typeof import('../index');

    expect(domain.overlaps({ startMin: 540, endMin: 600 }, { startMin: 600, endMin: 660 })).toBe(
      false,
    );
    expect(domain.overlaps({ startMin: 540, endMin: 600 }, { startMin: 570, endMin: 630 })).toBe(
      true,
    );
    expect(domain.toDateKey(new Date('2026-10-27T17:30:00Z'))).toBe('2026-10-28');
    expect(domain.canTransition('confirmed', 'pending')).toBe(false);
    expect(domain.holdsRoomLock('cancelled')).toBe(false);
    expect(domain.formatUtilization(null)).toBe('–');

    const bad = domain.validateBookingRequest({
      title: 'x',
      roomId: 'r',
      dateKey: '2026-10-28',
      startMin: 660,
      endMin: 600,
      attendees: 1,
    });
    expect(bad.ok).toBe(false);
  });
});
