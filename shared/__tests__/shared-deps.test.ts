import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * กฎเหล็กของโฟลเดอร์ shared: ห้ามพึ่ง dependency ภายนอกเลยแม้แต่ตัวเดียว
 *
 * เหตุผล: โค้ดในนี้ถูก bundle ไปรันบน Google Apps Script ด้วย
 * Apps Script ไม่มี ES Modules และไม่มี npm — ถ้ามีใครเพิ่ม import ของแพ็กเกจ
 * ภายนอก โค้ดจะ bundle ไม่ผ่านหรือพังตอนรันบน Apps Script ซึ่งหาสาเหตุยากมาก
 * เทสนี้จึงบังคับกฎไว้ ไม่ใช่เขียนเตือนใน README แล้วหวังว่าจะมีคนอ่าน
 */

const ALLOWED_PACKAGES = new Set<string>();
const SHARED_DIR = join(import.meta.dirname, '..');

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectSourceFiles(full);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [full] : [];
  });
}

describe('กฎ dependency ของ shared', () => {
  const files = collectSourceFiles(SHARED_DIR);

  it('มีไฟล์ให้ตรวจจริง', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('ทุกไฟล์ import ได้แค่ path แบบ relative เท่านั้น', () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const specifiers = [...source.matchAll(/\bfrom\s+'([^']+)'/g)].map((match) => match[1]);

      for (const specifier of specifiers) {
        if (specifier === undefined) continue;
        if (specifier.startsWith('.')) continue;
        const packageName = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0];
        if (packageName !== undefined && !ALLOWED_PACKAGES.has(packageName)) {
          violations.push(`${file.replace(SHARED_DIR, 'shared')} -> ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
