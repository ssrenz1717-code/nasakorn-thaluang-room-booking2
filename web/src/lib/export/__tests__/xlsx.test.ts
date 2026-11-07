import { describe, expect, it } from 'vitest';
import { buildXlsx, columnName, crc32 } from '../xlsx';

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe('xlsx', () => {
  it('CRC-32 ตรงค่ามาตรฐาน', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('ชื่อคอลัมน์ A..Z, AA', () => {
    expect([0, 25, 26, 27, 701].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ']);
  });

  it('ข้อความที่ขึ้นต้นด้วย = เป็นข้อความ ไม่ใช่สูตร และ escape อักขระ XML', () => {
    const bytes = buildXlsx([{ name: 'รายการ/จอง', rows: [['หัวข้อ', 'คน'], ['=HYPERLINK("x")<b>', 12]], boldRows: [0] }]);
    expect(text(bytes.slice(0, 2))).toBe('PK');
    const body = text(bytes);
    expect(body).toContain('t="inlineStr"><is><t xml:space="preserve">=HYPERLINK(&quot;x&quot;)&lt;b&gt;</t>');
    expect(body).not.toContain('<f>');
    expect(body).toContain('<c r="B2"><v>12</v></c>');
    expect(body).toContain('name="รายการ จอง"');
  });
});
