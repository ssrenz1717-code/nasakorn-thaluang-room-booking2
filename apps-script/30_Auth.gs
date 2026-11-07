/**
 * การยืนยันตัวตนและสิทธิ์
 *
 * ขั้นตอน:
 *  เข้าได้ 2 ทาง (เลือกทางใดทางหนึ่ง) แล้วได้ session token อายุ 12 ชม.:
 *   ก. ชื่อผู้ใช้ + รหัสผ่าน — ผิดติดกัน PIN_MAX_FAILURES ครั้ง บัญชีนั้นล็อก PIN_LOCK_MINUTES นาที
 *   ข. PIN อย่างเดียว — PIN ไม่ซ้ำกันทั้งระบบจึงหาเจ้าของได้ ผิดรวมทั้งระบบครบ
 *      PIN_LOGIN_FAILURE_LIMIT_PER_HOUR ครั้ง ปิดทางนี้ถึงต้นชั่วโมงถัดไป (ทาง ก ยังเข้าได้)
 *  ชีต Users เก็บแค่ HMAC ของรหัสผ่านและ PIN ไม่มีค่าจริง
 *  ผู้ลงนามต้องใส่ PIN อีกครั้งทุกครั้งที่กดอนุมัติ/ไม่อนุมัติ (verifyActorPin_)
 *
 * กฎเหล็ก: ทุกฟังก์ชันที่แก้ข้อมูลต้องเรียก authenticate_() แล้วใช้ "สิทธิ์จากชีต"
 * ไม่ใช่สิทธิ์ที่ติดมาใน token และไม่ใช่สิทธิ์ที่หน้าเว็บส่งมาบอก
 * เพราะ token อาจเป็นใบเก่าของคนที่เพิ่งถูกลดสิทธิ์
 */

/* ---------- กันการยิงเข้าสู่ระบบรัว ๆ ---------- */

function loginFailureKey_() {
  // แบ่งถังละหนึ่งชั่วโมง เมื่อขึ้นชั่วโมงใหม่ตัวนับเริ่มใหม่เอง
  return `login_fail_${Math.floor(serverNow_().getTime() / 3_600_000)}`;
}

function assertLoginAllowed_() {
  const cached = CacheService.getScriptCache().get(loginFailureKey_());
  const failures = cached === null ? 0 : Number(cached) || 0;
  if (failures >= LOGIN_FAILURE_LIMIT_PER_HOUR) {
    throw appError_(
      ERROR_CODES.BUSY,
      'มีการพยายามเข้าสู่ระบบที่ไม่สำเร็จจำนวนมาก ระบบปิดการเข้าสู่ระบบชั่วคราว กรุณาลองใหม่ในอีกหนึ่งชั่วโมง',
    );
  }
}

/*
 * บันทึกความล้มเหลว
 * CacheService ไม่รับประกันการบวกเลขแบบอะตอมมิก การยิงพร้อมกันจึงอาจนับขาดไปบ้าง
 * ยอมรับได้ เพราะหน้าที่ของตัวนับนี้คือกันการยิงรัว ๆ ไม่ใช่การคิดเงิน
 */
function recordLoginFailure_() {
  const cache = CacheService.getScriptCache();
  const key = loginFailureKey_();
  const cached = cache.get(key);
  const next = (cached === null ? 0 : Number(cached) || 0) + 1;
  cache.put(key, String(next), 3900);
}

function hmacBase64_(message, secret) {
  const signature = Utilities.computeHmacSha256Signature(message, secret);
  return Utilities.base64Encode(signature);
}

function sessionSecret_() {
  return requireProp_(PROP_SESSION_SECRET, 'รัน setupSystem() เพื่อสร้างกุญแจลับให้อัตโนมัติ');
}

function pinPepper_() {
  return requireProp_(PROP_PIN_PEPPER, 'รัน setupSystem() เพื่อสร้างกุญแจลับให้อัตโนมัติ');
}

/** ค่า hash ของ PIN ที่เก็บในชีต — salt สุ่มต่อบัญชี, pepper อยู่ใน Script Properties */
function pinHash_(username, salt, pin) {
  return hmacBase64_(Domain.pinDigestMessage(username, salt, pin), pinPepper_());
}

function newPinCredential_(username, pin) {
  const salt = Utilities.getUuid().replace(/-/g, '');
  return { pinSalt: salt, pinHash: pinHash_(username, salt, pin) };
}

function passwordHash_(username, salt, password) {
  return hmacBase64_(Domain.passwordDigestMessage(username, salt, password), pinPepper_());
}

