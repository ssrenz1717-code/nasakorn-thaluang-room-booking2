/**
 * การยืนยันตัวตนและสิทธิ์
 *
 * ขั้นตอน:
 *  1. หน้าเว็บให้ผู้ใช้กด "เข้าสู่ระบบด้วย Google" ได้ ID token มาจาก Google
 *  2. ส่ง ID token มาที่นี่ -> เราถามกับ Google ว่า token นี้จริงไหมและเป็นของใคร
 *  3. ตรวจว่าอีเมลนั้นอยู่ในชีต Users และสถานะใช้งานได้
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

/**
 * ตรวจ ID token กับ Google
 * เรียก UrlFetch แค่ตอน login ไม่ใช่ทุกคำขอ จึงไม่กินโควตา (20,000 ครั้ง/วัน)
 */
function verifyGoogleIdToken_(idToken) {
  if (typeof idToken !== 'string' || idToken === '') {
    throw appError_(ERROR_CODES.BAD_REQUEST, 'ไม่พบข้อมูลการเข้าสู่ระบบ');
  }

  // ตรวจเพดานก่อนเรียก Google เพื่อให้การยิงรัว ๆ ไม่กินโควตา UrlFetch เลย
  assertLoginAllowed_();

  const clientId = requireProp_(
    PROP_OAUTH_CLIENT_ID,
    'สร้าง OAuth Client ID (ประเภท Web application) ใน Google Cloud Console แล้วใส่ค่าใน Script Properties',
  );

  const response = UrlFetchApp.fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { muteHttpExceptions: true },
  );

  if (response.getResponseCode() !== 200) {
    recordLoginFailure_();
    throw appError_(ERROR_CODES.UNAUTHENTICATED, 'การเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่');
  }

  let info;
  try {
    info = JSON.parse(response.getContentText());
  } catch (error) {
    recordLoginFailure_();
    throw appError_(ERROR_CODES.UNAUTHENTICATED, 'ข้อมูลการเข้าสู่ระบบอ่านไม่ได้');
  }

  // ตรวจว่า token ออกให้แอปของเราจริง ไม่ใช่ token ของแอปอื่นที่ถูกนำมาสวม
  if (info.aud !== clientId) {
    recordLoginFailure_();
    throw appError_(ERROR_CODES.UNAUTHENTICATED, 'ข้อมูลการเข้าสู่ระบบไม่ได้ออกให้ระบบนี้');
  }
  if (String(info.email_verified) !== 'true') {
    recordLoginFailure_();
    throw appError_(ERROR_CODES.UNAUTHENTICATED, 'อีเมลนี้ยังไม่ได้ยืนยันกับ Google');
  }
  const email = String(info.email || '').trim().toLowerCase();
  if (email === '') {
    recordLoginFailure_();
    throw appError_(ERROR_CODES.UNAUTHENTICATED, 'ไม่พบอีเมลในข้อมูลการเข้าสู่ระบบ');
  }

  return { email: email, name: String(info.name || ''), picture: String(info.picture || '') };
}

function sessionSecret_() {
  return requireProp_(PROP_SESSION_SECRET, 'รัน setupSystem() เพื่อสร้างกุญแจลับให้อัตโนมัติ');
}

/**
 * เข้าสู่ระบบ
 * ผู้ใช้ที่ไม่มีในชีต Users จะถูกปฏิเสธ ยกเว้นอีเมลที่ตั้งเป็นผู้ดูแลคนแรก
 * ซึ่งจะถูกสร้างเป็น admin ให้อัตโนมัติครั้งเดียว (ขั้นตอนสร้าง admin คนแรกอย่างปลอดภัย)
 */
function login_(idToken) {
  const identity = verifyGoogleIdToken_(idToken);

  return withScriptLock_(function () {
    let user = findByKey_(Domain.SHEET_USERS, identity.email);

    if (user === null) {
      const bootstrapAdmin = getProp_(PROP_BOOTSTRAP_ADMIN).trim().toLowerCase();

      /*
       * สร้างผู้ดูแลคนแรกได้เฉพาะตอนที่ "ยังไม่มีผู้ดูแลในระบบเลย"
       *
       * ถ้าตรวจแค่ว่าอีเมลตรงกับ BOOTSTRAP_ADMIN_EMAIL จะเกิดช่องโหว่:
       * ผู้ดูแลที่ถูกถอดถอน (ลบแถวออกจากชีต Users) จะล็อกอินกลับเข้ามาเป็น admin
       * ได้ใหม่ทันที เพราะค่า property ยังค้างอยู่ — เท่ากับประตูหลังที่ปิดไม่ลง
       */
      const hasAnyAdmin = adminExists_();

      if (bootstrapAdmin !== '' && bootstrapAdmin === identity.email && !hasAnyAdmin) {
        user = {
          email: identity.email,
          displayName: identity.name || identity.email,
          department: '',
          role: 'admin',
          status: 'active',
          tokenVersion: 1,
          lastLoginAt: nowIso_(),
          createdAt: nowIso_(),
          updatedAt: nowIso_(),
        };
        appendObject_(Domain.SHEET_USERS, user);
        audit_(identity.email, 'user.bootstrapAdmin', 'user', identity.email, {
          note: 'สร้างผู้ดูแลคนแรกจากค่า BOOTSTRAP_ADMIN_EMAIL',
        });
        bumpDataVersion_();
      } else {
        throw appError_(
          ERROR_CODES.FORBIDDEN,
          'อีเมลนี้ยังไม่ได้รับสิทธิ์เข้าใช้ระบบ กรุณาติดต่อผู้ดูแลระบบ',
        );
      }
    }

    if (String(user.status) !== 'active') {
      throw appError_(ERROR_CODES.FORBIDDEN, 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    updateByKey_(Domain.SHEET_USERS, identity.email, { lastLoginAt: nowIso_() });

    const now = serverNow_().getTime();
    const token = Domain.createSessionToken(
      {
        email: String(user.email),
        role: String(user.role) === 'admin' ? 'admin' : 'staff',
        tokenVersion: Number(user.tokenVersion) || 1,
        expiresAt: Domain.sessionExpiryFrom(now, SESSION_TTL_MS),
      },
      sessionSecret_(),
      hmacBase64_,
    );

    return { token: token, user: publicUser_(user) };
  });
}

/** มีผู้ดูแลที่ใช้งานได้อยู่ในระบบแล้วหรือยัง — ใช้คุมการสร้างผู้ดูแลคนแรก */
function adminExists_() {
  const all = readAll_(Domain.SHEET_USERS);
  for (let i = 0; i < all.objects.length; i += 1) {
    const user = all.objects[i];
    if (String(user.role) === 'admin' && String(user.status) === 'active') return true;
  }
  return false;
}

/** ข้อมูลผู้ใช้ที่ส่งกลับหน้าเว็บได้ — ไม่มีฟิลด์ภายในอย่าง tokenVersion ติดไปด้วย */
function publicUser_(user) {
  return {
    email: String(user.email),
    displayName: String(user.displayName || user.email),
    department: String(user.department || ''),
    role: String(user.role) === 'admin' ? 'admin' : 'staff',
    status: String(user.status || 'active'),
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
