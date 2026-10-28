import { buildSync, transformSync } from 'esbuild';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ตรวจไฟล์ฝั่ง Apps Script โดยไม่ต้อง deploy
 *
 * Apps Script ไม่มี unit test ในเครื่อง และ error จะโผล่ตอนผู้ใช้กดใช้งานจริง
 * เทสนี้จึงดักสองเรื่องที่พบบ่อยที่สุดไว้ก่อน:
 *  1. syntax error — ไฟล์ .gs พังทั้งโปรเจกต์ ไม่ใช่พังแค่ฟังก์ชันเดียว
 *  2. เรียก Domain.xxx ที่ไม่มีอยู่จริง (พิมพ์ชื่อผิด / เปลี่ยนชื่อฟังก์ชันแล้วลืมแก้)
 *     ซึ่ง TypeScript ช่วยไม่ได้เพราะไฟล์ .gs เป็น JavaScript ล้วน
 */

const APPS_SCRIPT_DIR = join(import.meta.dirname, '..', '..', 'apps-script');

function appsScriptFiles(): { name: string; code: string }[] {
  return readdirSync(APPS_SCRIPT_DIR)
    .filter((name) => name.endsWith('.gs') && name !== 'Domain.gs')
    .sort()
    .map((name) => ({ name, code: readFileSync(join(APPS_SCRIPT_DIR, name), 'utf8') }));
}

/**
 * ตัดคอมเมนต์และข้อความในเครื่องหมายคำพูดออก ก่อนจะไปค้นหาการเรียกใช้โค้ด
 * ไม่งั้นข้อความอย่าง "ตรวจว่าไฟล์ Domain.gs ถูก push แล้ว" จะถูกนับว่าเรียก Domain.gs
 */
function stripCommentsAndStrings(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\\.|[^`\\])*`/g, "''")
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, "''");
}

function domainExports(): Set<string> {
  const built = buildSync({
    entryPoints: [join(import.meta.dirname, '..', 'index.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'Domain',
    target: 'es2019',
    platform: 'neutral',
    logLevel: 'silent',
  });
  const file = built.outputFiles[0];
  if (file === undefined) throw new Error('esbuild ไม่ได้คืนไฟล์ผลลัพธ์');

  const host: Record<string, unknown> = {};
  new Function('globalThis', `${file.text};globalThis.Domain = Domain;`)(host);
  return new Set(Object.keys(host.Domain as object));
}

describe('ไฟล์ฝั่ง Apps Script', () => {
  const files = appsScriptFiles();

  it('มีไฟล์ให้ตรวจ', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it('ทุกไฟล์ syntax ถูกต้องและเข้ากันได้กับรันไทม์ V8 ของ Apps Script', () => {
    for (const file of files) {
      expect(() =>
        transformSync(file.code, { loader: 'js', target: 'es2019' }),
      ).not.toThrow();
    }
  });

  it('ทุก Domain.xxx ที่ถูกเรียก มีอยู่จริงใน bundle', () => {
    const available = domainExports();
    const missing: string[] = [];

    for (const file of files) {
      const code = stripCommentsAndStrings(file.code);
      const names = [...code.matchAll(/\bDomain\.([A-Za-z_$][\w$]*)/g)].map(
        (match) => match[1],
      );
      for (const name of names) {
        if (name !== undefined && !available.has(name)) {
          missing.push(`${file.name} เรียก Domain.${name}`);
        }
      }
    }

    expect([...new Set(missing)]).toEqual([]);
  });

  it('ไม่มีไฟล์ไหนใช้ของที่ Apps Script ไม่มี', () => {
    const forbidden = ['require(', 'module.exports', 'import ', 'export ', 'process.env'];
    const violations: string[] = [];

    for (const file of files) {
      const code = stripCommentsAndStrings(file.code);
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file.name} มี "${token}"`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('ทุกการเขียนข้อมูลที่ต้องตัดสินจากข้อมูลเดิม ต้องอยู่ในล็อก', () => {
    // login_ สร้างผู้ดูแลคนแรกจากการตรวจว่า "ยังไม่มีผู้ใช้คนนี้" จึงต้องอยู่ในล็อก
    const auth = files.find((file) => file.name === '30_Auth.gs');
    expect(auth).toBeDefined();
    expect(auth?.code).toContain('withScriptLock_');
  });
});
