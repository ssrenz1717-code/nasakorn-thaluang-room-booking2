import { describe, expect, it } from 'vitest';
import { activeAnnouncements, validateAnnouncementInput, type Announcement } from '../schemas/announcement';

const base: Announcement = {
  announcementId: 'a', title: 't', body: '', tone: 'info', expiresOn: '',
  createdBy: 'admin@x', createdAt: '2026-10-01T00:00:00Z', updatedAt: '', archivedAt: '',
};

describe('ประกาศ', () => {
  it('ตรวจข้อมูล: ต้องมีหัวข้อ วันหมดอายุว่างได้ ประเภทผิดไม่ผ่าน', () => {
    expect(validateAnnouncementInput({ title: 'ห้อง 3 ปิดปรับปรุง', tone: 'urgent', expiresOn: '2026-11-05' }).ok).toBe(true);
    expect(validateAnnouncementInput({ title: '   ' }).ok).toBe(false);
    expect(validateAnnouncementInput({ title: 'x', tone: 'party' }).ok).toBe(false);
    expect(validateAnnouncementInput({ title: 'x', expiresOn: '5/11/2026' }).ok).toBe(false);
  });

  it('ซ่อนประกาศที่ลบแล้วหรือหมดอายุ และเอาประกาศด่วนขึ้นก่อน', () => {
    const list = activeAnnouncements([
      { ...base, announcementId: 'old', createdAt: '2026-10-02T00:00:00Z' },
      { ...base, announcementId: 'urgent', tone: 'urgent', createdAt: '2026-09-01T00:00:00Z' },
      { ...base, announcementId: 'expired', expiresOn: '2026-10-29' },
      { ...base, announcementId: 'lastday', expiresOn: '2026-10-30', createdAt: '2026-10-03T00:00:00Z' },
      { ...base, announcementId: 'gone', archivedAt: '2026-10-10T00:00:00Z' },
    ], '2026-10-30');
    expect(list.map((item) => item.announcementId)).toEqual(['urgent', 'lastday', 'old']);
  });
});
