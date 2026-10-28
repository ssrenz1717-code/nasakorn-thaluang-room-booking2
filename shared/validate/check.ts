/**
 * ตัวตรวจรูปร่างข้อมูล (shape validation) ที่ไม่พึ่ง dependency ใด ๆ
 *
 * ทำไมไม่ใช้ zod: โค้ดในโฟลเดอร์ shared ต้องรันได้บน Google Apps Script ด้วย
 * ซึ่งเป็น V8 ที่ไม่มี ES Modules และไม่มี Node API — bundle ของ zod มี
 * dynamic import() กับ process.* ติดมาและใหญ่ถึง 849 KB จึงใช้ไม่ได้
 *
 * ผลพลอยได้: หน้าเว็บและฝั่ง server ตรวจข้อมูลด้วยโค้ดบรรทัดเดียวกันจริง ๆ
 * ไม่ใช่เขียนกฎเดียวกันสองที่แล้วหวังว่าจะไม่หลุดจากกัน
 */

export interface FieldIssue {
  /** ชื่อฟิลด์ในฟอร์ม ใช้ไฮไลต์ช่องที่ผิด */
  field: string;
  /** ข้อความภาษาไทยที่แสดงให้ผู้ใช้เห็นได้ตรง ๆ */
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: FieldIssue[] };

export interface StringOptions {
  label: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  /** ใช้เมื่อฟิลด์ไม่บังคับ — ค่าที่ไม่ได้ส่งมาจะกลายเป็นค่านี้ */
  fallback?: string;
  /** ตัดช่องว่างหัวท้ายก่อนตรวจ (ค่าเริ่มต้น: ตัด) */
  trim?: boolean;
}

export interface NumberOptions {
  label: string;
  min?: number;
  max?: number;
}

/** แปลงค่าที่ไม่รู้ที่มาให้เป็น object ที่อ่านฟิลด์ได้ โดยไม่ throw */
export function asRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

/**
 * ตัวเก็บข้อผิดพลาด — เก็บทุกข้อแล้วคืนพร้อมกัน ไม่หยุดที่ข้อแรก
 * เมธอดทุกตัวคืนค่าที่ใช้ต่อได้แม้ข้อมูลผิด เพื่อให้ตรวจฟิลด์ที่เหลือได้ครบ
 */
export class Check {
  readonly issues: FieldIssue[] = [];

  get ok(): boolean {
    return this.issues.length === 0;
  }

  fail(field: string, message: string): void {
    this.issues.push({ field, message });
  }

  result<T>(value: T): ValidationResult<T> {
    return this.ok ? { ok: true, value } : { ok: false, issues: this.issues };
  }

  string(field: string, raw: unknown, options: StringOptions): string {
    const { label, fallback } = options;

    if (raw === undefined || raw === null || raw === '') {
      if (fallback !== undefined) return fallback;
      this.fail(field, `กรุณากรอก${label}`);
      return '';
    }

    if (typeof raw !== 'string') {
      this.fail(field, `${label}ต้องเป็นข้อความ`);
      return fallback ?? '';
    }

    const value = options.trim === false ? raw : raw.trim();

    if (value === '' && fallback !== undefined) return fallback;
    if (value === '') {
      this.fail(field, `กรุณากรอก${label}`);
      return '';
    }
    if (options.min !== undefined && value.length < options.min) {
      this.fail(field, `${label}ต้องยาวอย่างน้อย ${options.min} ตัวอักษร`);
    }
    if (options.max !== undefined && value.length > options.max) {
      this.fail(field, `${label}ยาวเกิน ${options.max} ตัวอักษร`);
    }
    if (options.pattern !== undefined && !options.pattern.test(value)) {
      this.fail(field, options.patternMessage ?? `รูปแบบ${label}ไม่ถูกต้อง`);
    }
    return value;
  }

  integer(field: string, raw: unknown, options: NumberOptions): number {
    const { label } = options;

    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      this.fail(field, `${label}ต้องเป็นตัวเลข`);
      return options.min ?? 0;
    }
    if (!Number.isInteger(raw)) {
      this.fail(field, `${label}ต้องเป็นจำนวนเต็ม`);
      return Math.trunc(raw);
    }
    if (options.min !== undefined && raw < options.min) {
      this.fail(field, `${label}ต้องไม่น้อยกว่า ${options.min}`);
    }
    if (options.max !== undefined && raw > options.max) {
      this.fail(field, `${label}ต้องไม่เกิน ${options.max}`);
    }
    return raw;
  }

  boolean(field: string, raw: unknown, options: { label: string; fallback?: boolean }): boolean {
    if (typeof raw === 'boolean') return raw;
    if (raw === undefined || raw === null) {
      if (options.fallback !== undefined) return options.fallback;
      this.fail(field, `กรุณาระบุ${options.label}`);
      return false;
    }
    this.fail(field, `${options.label}ต้องเป็นค่าใช่หรือไม่ใช่`);
    return options.fallback ?? false;
  }

  oneOf<T extends string>(
    field: string,
    raw: unknown,
    allowed: readonly T[],
    options: { label: string; fallback?: T },
  ): T {
    if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) {
      return raw as T;
    }
    if ((raw === undefined || raw === null || raw === '') && options.fallback !== undefined) {
      return options.fallback;
    }
    this.fail(field, `${options.label}ไม่ถูกต้อง`);
    return options.fallback ?? (allowed[0] as T);
  }

  /** รายการค่าจากชุดที่กำหนด — ตัดค่าซ้ำออกและรายงานค่าที่ไม่รู้จัก */
  manyOf<T extends string>(
    field: string,
    raw: unknown,
    allowed: readonly T[],
    options: { label: string },
  ): T[] {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      this.fail(field, `${options.label}ต้องเป็นรายการ`);
      return [];
    }

    const picked: T[] = [];
    for (const item of raw) {
      if (typeof item === 'string' && (allowed as readonly string[]).includes(item)) {
        if (!picked.includes(item as T)) picked.push(item as T);
      } else {
        this.fail(field, `${options.label}มีค่าที่ไม่รู้จัก`);
        return picked;
      }
    }
    return picked;
  }

  /** URL หรือ null — ใช้กับรูปภาพห้องที่ไม่บังคับ */
  urlOrNull(field: string, raw: unknown, options: { label: string }): string | null {
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string') {
      this.fail(field, `${options.label}ต้องเป็นข้อความ`);
      return null;
    }
    const value = raw.trim();
    if (!/^https?:\/\/[^\s]+$/i.test(value)) {
      this.fail(field, `${options.label}ต้องเป็นลิงก์ที่เริ่มด้วย http:// หรือ https://`);
      return null;
    }
    return value;
  }
}
