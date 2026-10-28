/**
 * สคริปต์ติดตั้ง — รันด้วยมือจาก Apps Script Editor ไม่ใช่ผ่านหน้าเว็บ
 *
 * ลำดับการติดตั้ง:
 *  1. ตั้งค่า BOOTSTRAP_ADMIN_EMAIL และ OAUTH_CLIENT_ID ใน Script Properties
 *  2. รัน setupSystem() หนึ่งครั้ง
 *  3. รัน runSelfTest() เพื่อยืนยันว่าทุกอย่างพร้อม
 *  4. Deploy เป็น Web App
 *
 * ฟังก์ชันในไฟล์นี้ปลอดภัยที่จะรันซ้ำ — ไม่มีการลบหรือเขียนทับข้อมูลที่มีอยู่
 */

function setupSystem() {
  const log = [];

  // 1) ไฟล์ข้อมูล
  let spreadsheetId = getProp_(PROP_SPREADSHEET_ID);
  if (spreadsheetId === '') {
    const book = SpreadsheetApp.create('ระบบจองห้องประชุม - ฐานข้อมูล');
    spreadsheetId = book.getId();
    scriptProps_().setProperty(PROP_SPREADSHEET_ID, spreadsheetId);
    log.push(`สร้างไฟล์ข้อมูลใหม่แล้ว: ${book.getUrl()}`);
    log.push('*** ห้ามแชร์ไฟล์นี้ให้พนักงาน *** ถ้าแชร์ ทุกคนจะแก้ข้อมูลข้ามการตรวจสอบได้');
  } else {
    log.push(`ใช้ไฟล์ข้อมูลเดิม: ${spreadsheetId}`);
  }

  // 2) กุญแจลับสำหรับเซ็น session token
  if (getProp_(PROP_SESSION_SECRET) === '') {
    const secret = Utilities.base64Encode(
      Utilities.computeHmacSha256Signature(Utilities.getUuid(), Utilities.getUuid()),
    );
    scriptProps_().setProperty(PROP_SESSION_SECRET, secret);
    log.push('สร้างกุญแจลับสำหรับ session แล้ว');
  } else {
    log.push('มีกุญแจลับอยู่แล้ว (ไม่สร้างใหม่ เพราะจะทำให้ทุกคนหลุดออกจากระบบ)');
  }

  // 3) ชีตทั้งหมด
  log.push(...migrateSheets());

  // 4) ค่าตั้งค่าเริ่มต้น (เขียนเฉพาะตอนชีตว่าง จะไม่ทับค่าที่ผู้ดูแลแก้ไว้)
  const settingsSheet = getSheet_(Domain.SHEET_SETTINGS);
  if (settingsSheet.getLastRow() < 2) {
    const rows = Domain.settingsToRows(Domain.DEFAULT_SYSTEM_SETTINGS);
    settingsSheet.getRange(2, 1, rows.length, 3).setValues(rows);
    log.push(`เขียนค่าตั้งค่าเริ่มต้น ${rows.length} รายการ`);
  } else {
    log.push('มีค่าตั้งค่าอยู่แล้ว ไม่เขียนทับ');
  }

  // 5) ตัวนับเวอร์ชันข้อมูล
  if (findByKey_(Domain.SHEET_META, 'dataVersion') === null) {
    appendObject_(Domain.SHEET_META, { key: 'dataVersion', value: 1 });
    log.push('สร้างตัวนับเวอร์ชันข้อมูลแล้ว');
  }

  // 6) ตรวจค่าที่ต้องตั้งด้วยมือ
  if (getProp_(PROP_BOOTSTRAP_ADMIN) === '') {
    log.push('[ต้องทำ] ยังไม่ได้ตั้ง BOOTSTRAP_ADMIN_EMAIL — ใส่อีเมล Google ของคุณใน Script Properties');
  }
  if (getProp_(PROP_OAUTH_CLIENT_ID) === '') {
    log.push('[ต้องทำ] ยังไม่ได้ตั้ง OAUTH_CLIENT_ID — สร้าง OAuth Client ID ใน Google Cloud Console');
  }

  const report = log.join('\n');
  console.log(report);
  return report;
}

