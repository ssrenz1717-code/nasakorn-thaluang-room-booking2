/**
 * ชั้นเข้าถึง Google Sheets
 *
 * ไฟล์นี้ทำแค่ I/O — การแปลงข้อมูลและกฎทั้งหมดอยู่ใน Domain (bundle จาก shared/)
 * ที่มี unit test ครอบไว้แล้ว เพราะ Apps Script ทดสอบอัตโนมัติในเครื่องไม่ได้
 */

/**
 * เก็บไฟล์ข้อมูลและหัวตารางไว้ใช้ซ้ำภายในคำขอเดียว
 *
 * ตัวแปรระดับไฟล์ใน Apps Script มีอายุเท่ากับการรันหนึ่งครั้ง จึงปลอดภัยที่จะ cache
 * และช่วยได้จริง เพราะคำขอเดียวเรียก readAll_/readHeader_ หลายรอบ
 * ถ้าไม่ cache จะเสียเวลาเปิดไฟล์ใหม่ทุกครั้ง (~100-200 มิลลิวินาทีต่อครั้ง)
 */
let bookCache_ = null;
let headerCache_ = {};

function openBook_() {
  if (bookCache_ !== null) return bookCache_;
  const id = requireProp_(
    PROP_SPREADSHEET_ID,
    'รัน setupSystem() หนึ่งครั้งเพื่อสร้างไฟล์ข้อมูลและบันทึกรหัสไฟล์ให้อัตโนมัติ',
  );
  try {
    bookCache_ = SpreadsheetApp.openById(id);
    return bookCache_;
  } catch (error) {
    throw appError_(
      ERROR_CODES.NOT_CONFIGURED,
      `เปิดไฟล์ข้อมูลไม่ได้ (รหัส ${id}) — ไฟล์อาจถูกลบหรือย้ายเจ้าของ`,
    );
  }
}

function getSheet_(name) {
  const sheet = openBook_().getSheetByName(name);
  if (sheet === null) {
    throw appError_(
      ERROR_CODES.NOT_CONFIGURED,
      `ไม่พบชีต "${name}" ในไฟล์ข้อมูล — รัน migrateSheets() เพื่อสร้างชีตที่ขาด`,
    );
  }
  return sheet;
}

/** อ่านหัวตารางและตรวจว่าคอลัมน์ที่ระบบต้องใช้ครบ */
function readHeader_(name) {
  if (headerCache_[name] !== undefined) return headerCache_[name];

  const sheet = getSheet_(name);
  const width = Math.max(sheet.getLastColumn(), 1);
  const header = sheet.getRange(1, 1, 1, width).getValues()[0];
  const spec = Domain.sheetSpec(name);
  const missing = Domain.missingColumns(header, spec.headers);
  if (missing.length > 0) {
    throw appError_(
      ERROR_CODES.NOT_CONFIGURED,
      `ชีต "${name}" ขาดคอลัมน์: ${missing.join(', ')} — รัน migrateSheets()`,
    );
  }
  headerCache_[name] = {
    sheet: sheet,
    header: header,
    headerMap: Domain.buildHeaderMap(header),
  };
  return headerCache_[name];
}

/** ล้าง cache — เรียกเมื่อโครงสร้างชีตเปลี่ยน (migrateSheets) */
function clearStoreCache_() {
  bookCache_ = null;
  headerCache_ = {};
}

/** อ่านทุกแถวของชีตเป็น object (ใช้กับชีตเล็ก เช่น Users, Rooms, Settings) */
function readAll_(name) {
  const context = readHeader_(name);
  const lastRow = context.sheet.getLastRow();
  if (lastRow < 2) return { context: context, rows: [], objects: [] };

  const rows = context.sheet
    .getRange(2, 1, lastRow - 1, context.header.length)
    .getValues();
  return {
    context: context,
    rows: rows,
    objects: Domain.rowsToObjects(rows, context.headerMap),
  };
}

/**
 * อ่านเฉพาะคอลัมน์แรก ๆ ของชีตใหญ่ (Bookings)
 *
 * ใช้ตอนตรวจเวลาทับซ้อน ซึ่งต้องการแค่ bookingId/roomId/dateKey/startMin/endMin/status
 * ที่ชีต 10,000 แถว การอ่าน 6 คอลัมน์เร็วกว่าอ่านทั้ง 27 คอลัมน์ประมาณ 4-5 เท่า
 */
