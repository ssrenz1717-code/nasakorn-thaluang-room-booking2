/**
 * การล็อกเพื่อกันการจองซ้ำ — หัวใจความถูกต้องของระบบทั้งระบบ
 *
 * Google Sheets ไม่มี transaction และไม่มี constraint แบบฐานข้อมูลจริง
 * แต่ Apps Script มี LockService.getScriptLock() ที่เอกสารระบุว่าโค้ดในบล็อกที่ล็อก
 * "cannot be executed simultaneously regardless of the identity of the user"
 *
 * ทุกการเขียนที่ต้องตัดสินใจจากข้อมูลที่อ่านมาก่อน (เช่น "ห้องว่างไหม")
 * ต้องอยู่ใน withScriptLock_ ทั้งก้อน ห้ามอ่านนอกล็อกแล้วเขียนในล็อก
 * เพราะข้อมูลที่อ่านไว้ก่อนอาจเก่าไปแล้วตอนเขียน ซึ่งคือช่องให้จองซ้ำได้
 */

function withScriptLock_(operation) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw appError_(
      ERROR_CODES.BUSY,
      'ระบบกำลังประมวลผลคำขอจำนวนมาก กรุณากดอีกครั้งในอีกสักครู่',
    );
  }

  try {
    return operation();
  } finally {
    // ปล่อยล็อกใน finally เสมอ ไม่ว่าจะ error หรือไม่
    // ถ้าไม่ปล่อย คำขอถัดไปจะรอจนหมด timeout ทั้งที่งานเสร็จไปแล้ว
    lock.releaseLock();
  }
}
