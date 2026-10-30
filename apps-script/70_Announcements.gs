/** ประกาศประชาสัมพันธ์ — ทุกคนอ่านได้ เฉพาะผู้ดูแลเพิ่ม/แก้/ลบ */

function publicAnnouncement_(row) {
  return {
    announcementId: String(row.announcementId), title: String(row.title || ''), body: String(row.body || ''),
    tone: Domain.ANNOUNCEMENT_TONES.indexOf(String(row.tone)) >= 0 ? String(row.tone) : 'info',
    expiresOn: row.expiresOn ? Domain.normalizeDateKey(row.expiresOn) : '',
    createdBy: String(row.createdBy || ''), createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || ''), archivedAt: String(row.archivedAt || ''),
  };
}

function listAnnouncements_(user) {
  const today = Domain.toDateKey(serverNow_());
  return { announcements: Domain.activeAnnouncements(readAll_(Domain.SHEET_ANNOUNCEMENTS).map(publicAnnouncement_), today) };
}

function saveAnnouncement_(user, raw) {
  const parsed = Domain.validateAnnouncementInput(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'ข้อมูลประกาศไม่ถูกต้อง', parsed.issues);
  const input = parsed.value;
  return withScriptLock_(function () {
    const now = nowIso_();
    if (input.announcementId === '') {
      const created = {
        announcementId: newId_('an'), title: input.title, body: input.body, tone: input.tone, expiresOn: input.expiresOn,
        createdBy: user.email, createdAt: now, updatedAt: now, archivedAt: '',
      };
      appendObject_(Domain.SHEET_ANNOUNCEMENTS, created);
      audit_(user.email, 'announcement.create', 'announcement', created.announcementId, { title: input.title });
      bumpDataVersion_();
      return { announcement: publicAnnouncement_(created) };
    }
    const row = findByKey_(Domain.SHEET_ANNOUNCEMENTS, input.announcementId);
    if (!row || row.archivedAt) throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบประกาศ');
    const patch = { title: input.title, body: input.body, tone: input.tone, expiresOn: input.expiresOn, updatedAt: now };
    updateByKey_(Domain.SHEET_ANNOUNCEMENTS, input.announcementId, patch);
    audit_(user.email, 'announcement.update', 'announcement', input.announcementId, { title: input.title });
    bumpDataVersion_();
    return { announcement: publicAnnouncement_(Object.assign({}, row, patch)) };
  });
}

function archiveAnnouncement_(user, payload) {
  return withScriptLock_(function () {
    const row = findByKey_(Domain.SHEET_ANNOUNCEMENTS, String(payload.announcementId || ''));
    if (!row || row.archivedAt) throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบประกาศ');
    const now = nowIso_();
    updateByKey_(Domain.SHEET_ANNOUNCEMENTS, String(row.announcementId), { archivedAt: now, updatedAt: now });
    audit_(user.email, 'announcement.archive', 'announcement', String(row.announcementId), {});
    bumpDataVersion_();
    return { ok: true };
  });
}
