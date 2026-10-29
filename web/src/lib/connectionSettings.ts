import { readLocal, removeLocal, writeLocal } from './storage';

/**
 * ลิงก์สำหรับเชื่อมระบบกับ Google ภายหลัง — ตอนนี้แค่เก็บไว้ ยังไม่ได้นำไปใช้เรียกข้อมูล
 *
 * เก็บใน localStorage ของเบราว์เซอร์ที่กรอกเท่านั้น (ไม่ส่งไปที่ไหน และผู้ใช้เครื่องอื่นไม่เห็น)
 * ไม่มีความลับ: URL ของ Web App / ชีต / โฟลเดอร์ไม่ใช่รหัสผ่าน สิทธิ์เข้าถึงคุมที่ Google
 */
export interface ConnectionSettings {
  /** Google Apps Script Web App URL ลงท้าย /exec */
  endpointUrl: string;
  /** ลิงก์ Google Sheets ที่ใช้เป็นฐานข้อมูล */
  sheetUrl: string;
  /** ลิงก์โฟลเดอร์ Google Drive สำหรับเก็บไฟล์ */
  driveUrl: string;
  /** ISO time ที่บันทึกล่าสุด ('' = ยังไม่เคยบันทึก) */
  savedAt: string;
}

export const CONNECTION_SETTINGS_KEY = 'mrb.connection.v1';

export const EMPTY_CONNECTION: ConnectionSettings = { endpointUrl: '', sheetUrl: '', driveUrl: '', savedAt: '' };

export type ConnectionField = 'endpointUrl' | 'sheetUrl' | 'driveUrl';

const PATTERNS: Record<ConnectionField, { pattern: RegExp; message: string }> = {
  // ทั้งบัญชีส่วนตัว (/macros/s/) และบัญชีองค์กร (/a/macros/<โดเมน>/s/) ต้องลงท้าย /exec (ไม่ใช่ /dev ที่ใช้ได้แค่เจ้าของ)
  endpointUrl: {
    pattern: /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/\s]+|macros)\/s\/([A-Za-z0-9_-]{10,})\/exec\/?$/,
    message: 'ต้องเป็นลิงก์ Web App ที่ขึ้นต้นด้วย https://script.google.com/macros/s/ และลงท้ายด้วย /exec',
  },
  sheetUrl: {
    pattern: /^https:\/\/docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{20,})(?:[/?#].*)?$/,
    message: 'ต้องเป็นลิงก์ Google Sheets เช่น https://docs.google.com/spreadsheets/d/…',
  },
  driveUrl: {
    pattern: /^https:\/\/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|open\?id=)([A-Za-z0-9_-]{10,})(?:[/?#&].*)?$/,
    message: 'ต้องเป็นลิงก์โฟลเดอร์ Google Drive เช่น https://drive.google.com/drive/folders/…',
  },
};

/** ช่องว่างถือว่าผ่าน (ยังไม่ได้ตั้ง) — คืนข้อความผิดพลาด หรือ '' ถ้าถูกต้อง */
export function validateConnectionField(field: ConnectionField, value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  return PATTERNS[field].pattern.test(trimmed) ? '' : PATTERNS[field].message;
}

/** ดึงรหัส (ID) จากลิงก์ เพื่อให้ผู้ดูแลเห็นว่าระบบอ่านลิงก์ถูกตัว */
export function extractConnectionId(field: ConnectionField, value: string): string {
  return PATTERNS[field].pattern.exec(value.trim())?.[1] ?? '';
}

export function readConnectionSettings(): ConnectionSettings {
  const raw = readLocal(CONNECTION_SETTINGS_KEY);
  if (raw === null) return EMPTY_CONNECTION;
  try {
    const parsed = JSON.parse(raw) as Partial<ConnectionSettings>;
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    return {
      endpointUrl: text(parsed.endpointUrl),
      sheetUrl: text(parsed.sheetUrl),
      driveUrl: text(parsed.driveUrl),
      savedAt: text(parsed.savedAt),
    };
  } catch {
    return EMPTY_CONNECTION;
  }
}

export function saveConnectionSettings(values: Omit<ConnectionSettings, 'savedAt'>): ConnectionSettings {
  const next: ConnectionSettings = {
    endpointUrl: values.endpointUrl.trim(),
    sheetUrl: values.sheetUrl.trim(),
    driveUrl: values.driveUrl.trim(),
    savedAt: new Date().toISOString(),
  };
  writeLocal(CONNECTION_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function clearConnectionSettings(): void {
  removeLocal(CONNECTION_SETTINGS_KEY);
}
