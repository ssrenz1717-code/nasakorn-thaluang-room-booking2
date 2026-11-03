/**
 * สคริปต์ติดตั้ง — รันด้วยมือจาก Apps Script Editor ไม่ใช่ผ่านหน้าเว็บ
 *
 * ลำดับการติดตั้ง:
 *  1. รัน setupSystem() หนึ่งครั้ง — ดูรหัสผ่านและ PIN แรกเข้าของบัญชีตั้งต้นใน Execution log
 *  2. รัน runSelfTest() เพื่อยืนยันว่าทุกอย่างพร้อม
 *  3. Deploy เป็น Web App
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
    scriptProps_().setProperty(PROP_SESSION_SECRET, newSecret_());
    log.push('สร้างกุญแจลับสำหรับ session แล้ว');
  } else {
    log.push('มีกุญแจลับอยู่แล้ว (ไม่สร้างใหม่ เพราะจะทำให้ทุกคนหลุดออกจากระบบ)');
  }

  // 2.1) กุญแจลับสำหรับ hash PIN
  if (getProp_(PROP_PIN_PEPPER) === '') {
    scriptProps_().setProperty(PROP_PIN_PEPPER, newSecret_());
    log.push('สร้างกุญแจลับสำหรับ PIN แล้ว');
  }

  // 3) ชีตทั้งหมด
  log.push(...migrateSheets());

  // 3.1) ห้องประชุมของวิทยาลัย (เฉพาะตอนชีต Rooms ยังว่าง)
  log.push(seedRooms());

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

  // 6) บัญชีตั้งต้น (ผู้ดูแล + ผู้ลงนาม 3 ขั้น)
  log.push(...seedAccounts());

  const report = log.join('\n');
  console.log(report);
  return report;
}

function newSecret_() {
  return Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(Utilities.getUuid(), Utilities.getUuid()),
  );
}

/** PIN สุ่ม 6 หลักจากตัวสุ่มที่ปลอดภัย (UUID v4) และผ่านกฎ PIN เดาง่าย */
function randomPin_() {
  for (;;) {
    const digits = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid())
      .slice(0, Domain.PIN_LENGTH)
      .map(function (byte) { return String((byte + 256) % 10); })
      .join('');
    if (Domain.pinProblem(digits) === null) return digits;
  }
}

/** รหัสผ่านสุ่ม 10 ตัว (ตัวอักษร + ตัวเลข ตัดตัวที่สับสนอย่าง 0/O, 1/l ออก) */
function randomPassword_() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  for (;;) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
    const pool = letters + digits;
    const password = bytes.slice(0, 10).map(function (byte) { return pool.charAt((byte + 256) % pool.length); }).join('');
    if (Domain.passwordProblem(password) === null) return password;
  }
}

/**
 * สร้างบัญชีตั้งต้นที่ยังไม่มี (ไม่แตะบัญชีที่มีแล้ว) พร้อมรหัสผ่านและ PIN สุ่ม
 * แสดงใน log ครั้งเดียวตอนสร้าง — แจ้งเจ้าของบัญชีแล้วให้ผู้ดูแลรีเซ็ตได้ทุกเมื่อ
 */
function seedAccounts() {
  const log = [];
  const now = nowIso_();
  Domain.COLLEGE_ACCOUNTS.forEach(function (account) {
    if (findByKey_(Domain.SHEET_USERS, account.username) !== null) {
      log.push(`มีบัญชี ${account.username} อยู่แล้ว`);
      return;
    }
    let pin = randomPin_();
    // PIN ต้องไม่ซ้ำกันทั้งระบบ (ใช้เข้าระบบได้โดยไม่ต้องใส่ชื่อ)
    while (readAll_(Domain.SHEET_USERS).objects.some(function (row) { return pinMatches_(row, pin); })) pin = randomPin_();
    const password = randomPassword_();
    appendObject_(Domain.SHEET_USERS, Object.assign({
      username: account.username, displayName: account.displayName, department: account.department,
      role: account.role, status: 'active', allowedRoomIds: '', tokenVersion: 1,
      lastLoginAt: '', createdAt: now, updatedAt: now,
    }, newPinCredential_(account.username, pin), newPasswordCredential_(account.username, password)));
    log.push(`สร้างบัญชี ${account.username} (${account.displayName}) รหัสผ่าน: ${password}  PIN: ${pin}`);
  });
  return log;
}

/**
 * ใส่ห้องประชุม 6 ห้อง + "อื่น ๆ" ลงชีต Rooms ถ้ายังไม่มีห้องเลย — ไม่ทับห้องที่ผู้ดูแลแก้ไว้
 * แก้ความจุ/สถานที่/อุปกรณ์จริงในชีตได้ภายหลัง
 */
function seedRooms() {
  if (readAll_(Domain.SHEET_ROOMS).objects.length > 0) return 'มีห้องประชุมอยู่แล้ว ไม่เพิ่มซ้ำ';
  const now = nowIso_();
  appendObjects_(Domain.SHEET_ROOMS, Domain.COLLEGE_ROOMS.map(function (room) {
    return {
      roomId: room.code, code: room.code, name: room.name, description: '', location: '',
      capacity: room.capacity, equipment: '', imageUrl: '', status: 'active', createdAt: now, updatedAt: now,
    };
  }));
  bumpDataVersion_();
  return `เพิ่มห้องประชุม ${Domain.COLLEGE_ROOMS.length} รายการ (แก้ความจุจริงในชีต Rooms)`;
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
    `SPREADSHEET_ID : ${getProp_(PROP_SPREADSHEET_ID) || '(ยังไม่ตั้ง)'}`,
    `SESSION_SECRET : ${secret === '' ? '(ยังไม่ตั้ง)' : `ตั้งแล้ว (${secret.length} ตัวอักษร)`}`,
    `PIN_PEPPER     : ${getProp_(PROP_PIN_PEPPER) === '' ? '(ยังไม่ตั้ง)' : 'ตั้งแล้ว'}`,
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
