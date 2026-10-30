import { Check, type ValidationResult, asRecord } from '../validate/check';
import { DATE_KEY_PATTERN } from '../time/bangkok';

/**
 * ประกาศประชาสัมพันธ์จากงานศูนย์ดิจิทัลฯ — เช่น ห้องปิดปรับปรุง หรือข่าวสารการใช้ห้อง
 * ผู้ดูแลเพิ่ม/แก้/ลบได้ ทุกคนเห็นบนหน้าภาพรวม
 */
export const ANNOUNCEMENT_TONES = ['info', 'notice', 'urgent'] as const;
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];
export const ANNOUNCEMENT_TONE_LABEL_TH: Record<AnnouncementTone, string> = {
  info: 'ข่าวสารทั่วไป',
  notice: 'แจ้งให้ทราบ',
  urgent: 'ด่วน / ห้องปิดใช้งาน',
};

export interface Announcement {
  announcementId: string;
  title: string;
  body: string;
  tone: AnnouncementTone;
  /** แสดงถึงวันนี้ (รวมวันนี้) — '' = ไม่มีวันหมดอายุ */
  expiresOn: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** ลบแล้ว (เก็บแถวไว้เพื่อตรวจย้อนหลัง) — '' = ยังแสดงอยู่ */
  archivedAt: string;
}

export interface AnnouncementInput {
  /** '' = สร้างใหม่ */
  announcementId: string;
  title: string;
  body: string;
  tone: AnnouncementTone;
  expiresOn: string;
}

export function validateAnnouncementInput(raw: unknown): ValidationResult<AnnouncementInput> {
  const input = asRecord(raw);
  const check = new Check();
  return check.result({
    announcementId: check.string('announcementId', input.announcementId, { label: 'รหัสประกาศ', max: 80, fallback: '' }),
    title: check.string('title', input.title, { label: 'หัวข้อประกาศ', min: 1, max: 120 }),
    body: check.string('body', input.body, { label: 'รายละเอียด', max: 1000, fallback: '' }),
    tone: check.oneOf('tone', input.tone ?? 'info', ANNOUNCEMENT_TONES, { label: 'ประเภทประกาศ' }),
    expiresOn: check.string('expiresOn', input.expiresOn, {
      label: 'แสดงถึงวันที่', fallback: '', pattern: /^(|\d{4}-\d{2}-\d{2})$/, patternMessage: 'วันที่หมดอายุต้องอยู่ในรูปแบบ YYYY-MM-DD',
    }),
  });
}

/** ประกาศที่ยังแสดงอยู่ในวันนี้ — ด่วนขึ้นก่อน แล้วเรียงใหม่ไปเก่า */
export function activeAnnouncements(items: Announcement[], todayKey: string): Announcement[] {
  const rank: Record<AnnouncementTone, number> = { urgent: 0, notice: 1, info: 2 };
  return items
    .filter((item) => item.archivedAt === '' && (item.expiresOn === '' || !DATE_KEY_PATTERN.test(item.expiresOn) || item.expiresOn >= todayKey))
    .sort((a, b) => rank[a.tone] - rank[b.tone] || b.createdAt.localeCompare(a.createdAt));
}
