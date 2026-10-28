/** สัญญาระหว่างหน้าเว็บกับ Apps Script — ต้องตรงกับที่ apps-script/50_Api.gs ส่งกลับ */

import type { SystemSettings } from '@shared/schemas/settings';
import type { UserRole, UserStatus } from '@shared/schemas/user';
import type { FieldIssue } from '@shared/validate/check';

export interface SessionUser {
  email: string;
  displayName: string;
  department: string;
  role: UserRole;
  status: UserStatus;
}

export interface LoginResult {
  token: string;
  user: SessionUser;
}

export interface BootstrapResult {
  user: SessionUser;
  settings: SystemSettings;
  dataVersion: number;
  serverTime: string;
}

export interface VersionResult {
  dataVersion: number;
  serverTime: string;
}

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'BUSY'
  | 'NOT_CONFIGURED'
  | 'INTERNAL'
  | 'NETWORK';

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; issues?: FieldIssue[] } };

/** ข้อผิดพลาดที่มีรหัสติดมา เพื่อให้หน้าจอตัดสินใจได้ว่าควรทำอะไรต่อ */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly issues: FieldIssue[];

  constructor(code: ApiErrorCode, message: string, issues: FieldIssue[] = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.issues = issues;
  }

  /** ต้องให้ผู้ใช้เข้าสู่ระบบใหม่หรือไม่ */
  get requiresLogin(): boolean {
    return this.code === 'UNAUTHENTICATED';
  }
}

export interface Transport {
  readonly kind: 'http' | 'demo';
  call<T>(action: string, payload?: unknown, token?: string): Promise<T>;
  version(): Promise<VersionResult>;
}