function newPasswordCredential_(username, password) {
  const salt = Utilities.getUuid().replace(/-/g, '');
  return { passwordSalt: salt, passwordHash: passwordHash_(username, salt, password) };
}

function pinMatches_(row, pin) {
  const hash = row === null ? '' : String(row.pinHash || '');
  return hash !== '' && Domain.constantTimeEqual(pinHash_(String(row.username), String(row.pinSalt || ''), pin), hash);
}

function assertNotLocked_(username) {
  if (pinFailures_(username) >= Domain.PIN_MAX_FAILURES) {
    throw appError_(
      ERROR_CODES.BUSY,
      `ใส่รหัสผิดหลายครั้ง บัญชีนี้ถูกล็อกชั่วคราว ${Domain.PIN_LOCK_MINUTES} นาที หรือให้ผู้ดูแลรีเซ็ตให้`,
    );
  }
}

function pinFailureKey_(username) {
  return `pin_fail_${Utilities.base64EncodeWebSafe(username)}`;
}

/*
 * ตัวนับ PIN ผิดรายบัญชี (นับทั้งชื่อที่ไม่มีในระบบด้วย ผู้โจมตีจะแยกไม่ออกว่าชื่อไหนมีจริง)
 * หมดอายุเองหลัง PIN_LOCK_MINUTES นาทีนับจากครั้งที่ผิดล่าสุด
 */
function pinFailures_(username) {
  const cached = CacheService.getScriptCache().get(pinFailureKey_(username));
  return cached === null ? 0 : Number(cached) || 0;
}

function recordPinFailure_(username) {
  CacheService.getScriptCache().put(
    pinFailureKey_(username), String(pinFailures_(username) + 1), Domain.PIN_LOCK_MINUTES * 60,
  );
  recordLoginFailure_();
}

function issueSession_(user) {
  const username = String(user.username);
  CacheService.getScriptCache().remove(pinFailureKey_(username));
  withScriptLock_(function () {
    updateByKey_(Domain.SHEET_USERS, username, { lastLoginAt: nowIso_() });
  });
  const token = Domain.createSessionToken(
    {
      email: username,
      role: Domain.normalizeUserRole(user.role),
      tokenVersion: Number(user.tokenVersion) || 1,
      expiresAt: Domain.sessionExpiryFrom(serverNow_().getTime(), SESSION_TTL_MS),
    },
    sessionSecret_(),
    hmacBase64_,
  );
  return { token: token, user: publicUser_(user) };
}

