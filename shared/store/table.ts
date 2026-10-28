/**
 * ชั้นแปลงข้อมูลระหว่าง "แถวในชีต" กับ "object ในโค้ด"
 *
 * Apps Script ทดสอบในเครื่องไม่ได้ จึงดันตรรกะทุกอย่างที่ไม่ใช่ I/O ออกมาไว้ที่นี่
 * ไฟล์ .gs ฝั่ง Apps Script จะบางมาก — แค่เรียก getValues/setValues แล้วส่งต่อให้ฟังก์ชันพวกนี้
 *
 * ชื่อคอลัมน์ถูกอ่านจากแถวหัวตารางจริงทุกครั้ง ไม่ฮาร์ดโค้ดเลขคอลัมน์
 * เพื่อว่าถ้ามีคนเผลอแทรกคอลัมน์ในชีต ระบบจะยังอ่านถูกหรือฟ้องชัด ๆ ว่าคอลัมน์ไหนหาย
 */

export type CellValue = string | number | boolean | Date | null;
export type SheetRow = CellValue[];
export type RowObject = Record<string, CellValue>;

/** แผนที่ชื่อคอลัมน์ -> ตำแหน่ง (เริ่มที่ 0) */
export type HeaderMap = Record<string, number>;

export function buildHeaderMap(header: readonly CellValue[]): HeaderMap {
  const map: HeaderMap = {};
  header.forEach((name, index) => {
    if (typeof name === 'string' && name !== '') map[name] = index;
  });
  return map;
}

/**
 * ตรวจว่าชีตมีคอลัมน์ที่ระบบต้องใช้ครบ
 * คืนรายชื่อคอลัมน์ที่ขาด เพื่อให้ error บอกได้ตรง ๆ ว่าต้องไปแก้อะไรในชีต
 */
export function missingColumns(
  header: readonly CellValue[],
  required: readonly string[],
): string[] {
  const map = buildHeaderMap(header);
  return required.filter((name) => map[name] === undefined);
}

export function rowToObject(row: readonly CellValue[], headerMap: HeaderMap): RowObject {
  const object: RowObject = {};
  for (const name of Object.keys(headerMap)) {
    const index = headerMap[name];
    object[name] = index === undefined ? null : (row[index] ?? null);
  }
  return object;
}

export function rowsToObjects(
  rows: readonly SheetRow[],
  headerMap: HeaderMap,
): RowObject[] {
  return rows.map((row) => rowToObject(row, headerMap));
}

/**
 * แปลง object กลับเป็นแถวตามลำดับคอลัมน์จริงของชีต
 * ฟิลด์ที่ object ไม่มี จะเป็นค่าว่าง ไม่ใช่ undefined (ชีตจะเขียนคำว่า undefined ลงไป)
 */
export function objectToRow(
  object: Readonly<RowObject>,
  header: readonly CellValue[],
): SheetRow {
  return header.map((name) => {
    if (typeof name !== 'string') return '';
    const value = object[name];
    if (value === undefined || value === null) return '';
    // ป้องกันการแทรกสูตรทุกค่าที่เขียนลงชีต ไม่เลือกเฉพาะบางฟิลด์
    // เพราะถ้าเลือกเฉพาะบางฟิลด์ วันหนึ่งจะมีฟิลด์ใหม่ที่ลืมใส่
    return sanitizeForSheet(value);
  });
}

/**
 * อักขระที่ทำให้ Google Sheets ตีความค่าเป็น "สูตร" ไม่ใช่ข้อความ
 *
 * ช่องโหว่จริงที่ต้องปิด: ถ้าพนักงานตั้งหัวข้อประชุมว่า
 *   =IMPORTRANGE("ไฟล์ของคนอื่น","A1")  หรือ  =HYPERLINK("http://เว็บหลอกลวง","คลิก")
 * แล้วผู้ดูแลเปิดไฟล์ข้อมูล Sheets จะ "รัน" สูตรนั้นด้วยสิทธิ์ของผู้ดูแล
 * ซึ่งใช้ดูดข้อมูลข้ามไฟล์หรือหลอกให้ผู้ดูแลกดลิงก์ได้
 */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];
