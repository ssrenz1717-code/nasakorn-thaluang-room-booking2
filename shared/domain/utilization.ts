/**
 * อัตราการใช้ห้องประชุม (ข้อกำหนด 6 ท้ายหัวข้อ)
 *
 * สูตร: นาทีที่ถูกจองจริง / (จำนวนห้องที่เปิดใช้งาน × นาทีเวลาทำการต่อวัน × จำนวนวันที่เปิดให้จอง)
 *
 * นับเฉพาะการจองสถานะ confirmed และ completed (ยกเลิก/ปฏิเสธไม่นับ)
 * และนับเฉพาะนาทีที่อยู่ในกรอบเวลาทำการ ส่วนที่ล้นออกไปถูกตัดก่อนรวม
 * ถ้าตัวหารเป็นศูนย์ คืน null เพื่อให้หน้าจอแสดง "–" ไม่ใช่ NaN% หรือ 0% ที่ทำให้เข้าใจผิด
 */

export interface UtilizationInput {
  /** นาทีที่ถูกจอง (ตัดส่วนที่ล้นนอกเวลาทำการแล้ว) */
  bookedMinutes: number;
  /** จำนวนห้องที่เปิดใช้งานในช่วงที่คิด */
  activeRoomCount: number;
  /** นาทีเวลาทำการต่อวัน เช่น 08:00-18:00 = 600 */
  bookableMinutesPerDay: number;
  /** จำนวนวันที่เปิดให้จองในช่วง (ตัดวันหยุดประจำสัปดาห์แล้ว) */
  bookableDayCount: number;
}

export interface UtilizationResult {
  /** 0-1 หรือ null เมื่อไม่มีข้อมูลพอให้คำนวณ */
  rate: number | null;
  bookedMinutes: number;
  capacityMinutes: number;
}

export function computeUtilization(input: UtilizationInput): UtilizationResult {
  const capacityMinutes =
    Math.max(0, input.activeRoomCount) *
    Math.max(0, input.bookableMinutesPerDay) *
    Math.max(0, input.bookableDayCount);

  const bookedMinutes = Math.max(0, input.bookedMinutes);

  if (capacityMinutes === 0) {
    return { rate: null, bookedMinutes, capacityMinutes: 0 };
  }

  // ตัดที่ 1 เพราะการจองคาบเกี่ยวเวลาทำการหรือข้อมูลย้อนหลังอาจดันตัวเลขเกิน 100%
  // ซึ่งผู้ใช้อ่านแล้วเชื่อถือตัวเลขทั้งหน้าน้อยลงทันที
  return {
    rate: Math.min(1, bookedMinutes / capacityMinutes),
    bookedMinutes,
    capacityMinutes,
  };
}

/** จัดรูปแบบไว้แสดงบนการ์ด — null กลายเป็น "–" */
export function formatUtilization(rate: number | null, fractionDigits = 1): string {
  if (rate === null) return '–';
  return `${(rate * 100).toFixed(fractionDigits)}%`;
}