function assertActive_(user) {
  if (String(user.status) !== 'active') {
    throw appError_(ERROR_CODES.FORBIDDEN, 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  }
}

/** ทาง ก: ชื่อผู้ใช้ + รหัสผ่าน (ข้อความผิดพลาดเหมือนกันทั้งชื่อผิดและรหัสผิด) */
function login_(raw) {
  const parsed = Domain.validateLoginInput(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', parsed.issues);
  const username = parsed.value.username;
  assertLoginAllowed_();
  assertNotLocked_(username);

  const user = findByKey_(Domain.SHEET_USERS, username);
  const hash = user === null ? '' : String(user.passwordHash || '');
  const ok = hash !== '' &&
    Domain.constantTimeEqual(passwordHash_(username, String(user.passwordSalt || ''), parsed.value.password), hash);
  if (!ok) {
    recordPinFailure_(username);
    throw appError_(ERROR_CODES.UNAUTHENTICATED, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  assertActive_(user);
  return issueSession_(user);
}

function pinLoginFailureKey_() {
  return `pin_login_fail_${Math.floor(serverNow_().getTime() / 3_600_000)}`;
}

/** ทาง ข: PIN อย่างเดียว — ไล่เทียบกับทุกบัญชี (คนละ salt จึงต้องคำนวณทีละคน) */
function loginPin_(raw) {
  const parsed = Domain.validatePinLoginInput(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, `กรุณากรอก PIN ให้ครบ ${Domain.PIN_LENGTH} หลัก`, parsed.issues);
  assertLoginAllowed_();
  const cache = CacheService.getScriptCache();
  const failures = Number(cache.get(pinLoginFailureKey_())) || 0;
  if (failures >= Domain.PIN_LOGIN_FAILURE_LIMIT_PER_HOUR) {
    throw appError_(ERROR_CODES.BUSY, 'มีการใส่ PIN ผิดหลายครั้ง ปิดการเข้าด้วย PIN ชั่วคราว กรุณาเข้าด้วยชื่อผู้ใช้และรหัสผ่าน');
  }
  const user = readAll_(Domain.SHEET_USERS).objects.filter(function (row) {
    return pinMatches_(row, parsed.value.pin);
  })[0];
  if (!user) {
    cache.put(pinLoginFailureKey_(), String(failures + 1), 3900);
    recordLoginFailure_();
    throw appError_(ERROR_CODES.UNAUTHENTICATED, 'PIN ไม่ถูกต้อง');
  }
  assertActive_(user);
  assertNotLocked_(String(user.username));
  return issueSession_(user);
}

/** PIN ต้องไม่ซ้ำกับบัญชีอื่น เพราะใช้เข้าระบบได้โดยไม่ต้องใส่ชื่อ */
function assertPinUnique_(pin, exceptUsername) {
  const taken = readAll_(Domain.SHEET_USERS).objects.some(function (row) {
    return String(row.username) !== exceptUsername && pinMatches_(row, pin);
  });
  if (taken) throw appError_(ERROR_CODES.CONFLICT, Domain.PIN_TAKEN_MESSAGE);
}

/** ผู้ลงนามยืนยันตัวตนด้วย PIN ก่อนอนุมัติ/ไม่อนุมัติ — ผิดนับรวมกับตัวนับล็อกบัญชี */
function verifyActorPin_(user, pin) {
  assertNotLocked_(user.email);
  if (!pinMatches_(findByKey_(Domain.SHEET_USERS, user.email), typeof pin === 'string' ? pin.trim() : '')) {
    recordPinFailure_(user.email);
    throw appError_(ERROR_CODES.VALIDATION, 'PIN ไม่ถูกต้อง');
  }
  CacheService.getScriptCache().remove(pinFailureKey_(user.email));
}

/** มีผู้ดูแลที่ใช้งานได้อยู่ในระบบแล้วหรือยัง */
function adminExists_() {
  return readAll_(Domain.SHEET_USERS).objects.some(function (user) {
    return String(user.role) === 'admin' && String(user.status) === 'active';
  });
}

/**
 * ข้อมูลผู้ใช้ที่ส่งกลับหน้าเว็บได้ — ไม่มี pinHash/pinSalt/tokenVersion ติดไปด้วย
 * ฟิลด์ email ของหน้าเว็บคือรหัสบัญชี (ชื่อผู้ใช้) คงชื่อเดิมไว้เพราะการจองและประวัติการลงนามอ้างฟิลด์นี้
 */
function publicUser_(user) {
  return {
    email: String(user.username),
    displayName: String(user.displayName || user.username),
    department: String(user.department || ''),
    position: String(user.position || ''),
    role: Domain.normalizeUserRole(user.role),
    status: String(user.status || 'active'),
    allowedRoomIds: Domain.readList(user, 'allowedRoomIds'),
  };
}

/**
 * ตรวจ session token แล้วคืนผู้ใช้ "ตามข้อมูลในชีต ณ ตอนนี้"
 * อ่านชีตทุกคำขอโดยตั้งใจ เพื่อให้การถอนสิทธิ์มีผลทันที ไม่ใช่รอ token หมดอายุ
 */
function authenticate_(token) {
  const result = Domain.verifySessionToken(
    token,
    sessionSecret_(),
    hmacBase64_,
    serverNow_().getTime(),
  );

  if (!result.ok) {
    const message =
      result.reason === 'EXPIRED'
        ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'
        : 'กรุณาเข้าสู่ระบบ';
    throw appError_(ERROR_CODES.UNAUTHENTICATED, message);
  }

  const user = findByKey_(Domain.SHEET_USERS, result.payload.email);
  if (user === null) {
    throw appError_(ERROR_CODES.FORBIDDEN, 'ไม่พบบัญชีผู้ใช้นี้ในระบบแล้ว');
  }
  if (String(user.status) !== 'active') {
    throw appError_(ERROR_CODES.FORBIDDEN, 'บัญชีนี้ถูกปิดการใช้งาน');
  }
  if ((Number(user.tokenVersion) || 1) !== result.payload.tokenVersion) {
    throw appError_(
      ERROR_CODES.UNAUTHENTICATED,
      'สิทธิ์การใช้งานของคุณถูกเปลี่ยน กรุณาเข้าสู่ระบบอีกครั้ง',
    );
  }

  return publicUser_(user);
}

function requireAdmin_(token) {
  const user = authenticate_(token);
  if (user.role !== 'admin') {
    throw appError_(ERROR_CODES.FORBIDDEN, 'ต้องเป็นผู้ดูแลระบบจึงจะทำรายการนี้ได้');
  }
  return user;
}
