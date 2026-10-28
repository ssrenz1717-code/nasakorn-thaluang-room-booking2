/**
 * ประตูเดียวที่หน้าเว็บคุยกับ server
 *
 * รูปแบบคำขอ (POST): { "action": "ชื่อคำสั่ง", "token": "session token", "payload": {...} }
 * รูปแบบคำตอบสำเร็จ: { "ok": true, "data": {...} }
 * รูปแบบคำตอบล้มเหลว: { "ok": false, "error": { "code": "...", "message": "ข้อความไทย", "issues": [...] } }
 *
 * หมายเหตุสำคัญ: Apps Script ตอบ HTTP 200 เสมอแม้มีข้อผิดพลาด
 * หน้าเว็บจึงต้องดูฟิลด์ ok ไม่ใช่ดู HTTP status
 *
 * ส่ง Content-Type เป็น text/plain จากหน้าเว็บ เพื่อให้เบราว์เซอร์ไม่ต้องยิง preflight
 * (Apps Script ไม่มีทางตั้ง CORS header เองได้ คำขอจึงต้องเป็นแบบ simple request)
 */

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : '';

  try {
    if (action === 'version') {
      // endpoint เบาที่สุดสำหรับให้หน้าเว็บถามทุก 15 วินาทีว่ามีอะไรเปลี่ยนไหม
      return jsonOutput_({ ok: true, data: { dataVersion: getDataVersion_(), serverTime: nowIso_() } });
    }
    return jsonOutput_({
      ok: true,
      data: { service: 'ระบบจองห้องประชุม', serverTime: nowIso_() },
    });
  } catch (error) {
    return jsonOutput_(errorEnvelope_(error));
  }
}

function doPost(e) {
  let request;
  try {
    request = parseRequest_(e);
  } catch (error) {
    return jsonOutput_(errorEnvelope_(error));
  }

  try {
    const handler = apiHandlers_()[request.action];
    if (handler === undefined) {
      throw appError_(ERROR_CODES.BAD_REQUEST, `ไม่รู้จักคำสั่ง "${request.action}"`);
    }
    return jsonOutput_({ ok: true, data: handler(request.payload, request.token) });
  } catch (error) {
    console.error(`คำสั่ง ${request.action} ล้มเหลว: ${error && error.message}`);
    return jsonOutput_(errorEnvelope_(error));
  }
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw appError_(ERROR_CODES.BAD_REQUEST, 'ไม่พบข้อมูลคำขอ');
  }
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (error) {
    throw appError_(ERROR_CODES.BAD_REQUEST, 'รูปแบบข้อมูลคำขอไม่ถูกต้อง');
  }
  const action = typeof body.action === 'string' ? body.action : '';
  if (action === '') throw appError_(ERROR_CODES.BAD_REQUEST, 'ไม่ได้ระบุคำสั่ง');

  return {
    action: action,
    token: typeof body.token === 'string' ? body.token : '',
    payload: body.payload === undefined || body.payload === null ? {} : body.payload,
  };
}

/**
 * ตารางคำสั่งทั้งหมด
 * โมดูลที่เพิ่มภายหลัง (ห้องประชุม การจอง รายงาน) จะมาเพิ่มรายการในนี้
 */
function apiHandlers_() {
  return {
    // ไม่ต้องล็อกอิน
    ping: function () {
      return { pong: true, serverTime: nowIso_() };
    },
    login: function (payload) {
      return login_(payload && payload.idToken);
    },

    // ต้องล็อกอิน
    me: function (payload, token) {
      return { user: authenticate_(token) };
    },
    bootstrap: function (payload, token) {
      const user = authenticate_(token);
      return {
        user: user,
        settings: readSettings_(),
        dataVersion: getDataVersion_(),
        serverTime: nowIso_(),
      };
    },
    rooms: function (payload, token) { return listRooms_(authenticate_(token)); },
    bookings: function (payload, token) { return listBookings_(authenticate_(token), payload || {}); },
    availability: function (payload, token) { return roomAvailability_(authenticate_(token), payload || {}); },
    createBooking: function (payload, token) { return createBooking_(authenticate_(token), payload); },
    cancelBooking: function (payload, token) { return cancelBooking_(authenticate_(token), payload || {}); },
    decideBooking: function (payload, token) { return decideBooking_(requireAdmin_(token), payload || {}); },
  };
}

function errorEnvelope_(error) {
  const code = (error && error.appCode) || ERROR_CODES.INTERNAL;
  const message =
    code === ERROR_CODES.INTERNAL
      ? 'ระบบขัดข้อง กรุณาลองอีกครั้ง หากยังเกิดซ้ำให้แจ้งผู้ดูแลระบบ'
      : (error && error.message) || 'เกิดข้อผิดพลาด';

  const envelope = { ok: false, error: { code: code, message: message } };
  if (error && error.appDetails !== undefined) envelope.error.issues = error.appDetails;

  // ข้อผิดพลาดที่ไม่คาดคิด ต้องขึ้น log ให้ครบเพื่อตามแก้ได้ แต่ไม่ส่งรายละเอียดภายในให้ client
  if (code === ERROR_CODES.INTERNAL && error) {
    console.error(`ข้อผิดพลาดที่ไม่คาดคิด: ${error.message}\n${error.stack || ''}`);
  }
  return envelope;
}

function jsonOutput_(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
