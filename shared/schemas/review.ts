/**
 * รีวิวห้องหลังใช้งาน — ผู้จองให้คะแนน 1–5 ดาว 4 ด้าน และเขียนความคิดเห็นได้
 *
 * ใครเห็นอะไร:
 *  - คะแนนเฉลี่ยรายห้อง: ทุกคนที่ล็อกอิน (ช่วยเลือกห้อง)
 *  - ความคิดเห็น: ผู้ดูแลระบบ และเจ้าของรีวิวเอง — ไม่ส่งไปให้คนอื่น
 *
 * รีวิวได้ครั้งเดียวต่อการจอง เฉพาะการจองของตัวเองที่อนุมัติแล้วและเลยเวลาสิ้นสุดแล้ว
 */

import { Check, asRecord, type ValidationResult } from '../validate/check';
import { fromDateKeyAndMinutes } from '../time/bangkok';

export const REVIEW_ASPECTS = ['overall', 'cleanliness', 'equipment', 'ease'] as const;
export type ReviewAspect = (typeof REVIEW_ASPECTS)[number];

export const REVIEW_ASPECT_LABEL_TH: Record<ReviewAspect, string> = {
  overall: 'ความพึงพอใจโดยรวม',
  cleanliness: 'ความสะอาด',
  equipment: 'อุปกรณ์',
  ease: 'ความสะดวกในการใช้งาน',
};

export const REVIEW_COMMENT_MAX = 500;

/** ดูรีวิวย้อนหลังได้ไม่เกินกี่วันหลังประชุม — กันคะแนนจากความจำที่เลือนแล้ว */
export const REVIEW_WINDOW_DAYS = 30;

export type ReviewScores = Record<ReviewAspect, number>;

export interface ReviewInput extends ReviewScores {
  bookingId: string;
  comment: string;
}

export interface Review extends ReviewInput {
  roomId: string;
  userEmail: string;
  userName: string;
  department: string;
  /** หัวข้อการประชุมและวันที่ — คัดลอกไว้ให้หน้ารวมรีวิวอ่านได้โดยไม่ต้องโหลดการจองทั้งหมด */
  bookingTitle: string;
  dateKey: string;
  createdAt: string;
}

export interface RoomRatingSummary extends ReviewScores {
  roomId: string;
  count: number;
}

export function validateReviewInput(raw: unknown): ValidationResult<ReviewInput> {
  const input = asRecord(raw);
  const check = new Check();
  const bookingId = check.string('bookingId', input.bookingId, { label: 'รหัสการจอง', max: 80 });
  const scores = {} as ReviewScores;
  for (const aspect of REVIEW_ASPECTS) {
    scores[aspect] = check.integer(aspect, input[aspect], { label: REVIEW_ASPECT_LABEL_TH[aspect], min: 1, max: 5 });
  }
  const comment = check.string('comment', input.comment, { label: 'ความคิดเห็น', max: REVIEW_COMMENT_MAX, fallback: '' });
  return check.result({ bookingId, ...scores, comment });
}

export interface ReviewableBooking {
  status: string;
  dateKey: string;
  endMin: number;
  userEmail: string;
}

export type ReviewEligibility = { ok: true } | { ok: false; message: string };

/** เช็กว่ารีวิวการจองนี้ได้หรือยัง — ใช้ทั้งตอนแสดงปุ่มและตอน server รับข้อมูล */
export function reviewEligibility(
  booking: ReviewableBooking,
  context: { userEmail: string; now: Date; alreadyReviewed: boolean },
): ReviewEligibility {
  if (booking.userEmail !== context.userEmail) return { ok: false, message: 'รีวิวได้เฉพาะการจองของตัวเอง' };
  if (booking.status !== 'confirmed' && booking.status !== 'completed') {
    return { ok: false, message: 'รีวิวได้เฉพาะการจองที่อนุมัติแล้ว' };
  }
  if (context.alreadyReviewed) return { ok: false, message: 'รีวิวการจองนี้ไปแล้ว' };
  const end = fromDateKeyAndMinutes(booking.dateKey, booking.endMin).getTime();
  if (context.now.getTime() < end) return { ok: false, message: 'รีวิวได้หลังประชุมเสร็จแล้ว' };
  if (context.now.getTime() > end + REVIEW_WINDOW_DAYS * 86_400_000) {
    return { ok: false, message: `เลยกำหนดรีวิวแล้ว (รีวิวได้ภายใน ${REVIEW_WINDOW_DAYS} วันหลังประชุม)` };
  }
  return { ok: true };
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** คะแนนเฉลี่ยรายห้อง (ทศนิยม 1 ตำแหน่ง) — ห้องที่ไม่มีรีวิวจะไม่อยู่ในผลลัพธ์ */
export function summarizeRoomRatings(reviews: readonly (ReviewScores & { roomId: string })[]): RoomRatingSummary[] {
  const totals = new Map<string, { count: number } & ReviewScores>();
  for (const review of reviews) {
    const total = totals.get(review.roomId) ?? { count: 0, overall: 0, cleanliness: 0, equipment: 0, ease: 0 };
    total.count += 1;
    for (const aspect of REVIEW_ASPECTS) total[aspect] += Number(review[aspect]) || 0;
    totals.set(review.roomId, total);
  }
  return [...totals.entries()].map(([roomId, total]) => {
    const summary = { roomId, count: total.count } as RoomRatingSummary;
    for (const aspect of REVIEW_ASPECTS) summary[aspect] = round1(total[aspect] / total.count);
    return summary;
  });
}
