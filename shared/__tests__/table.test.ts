import { describe, expect, it } from 'vitest';
import {
  type SheetRow,
  buildHeaderMap,
  findRowNumber,
  keyValueToObject,
  missingColumns,
  objectToRow,
  readBoolean,
  readList,
  readNumber,
  readString,
  rowToObject,
  rowsToObjects,
  sanitizeForSheet,
  writeList,
} from '../store/table';

const header = ['bookingId', 'roomId', 'startMin', 'status'];

describe('แปลงแถวในชีตเป็น object', () => {
  it('จับคู่ชื่อคอลัมน์กับตำแหน่งจากหัวตารางจริง', () => {
    expect(buildHeaderMap(header)).toEqual({
      bookingId: 0,
      roomId: 1,
      startMin: 2,
      status: 3,
    });
  });

  it('ข้ามหัวคอลัมน์ที่ว่างหรือไม่ใช่ข้อความ', () => {
    expect(buildHeaderMap(['a', '', null, 5, 'b'])).toEqual({ a: 0, b: 4 });
  });

  it('ฟ้องได้ว่าคอลัมน์ไหนหายไปจากชีต', () => {
    expect(missingColumns(header, ['bookingId', 'userEmail', 'status'])).toEqual(['userEmail']);
    expect(missingColumns(header, ['bookingId'])).toEqual([]);
  });

  it('แถวที่สั้นกว่าหัวตาราง (คนลบข้อมูลท้ายแถว) ต้องได้ null ไม่ใช่ undefined', () => {
    const map = buildHeaderMap(header);
    expect(rowToObject(['b1', 'r1'], map)).toEqual({
      bookingId: 'b1',
      roomId: 'r1',
      startMin: null,
      status: null,
    });
  });

  it('แปลงหลายแถวพร้อมกัน', () => {
    const map = buildHeaderMap(header);
    const rows: SheetRow[] = [
      ['b1', 'r1', 540, 'confirmed'],
      ['b2', 'r2', 600, 'cancelled'],
    ];
    expect(rowsToObjects(rows, map).map((row) => row.bookingId)).toEqual(['b1', 'b2']);
  });

  it('แปลง object กลับเป็นแถวตามลำดับคอลัมน์ของชีต และไม่เขียนคำว่า undefined ลงชีต', () => {
    expect(objectToRow({ status: 'pending', bookingId: 'b9' }, header)).toEqual([
      'b9',
      '',
      '',
      'pending',
    ]);
  });
});

describe('อ่านค่าจากชีตแบบทนข้อมูลที่คนพิมพ์มือ', () => {
  const row = {
    name: 'ห้องใหญ่',
    capacity: '20',
    broken: 'ยี่สิบ',
    flagTrue: 'ใช่',
    flagFalse: 'ไม่',
    equipment: ' projector, tv ,, whiteboard ',
    empty: '',
    when: new Date('2026-10-28T02:00:00Z'),
  };

  it('อ่านข้อความ', () => {
    expect(readString(row, 'name')).toBe('ห้องใหญ่');
    expect(readString(row, 'capacity')).toBe('20');
    expect(readString(row, 'ไม่มีคอลัมน์นี้')).toBe('');
    expect(readString(row, 'when')).toBe('2026-10-28T02:00:00.000Z');
  });

  it('อ่านตัวเลขที่ถูกเก็บมาเป็นข้อความได้ และกันค่าที่ไม่ใช่ตัวเลข', () => {
    expect(readNumber(row, 'capacity')).toBe(20);
    expect(readNumber(row, 'broken', -1)).toBe(-1);
    expect(readNumber(row, 'empty', 7)).toBe(7);
    expect(readNumber(row, 'ไม่มี', 3)).toBe(3);
  });

  it('อ่านค่าใช่/ไม่ใช่ ทั้งภาษาไทยและอังกฤษ', () => {
    expect(readBoolean(row, 'flagTrue')).toBe(true);
    expect(readBoolean(row, 'flagFalse')).toBe(false);
    expect(readBoolean({ x: 'TRUE' }, 'x')).toBe(true);
    expect(readBoolean({ x: 1 }, 'x')).toBe(true);
    expect(readBoolean({}, 'x', true)).toBe(true);
  });

  it('อ่านรายการที่คั่นด้วยจุลภาค ตัดช่องว่างและค่าว่างทิ้ง', () => {
    expect(readList(row, 'equipment')).toEqual(['projector', 'tv', 'whiteboard']);
    expect(readList(row, 'empty')).toEqual([]);
    expect(writeList(['projector', 'tv'])).toBe('projector,tv');
  });
});