const TEXT_GUARD = "'";

/**
 * ทำให้ข้อความที่ผู้ใช้พิมพ์มา ปลอดภัยที่จะเขียนลงชีต
 * เติมเครื่องหมาย ' ไว้หน้าเพื่อบังคับให้ Sheets มองเป็นข้อความล้วน
 */
export function sanitizeForSheet(value: CellValue): CellValue {
  if (typeof value !== 'string' || value === '') return value;
  const first = value.charAt(0);
  if (FORMULA_TRIGGERS.indexOf(first) !== -1) return `${TEXT_GUARD}${value}`;
  // Sheets แปลงข้อความที่หน้าตาเหมือนวันที่ ("2026-10-28", เวลา ISO) เป็นค่าวันที่ให้เอง
  // และตัดเลข 0 หน้าข้อความตัวเลข ("0812345678") ทิ้ง -> บังคับเป็นข้อความล้วนให้อ่านกลับได้ค่าเดิม
  if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^0\d+$/.test(value)) return `${TEXT_GUARD}${value}`;
  return value;
}

/**
 * อ่านค่าเป็นข้อความแบบปลอดภัย (ชีตอาจคืน number หรือ Date มาให้)
 *
 * ตัดเครื่องหมาย ' นำหน้าออกหนึ่งตัวถ้ามี เพราะเราเติมเข้าไปเองตอนเขียน
 * ทำทั้งสองฝั่งเพื่อให้ได้ค่าเดิมกลับมาเสมอ ไม่ว่า Sheets จะคืนเครื่องหมายนั้นมาด้วยหรือไม่
 */
export function readString(object: Readonly<RowObject>, key: string): string {
  const value = object[key];
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text.charAt(0) === TEXT_GUARD ? text.substring(1) : text;
}

/**
 * อ่านค่าเป็นตัวเลขแบบปลอดภัย
 * ชีตอาจเก็บเลขมาเป็นข้อความถ้ามีคนพิมพ์มือ จึงต้องแปลงและกันค่าที่ไม่ใช่เลข
 */
export function readNumber(object: Readonly<RowObject>, key: string, fallback = 0): number {
  const value = object[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function readBoolean(object: Readonly<RowObject>, key: string, fallback = false): boolean {
  const value = object[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === 'ใช่') return true;
    if (normalized === 'false' || normalized === 'no' || normalized === 'ไม่') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

/** อุปกรณ์ถูกเก็บในชีตเป็นข้อความคั่นด้วยจุลภาค เพื่อให้คนเปิดดูแล้วอ่านรู้เรื่อง */
export function readList(object: Readonly<RowObject>, key: string): string[] {
  const raw = readString(object, key);
  if (raw.trim() === '') return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

export function writeList(items: readonly string[]): string {
  return items.join(',');
}

/**
 * แปลงชีตแบบ key-value (Settings, Meta) เป็น object
 * ใช้โครงนี้เพราะเพิ่มค่าตั้งค่าใหม่ภายหลังไม่ต้องไปแทรกคอลัมน์ในชีต
 */
export function keyValueToObject(
  rows: readonly SheetRow[],
  keyIndex = 0,
  valueIndex = 1,
): Record<string, CellValue> {
  const result: Record<string, CellValue> = {};
  for (const row of rows) {
    const key = row[keyIndex];
    if (typeof key === 'string' && key.trim() !== '') {
      result[key.trim()] = row[valueIndex] ?? null;
    }
  }
  return result;
}

/**
 * หาเลขแถวจริงในชีตจากค่าคอลัมน์หนึ่ง (เช่น bookingId)
 * คืน -1 เมื่อไม่พบ ผู้เรียกต้องจัดการเคสไม่พบเอง
 *
 * offset = เลขแถวของข้อมูลแถวแรก (ปกติ 2 เพราะแถว 1 เป็นหัวตาราง)
 */
export function findRowNumber(
  rows: readonly SheetRow[],
  columnIndex: number,
  value: string,
  offset = 2,
): number {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row === undefined) continue;
    const cell = row[columnIndex];
    if (cell !== null && cell !== undefined && String(cell) === value) return i + offset;
  }
  return -1;
}
