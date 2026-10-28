/**
 * ตรวจสุขภาพระบบบน Apps Script จริง
 *
 * ทำไมต้องมี: unit test ในเครื่องรัน Apps Script ไม่ได้ (ไม่มี SpreadsheetApp, LockService,
 * Utilities) จึงต้องมีชุดตรวจที่รันในรันไทม์จริงได้ รันฟังก์ชันนี้จาก Apps Script Editor
 * แล้วอ่านผลใน Execution log — ทุกข้อต้องขึ้น [ผ่าน] ก่อนถือว่าระบบพร้อมใช้
 *
 * ฟังก์ชันนี้ไม่แก้ข้อมูลใด ๆ อ่านอย่างเดียว (ยกเว้นจับ-ปล่อยล็อกเพื่อทดสอบ)
 */

function runSelfTest() {
  const results = [];

  function check(name, fn) {
    try {
      const detail = fn();
      results.push(`[ผ่าน]   ${name}${detail ? ` — ${detail}` : ''}`);
      return true;
    } catch (error) {
      results.push(`[ไม่ผ่าน] ${name} — ${error && error.message}`);
      return false;
    }
  }

  check('โค้ด domain ถูกโหลดเข้ามาแล้ว', function () {
    if (typeof Domain === 'undefined') throw new Error('ไม่พบ Domain — ตรวจว่าไฟล์ Domain.gs ถูก push แล้ว');
    return `มี ${Object.keys(Domain).length} ฟังก์ชัน/ค่า`;
  });

  check('ตรรกะเวลาทับซ้อนทำงานถูกต้อง', function () {
    const touching = Domain.overlaps({ startMin: 540, endMin: 600 }, { startMin: 600, endMin: 660 });
    const clashing = Domain.overlaps({ startMin: 540, endMin: 600 }, { startMin: 570, endMin: 630 });
    if (touching !== false) throw new Error('ช่วงเวลาที่ต่อกันพอดีถูกตัดสินว่าชน');
    if (clashing !== true) throw new Error('ช่วงเวลาที่ชนกันจริงไม่ถูกตรวจจับ');
    return 'ต่อกันพอดี=ไม่ชน, คาบเกี่ยว=ชน';
  });

  check('เวลาไทยถูกต้อง (ไม่เลื่อนวัน)', function () {
    const dateKey = Domain.toDateKey(new Date('2026-10-27T17:30:00Z'));
    if (dateKey !== '2026-10-28') throw new Error(`ได้ ${dateKey} ควรได้ 2026-10-28`);
    const instant = Domain.fromDateKeyAndMinutes('2026-10-28', 540);
    if (instant.toISOString() !== '2026-10-28T02:00:00.000Z') {
      throw new Error(`แปลงเวลากลับผิด: ${instant.toISOString()}`);
    }
    return '17:30Z = 28 ต.ค. 00:30 เวลาไทย';
  });

  check('ค่าคอนฟิกครบ', function () {
    const missing = [];
    if (getProp_(PROP_SPREADSHEET_ID) === '') missing.push('SPREADSHEET_ID');
    if (getProp_(PROP_SESSION_SECRET) === '') missing.push('SESSION_SECRET');
    if (getProp_(PROP_OAUTH_CLIENT_ID) === '') missing.push('OAUTH_CLIENT_ID');
    if (getProp_(PROP_BOOTSTRAP_ADMIN) === '') missing.push('BOOTSTRAP_ADMIN_EMAIL');
    if (missing.length > 0) throw new Error(`ยังไม่ได้ตั้ง: ${missing.join(', ')}`);
    return 'ครบทั้ง 4 ค่า';
  });

  check('เปิดไฟล์ข้อมูลได้', function () {
    return openBook_().getName();
  });

  check('ชีตและคอลัมน์ครบทุกชีต', function () {
    Domain.SHEET_SPECS.forEach(function (spec) {
      readHeader_(spec.name);
    });
    return `ตรวจแล้ว ${Domain.SHEET_SPECS.length} ชีต`;
  });

  check('อ่านค่าตั้งค่าระบบได้', function () {
    const settings = readSettings_();
    return `เวลาทำการ ${settings.businessHoursStart}-${settings.businessHoursEnd}, ความละเอียด ${settings.slotMinutes} นาที, ระบบอนุมัติ ${settings.approvalRequired ? 'เปิด' : 'ปิด'}`;
  });

  check('จับล็อกและปล่อยล็อกได้ (กลไกกันจองซ้ำ)', function () {
    const value = withScriptLock_(function () {
      return 'ok';
    });
    if (value !== 'ok') throw new Error('ล็อกทำงานผิดปกติ');
    return 'LockService ใช้งานได้';
  });

  check('ออกและตรวจ session token ได้ด้วยกุญแจจริง', function () {
    const now = serverNow_().getTime();
    const token = Domain.createSessionToken(
      { email: 'selftest@example.com', role: 'staff', tokenVersion: 1, expiresAt: now + 60000 },
      sessionSecret_(),
      hmacBase64_,
    );
    const good = Domain.verifySessionToken(token, sessionSecret_(), hmacBase64_, now);
    if (!good.ok) throw new Error(`ตรวจ token ที่เพิ่งออกไม่ผ่าน (${good.reason})`);

    const tampered = token.replace('|staff|', '|admin|');
    const bad = Domain.verifySessionToken(tampered, sessionSecret_(), hmacBase64_, now);
    if (bad.ok) throw new Error('token ที่ถูกแก้สิทธิ์เป็น admin ผ่านการตรวจ — ร้ายแรงมาก');
    return 'ลายเซ็นกันการปลอมสิทธิ์ได้';
  });

  check('กันการแทรกสูตรลงชีตได้', function () {
    const row = Domain.objectToRow({ title: '=IMPORTRANGE("x","A1")' }, ['title']);
    if (String(row[0]).charAt(0) !== "'") {
      throw new Error('ข้อความที่เป็นสูตรไม่ถูกบังคับเป็นข้อความล้วน');
    }
    const back = Domain.readString({ title: row[0] }, 'title');
    if (back !== '=IMPORTRANGE("x","A1")') throw new Error('อ่านค่ากลับไม่ตรงกับที่เขียน');
    return 'หัวข้อที่เป็นสูตรถูกบังคับเป็นข้อความ';
  });

  check('การสร้างผู้ดูแลคนแรกถูกคุมไว้', function () {
    const exists = adminExists_();
    return exists
      ? 'มีผู้ดูแลในระบบแล้ว — ประตูสร้างผู้ดูแลคนแรกปิดอยู่'
      : 'ยังไม่มีผู้ดูแล — อีเมลใน BOOTSTRAP_ADMIN_EMAIL จะกลายเป็นผู้ดูแลตอนล็อกอินครั้งแรก';
  });

  check('กลไกกันการยิงเข้าสู่ระบบรัว ๆ พร้อมใช้', function () {
    assertLoginAllowed_();
    const cached = CacheService.getScriptCache().get(loginFailureKey_());
    const failures = cached === null ? 0 : Number(cached) || 0;
    return `ชั่วโมงนี้ล้มเหลวไปแล้ว ${failures} ครั้ง จากเพดาน ${LOGIN_FAILURE_LIMIT_PER_HOUR}`;
  });

  check('ตัวนับเวอร์ชันข้อมูลอ่านได้', function () {
    return `dataVersion = ${getDataVersion_()}`;
  });

  const passed = results.filter(function (line) {
    return line.indexOf('[ผ่าน]') === 0;
  }).length;

  const report = [
    '===== ผลตรวจสุขภาพระบบจองห้องประชุม =====',
    ...results,
    '',
    `สรุป: ผ่าน ${passed} จาก ${results.length} ข้อ`,
    passed === results.length
      ? 'ระบบพร้อมสำหรับขั้นตอนถัดไป'
      : 'ยังมีข้อที่ไม่ผ่าน ต้องแก้ก่อนใช้งานจริง',
  ].join('\n');

  console.log(report);
  return report;
}