describe('ชีตแบบ key-value และการหาเลขแถว', () => {
  it('แปลง Settings เป็น object และข้ามแถวที่ key ว่าง', () => {
    expect(
      keyValueToObject([
        ['approvalRequired', false],
        ['  slotMinutes  ', 15],
        ['', 'ค่านี้ต้องถูกข้าม'],
      ]),
    ).toEqual({ approvalRequired: false, slotMinutes: 15 });
  });

  it('หาเลขแถวจริงในชีตได้ และคืน -1 เมื่อไม่พบ', () => {
    const rows: SheetRow[] = [['b1'], ['b2'], ['b3']];
    expect(findRowNumber(rows, 0, 'b1')).toBe(2);
    expect(findRowNumber(rows, 0, 'b3')).toBe(4);
    expect(findRowNumber(rows, 0, 'ไม่มีอยู่')).toBe(-1);
  });

  it('เทียบค่าแบบข้อความเสมอ เพราะชีตอาจคืนรหัสที่เป็นเลขมาเป็น number', () => {
    const rows: SheetRow[] = [[1001], [1002]];
    expect(findRowNumber(rows, 0, '1002')).toBe(3);
  });
});

describe('ป้องกันการแทรกสูตรลงชีต (Sheets formula injection)', () => {
  const header = ['title', 'note'];

  it('ข้อความที่เริ่มด้วยอักขระสร้างสูตร ถูกบังคับเป็นข้อความล้วน', () => {
    const attacks = [
      '=IMPORTRANGE("https://docs.google.com/x","A1")',
      '=HYPERLINK("http://evil.example","กดที่นี่")',
      '+1+1',
      '-1+1',
      '@SUM(A1:A9)',
      '\tcmd',
      '\rcmd',
    ];

    for (const attack of attacks) {
      const row = objectToRow({ title: attack, note: '' }, header);
      expect(String(row[0]).charAt(0), `ค่า ${JSON.stringify(attack)}`).toBe("'");
      expect(String(row[0])).toBe(`'${attack}`);
    }
  });

  it('sanitizeForSheet ทำงานกับค่าเดี่ยวได้ด้วย', () => {
    expect(sanitizeForSheet('=1+1')).toBe("'=1+1");
    expect(sanitizeForSheet('ปกติ')).toBe('ปกติ');
    expect(sanitizeForSheet(42)).toBe(42);
    expect(sanitizeForSheet(null)).toBeNull();
    expect(sanitizeForSheet('')).toBe('');
  });

  it('ข้อความไทยและข้อความปกติไม่ถูกแก้ไข', () => {
    for (const safe of ['ประชุมประจำสัปดาห์', 'Weekly sync', 'ห้อง 2/3', '1+1', 'a=b']) {
      expect(objectToRow({ title: safe }, header)[0]).toBe(safe);
    }
  });

  it('ตัวเลข วันที่ และค่าว่าง ไม่ถูกแตะ', () => {
    const when = new Date('2026-10-28T02:00:00Z');
    expect(objectToRow({ title: 540 }, ['title'])[0]).toBe(540);
    expect(objectToRow({ title: when }, ['title'])[0]).toBe(when);
    expect(objectToRow({ title: '' }, ['title'])[0]).toBe('');
    expect(objectToRow({}, ['title'])[0]).toBe('');
  });

  it('เขียนแล้วอ่านกลับได้ค่าเดิมเป๊ะ ไม่ว่า Sheets จะคืนเครื่องหมายกันสูตรมาหรือไม่', () => {
    const original = '=ประชุมด่วน';
    const written = String(objectToRow({ title: original }, ['title'])[0]);

    // กรณี Sheets คืนค่ามาพร้อมเครื่องหมายกันสูตร
    expect(readString({ title: written }, 'title')).toBe(original);
    // กรณี Sheets ถือว่าเครื่องหมายนั้นเป็นเพียงรูปแบบ แล้วคืนค่าดิบมา
    expect(readString({ title: original }, 'title')).toBe(original);
  });

  it('ข้อความที่เริ่มด้วยเครื่องหมายลบ (เช่น "-ด่วน") ยังอ่านกลับได้ถูก', () => {
    const original = '-ด่วนมาก';
    const written = String(objectToRow({ title: original }, ['title'])[0]);
    expect(written).toBe("'-ด่วนมาก");
    expect(readString({ title: written }, 'title')).toBe(original);
  });
});
