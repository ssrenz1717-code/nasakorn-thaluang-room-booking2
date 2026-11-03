/**
 * การยืนยันตัวตนและสิทธิ์
 *
 * ขั้นตอน:
 *  1. ผู้ใช้กรอกชื่อผู้ใช้ + PIN 6 หลัก (ผู้ดูแลสร้างบัญชีและตั้ง PIN ให้ในหน้าจัดการผู้ใช้)
 *  2. เทียบ HMAC ของ PIN กับค่าในชีต Users — ชีตไม่มี PIN จริงเก็บอยู่
 *  3. ผิดติดกัน PIN_MAX_FAILURES ครั้ง บัญชีนั้นล็อก PIN_LOCK_MINUTES นาที
 *  4. ออก session token ของเราเองกลับไป (อายุ 12 ชม.) ใช้ในคำขอต่อ ๆ ไป
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

/** เข้าสู่ระบบด้วยชื่อผู้ใช้ + PIN — ข้อความผิดพลาดเหมือนกันทั้งชื่อผิดและ PIN ผิด */
function login_(raw) {
  const parsed = Domain.validateLoginInput(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'กรุณากรอกชื่อผู้ใช้และ PIN', parsed.issues);
  const username = parsed.value.username;

  assertLoginAllowed_();
  if (pinFailures_(username) >= Domain.PIN_MAX_FAILURES) {
    throw appError_(
      ERROR_CODES.BUSY,
      `ใส่ PIN ผิดหลายครั้ง บัญชีนี้ถูกล็อกชั่วคราว ${Domain.PIN_LOCK_MINUTES} นาที หรือให้ผู้ดูแลรีเซ็ต PIN`,
    );
  }

  const user = findByKey_(Domain.SHEET_USERS, username);
  const hash = user === null ? '' : String(user.pinHash || '');
  const ok = hash !== '' && Domain.constantTimeEqual(pinHash_(username, String(user.pinSalt || ''), parsed.value.pin), hash);
  if (!ok) {
    recordPinFailure_(username);
    throw appError_(ERROR_CODES.UNAUTHENTICATED, 'ชื่อผู้ใช้หรือ PIN ไม่ถูกต้อง');
  }
  if (String(user.status) !== 'active') {
    throw appError_(ERROR_CODES.FORBIDDEN, 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  }

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