/**
 * สร้างชีตและคอลัมน์ที่ขาด โดยไม่แตะข้อมูลเดิม
 * ใช้ตอนอัปเกรดระบบที่มีฟิลด์เพิ่ม — รันซ้ำได้เสมอ
 */
function migrateSheets() {
  clearStoreCache_();
  const book = openBook_();
  const log = [];

  Domain.SHEET_SPECS.forEach(function (spec) {
    let sheet = book.getSheetByName(spec.name);

    if (sheet === null) {
      sheet = book.insertSheet(spec.name);
      sheet.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, spec.headers.length).setFontWeight('bold');
      log.push(`สร้างชีต ${spec.name} (${spec.headers.length} คอลัมน์)`);
      return;
    }

    const width = Math.max(sheet.getLastColumn(), 1);
    const header = sheet.getRange(1, 1, 1, width).getValues()[0];
    const missing = Domain.missingColumns(header, spec.headers);

    if (missing.length === 0) {
      log.push(`ชีต ${spec.name} ครบแล้ว`);
      return;
    }

    // เพิ่มคอลัมน์ที่ขาดต่อท้าย ไม่แทรกกลาง เพื่อไม่ให้ข้อมูลเดิมเลื่อนคอลัมน์
    const startColumn = header.filter(function (name) {
      return String(name).trim() !== '';
    }).length;
    sheet.getRange(1, startColumn + 1, 1, missing.length).setValues([missing]);
    sheet.getRange(1, 1, 1, startColumn + missing.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    log.push(`ชีต ${spec.name}: เพิ่มคอลัมน์ ${missing.join(', ')}`);
  });

  // ลบชีตเริ่มต้นที่ Google สร้างมาให้ ถ้ายังว่างอยู่
  const defaultSheet = book.getSheetByName('Sheet1') || book.getSheetByName('ชีต1');
  if (defaultSheet !== null && book.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    book.deleteSheet(defaultSheet);
    log.push('ลบชีตเปล่าที่ Google สร้างมาให้');
  }

  // โครงสร้างเปลี่ยนแล้ว ต้องล้าง cache ไม่ให้โค้ดที่เรียกต่อใช้หัวตารางเดิม
  clearStoreCache_();
  return log;
}

/** ดูค่าคอนฟิกปัจจุบัน (ปิดบังกุญแจลับ) */
function showConfig() {
  const secret = getProp_(PROP_SESSION_SECRET);
  const report = [
    `SPREADSHEET_ID       : ${getProp_(PROP_SPREADSHEET_ID) || '(ยังไม่ตั้ง)'}`,
    `OAUTH_CLIENT_ID      : ${getProp_(PROP_OAUTH_CLIENT_ID) || '(ยังไม่ตั้ง)'}`,
    `BOOTSTRAP_ADMIN_EMAIL: ${getProp_(PROP_BOOTSTRAP_ADMIN) || '(ยังไม่ตั้ง)'}`,
    `SESSION_SECRET       : ${secret === '' ? '(ยังไม่ตั้ง)' : `ตั้งแล้ว (${secret.length} ตัวอักษร)`}`,
  ].join('\n');
  console.log(report);
  return report;
}

/**
 * เปลี่ยนกุญแจลับ — ใช้เมื่อสงสัยว่ากุญแจรั่ว
 * ผลข้างเคียง: ทุกคนที่ล็อกอินอยู่จะถูกเด้งออกและต้องเข้าสู่ระบบใหม่
 */
function rotateSessionSecret() {
  const secret = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(Utilities.getUuid(), Utilities.getUuid()),
  );
  scriptProps_().setProperty(PROP_SESSION_SECRET, secret);
  audit_('system', 'security.rotateSessionSecret', 'system', '', {});
  const message = 'เปลี่ยนกุญแจลับแล้ว ทุกคนต้องเข้าสู่ระบบใหม่';
  console.log(message);
  return message;
}
