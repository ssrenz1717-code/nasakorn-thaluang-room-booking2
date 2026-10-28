/**
 * บันทึกประวัติการเปลี่ยนแปลง (ข้อกำหนด: ผู้ดูแลตรวจสอบประวัติได้)
 *
 * ชีต AuditLogs เป็นแบบเพิ่มเท่านั้น ไม่มีโค้ดที่ไหนแก้หรือลบแถวในชีตนี้
 * ทุกการกระทำที่เปลี่ยนข้อมูลต้องเรียกฟังก์ชันนี้ในล็อกเดียวกับการเขียนข้อมูลจริง
 */

function audit_(actorEmail, action, targetType, targetId, detail) {
  appendObject_(Domain.SHEET_AUDIT, {
    auditId: newId_('aud'),
    at: nowIso_(),
    actorEmail: actorEmail || 'system',
    action: action,
    targetType: targetType || '',
    targetId: targetId || '',
    detail: detail === undefined ? '' : JSON.stringify(detail),
  });
}
