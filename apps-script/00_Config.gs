/**
 * ค่าคอนฟิกของระบบ — เก็บใน Script Properties ไม่เขียนลงโค้ด
 *
 * ตั้งค่าได้ที่ Apps Script Editor > Project Settings > Script Properties
 * หรือเรียก setupSystem() ซึ่งจะสร้างค่าที่สร้างเองได้ให้ทั้งหมด
 */

const PROP_SPREADSHEET_ID = 'SPREADSHEET_ID';
const PROP_OAUTH_CLIENT_ID = 'OAUTH_CLIENT_ID';
const PROP_SESSION_SECRET = 'SESSION_SECRET';
const PROP_BOOTSTRAP_ADMIN = 'BOOTSTRAP_ADMIN_EMAIL';

/** อายุของ session token — ยาวพอให้ทำงานได้ทั้งวันโดยไม่ต้อง login ซ้ำ */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** รอคิวล็อกนานสุดกี่มิลลิวินาที ก่อนบอกผู้ใช้ว่าระบบคนใช้เยอะ */
const LOCK_TIMEOUT_MS = 20 * 1000;

/**
 * เพดานจำนวน "การเข้าสู่ระบบที่ล้มเหลว" ต่อชั่วโมงของทั้งระบบ
 *
 * ทำไมต้องมี: หน้าเว็บอยู่บน GitHub Pages ซึ่งเป็นเว็บสาธารณะ URL ของ Apps Script
 * จึงอ่านได้จากโค้ดหน้าเว็บ ถ้าใครยิง token ปลอมรัว ๆ ทุกครั้งจะกิน UrlFetch
 * (โควตา 20,000 ครั้ง/วัน) จนคนในองค์กรเข้าสู่ระบบไม่ได้ทั้งวัน
 *
 * นับเฉพาะครั้งที่ล้มเหลว คนใช้งานจริงที่ล็อกอินผ่านจึงไม่โดนกระทบ
 * ผู้ใช้จริงล้มเหลวกันไม่กี่ครั้งต่อวัน เลขนี้จึงกว้างเกินพอ
 */
const LOGIN_FAILURE_LIMIT_PER_HOUR = 100;

/** รหัสข้อผิดพลาดที่หน้าเว็บใช้ตัดสินใจว่าจะแสดงอะไร */
const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION: 'VALIDATION',
  BUSY: 'BUSY',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  INTERNAL: 'INTERNAL',
};

function scriptProps_() {
  return PropertiesService.getScriptProperties();
}

function getProp_(key) {
  const value = scriptProps_().getProperty(key);
  return value === null ? '' : value;
}

function requireProp_(key, howToFix) {
  const value = getProp_(key);
  if (value === '') {
    throw appError_(
      ERROR_CODES.NOT_CONFIGURED,
      `ยังไม่ได้ตั้งค่า ${key} — ${howToFix || 'ดูขั้นตอนติดตั้งใน README'}`,
    );
  }
  return value;
}

/**
 * สร้าง error ที่มีรหัสติดมาด้วย เพื่อให้หน้าเว็บแยกแยะได้ว่าควรทำอะไรต่อ
 * (เช่น UNAUTHENTICATED = เด้งไปหน้า login, CONFLICT = เสนอเวลาอื่น)
 */
function appError_(code, message, details) {
  const error = new Error(message);
  error.appCode = code;
  if (details !== undefined) error.appDetails = details;
  return error;
}

/** เวลาปัจจุบันของ server — ทุกการตัดสินเรื่องเวลาต้องใช้ค่านี้ ไม่ใช่เวลาจากเครื่องผู้ใช้ */
function serverNow_() {
  return new Date();
}

function nowIso_() {
  return serverNow_().toISOString();
}

function newId_(prefix) {
  return `${prefix}_${Utilities.getUuid().replace(/-/g, '').substring(0, 16)}`;
}