function readHotColumns_(name, columnCount) {
  const context = readHeader_(name);
  const lastRow = context.sheet.getLastRow();
  if (lastRow < 2) return { context: context, rows: [], objects: [] };

  const rows = context.sheet.getRange(2, 1, lastRow - 1, columnCount).getValues();
  const hotHeader = context.header.slice(0, columnCount);
  const hotMap = Domain.buildHeaderMap(hotHeader);
  return {
    context: context,
    rows: rows,
    objects: Domain.rowsToObjects(rows, hotMap),
  };
}

function appendObject_(name, object) {
  const context = readHeader_(name);
  const row = Domain.objectToRow(object, context.header);
  context.sheet.appendRow(row);
  return object;
}

/** เขียนหลายแถวพร้อมกันในการเรียกครั้งเดียว (เร็วกว่า appendRow ทีละแถวหลายเท่า) */
function appendObjects_(name, objects) {
  if (objects.length === 0) return 0;
  const context = readHeader_(name);
  const rows = objects.map(function (object) {
    return Domain.objectToRow(object, context.header);
  });
  context.sheet
    .getRange(context.sheet.getLastRow() + 1, 1, rows.length, context.header.length)
    .setValues(rows);
  return rows.length;
}

/**
 * แก้ไขบางฟิลด์ของแถวที่ระบุด้วยค่าในคอลัมน์คีย์ — คืน false ถ้าไม่พบแถว
 *
 * อ่านแค่คอลัมน์คีย์เพื่อหาเลขแถว แล้วอ่าน/เขียนเฉพาะแถวนั้นแถวเดียว
 * ไม่อ่านทั้งตาราง เพราะที่ชีต 10,000 แถว การอ่านทั้งตารางเพื่อแก้แถวเดียว
 * ช้ากว่าวิธีนี้หลายเท่าและกินเวลาในล็อกซึ่งทุกคนรอคิวอยู่
 */
function updateByKey_(name, keyValue, patch) {
  const spec = Domain.sheetSpec(name);
  const context = readHeader_(name);
  const keyIndex = context.headerMap[spec.keyColumn];
  const lastRow = context.sheet.getLastRow();
  if (lastRow < 2) return false;

  const keyColumn = context.sheet.getRange(2, keyIndex + 1, lastRow - 1, 1).getValues();
  const rowNumber = Domain.findRowNumber(keyColumn, 0, String(keyValue));
  if (rowNumber === -1) return false;

  const range = context.sheet.getRange(rowNumber, 1, 1, context.header.length);
  const existing = Domain.rowToObject(range.getValues()[0], context.headerMap);

  const merged = {};
  Object.keys(existing).forEach(function (field) {
    merged[field] = existing[field];
  });
  Object.keys(patch).forEach(function (field) {
    merged[field] = patch[field];
  });

  range.setValues([Domain.objectToRow(merged, context.header)]);
  return true;
}

function findByKey_(name, keyValue) {
  const spec = Domain.sheetSpec(name);
  const all = readAll_(name);
  for (let i = 0; i < all.objects.length; i += 1) {
    if (String(all.objects[i][spec.keyColumn]) === String(keyValue)) return all.objects[i];
  }
  return null;
}

/* ---------- ค่าตั้งค่าระบบ ---------- */

function readSettings_() {
  const all = readAll_(Domain.SHEET_SETTINGS);
  const result = Domain.readSettingsOrDefault(all.rows);
  if (result.problems.length > 0) {
    console.warn(`ค่าตั้งค่าในชีตมีปัญหา ใช้ค่าเริ่มต้นแทน: ${result.problems.join(' | ')}`);
  }
  return result.settings;
}

/* ---------- ตัวนับเวอร์ชันข้อมูล สำหรับให้หน้าเว็บถามว่ามีอะไรเปลี่ยนไหม ---------- */

function getDataVersion_() {
  const row = findByKey_(Domain.SHEET_META, 'dataVersion');
  return row === null ? 0 : Number(row.value) || 0;
}

/**
 * บวกเลขเวอร์ชันข้อมูลหนึ่งขั้น — เรียกหลังทุกการเขียนที่หน้าเว็บควรรู้
 *
 * หน้าเว็บถามแค่เลขนี้ทุก 15 วินาที (เบามาก) แล้วดึงข้อมูลจริงเฉพาะเมื่อเลขเปลี่ยน
 * จึงไม่ต้องดึงรายการจองทั้งหมดทุก 15 วินาทีให้เปลืองโควตาและแบตเตอรี่ผู้ใช้
 */
function bumpDataVersion_() {
  const next = getDataVersion_() + 1;
  if (!updateByKey_(Domain.SHEET_META, 'dataVersion', { key: 'dataVersion', value: next })) {
    appendObject_(Domain.SHEET_META, { key: 'dataVersion', value: next });
  }
  return next;
}
