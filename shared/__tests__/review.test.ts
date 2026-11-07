import { describe, expect, it } from 'vitest';
import { reviewEligibility, summarizeRoomRatings, validateReviewInput, REVIEW_COMMENT_MAX } from '../schemas/review';
import { fromDateKeyAndMinutes } from '../time/bangkok';

const booking = { status: 'confirmed', dateKey: '2026-11-05', endMin: 10 * 60, userEmail: 'teacher' };
const end = fromDateKeyAndMinutes('2026-11-05', 10 * 60);
const at = (minutesAfterEnd: number) => new Date(end.getTime() + minutesAfterEnd * 60_000);

describe('validateReviewInput', () => {
  const good = { bookingId: 'bk-1', overall: 5, cleanliness: 4, equipment: 3, ease: 1, comment: '  แอร์เย็นดี  ' };

  it('รับคะแนน 1–5 และตัดช่องว่างความคิดเห็น', () => {
    const result = validateReviewInput(good);
    expect(result.ok && result.value.comment).toBe('แอร์เย็นดี');
  });

  it('ความคิดเห็นไม่บังคับ', () => {
    const result = validateReviewInput({ ...good, comment: undefined });
    expect(result.ok && result.value.comment).toBe('');
  });

  it.each([0, 6, 3.5, '4', null])('ปฏิเสธคะแนน %s', (bad) => {
    const result = validateReviewInput({ ...good, cleanliness: bad });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]!.field).toBe('cleanliness');
  });

  it('ความคิดเห็นยาวเกินไม่ได้', () => {
    expect(validateReviewInput({ ...good, comment: 'ก'.repeat(REVIEW_COMMENT_MAX + 1) }).ok).toBe(false);
  });
});

describe('reviewEligibility', () => {
  const ctx = { userEmail: 'teacher', now: at(5), alreadyReviewed: false };

  it('การจองของตัวเองที่อนุมัติแล้วและประชุมเสร็จแล้ว รีวิวได้', () => {
    expect(reviewEligibility(booking, ctx).ok).toBe(true);
    expect(reviewEligibility({ ...booking, status: 'completed' }, ctx).ok).toBe(true);
  });

  it('ยังไม่ถึงเวลาเลิกประชุม รีวิวไม่ได้', () => {
    expect(reviewEligibility(booking, { ...ctx, now: at(-1) })).toEqual({ ok: false, message: 'รีวิวได้หลังประชุมเสร็จแล้ว' });
  });

  it.each(['pending', 'rejected', 'cancelled'])('สถานะ %s รีวิวไม่ได้', (status) => {
    expect(reviewEligibility({ ...booking, status }, ctx).ok).toBe(false);
  });

  it('การจองของคนอื่น / รีวิวซ้ำ / เลย 30 วัน รีวิวไม่ได้', () => {
    expect(reviewEligibility(booking, { ...ctx, userEmail: 'shoyu' }).ok).toBe(false);
    expect(reviewEligibility(booking, { ...ctx, alreadyReviewed: true }).ok).toBe(false);
    expect(reviewEligibility(booking, { ...ctx, now: at(31 * 24 * 60) }).ok).toBe(false);
  });
});

describe('summarizeRoomRatings', () => {
  it('เฉลี่ยรายห้อง ทศนิยม 1 ตำแหน่ง', () => {
    const summary = summarizeRoomRatings([
      { roomId: 'a', overall: 5, cleanliness: 4, equipment: 4, ease: 5 },
      { roomId: 'a', overall: 4, cleanliness: 4, equipment: 3, ease: 5 },
      { roomId: 'a', overall: 4, cleanliness: 5, equipment: 3, ease: 5 },
      { roomId: 'b', overall: 2, cleanliness: 2, equipment: 2, ease: 2 },
    ]);
    expect(summary.find((item) => item.roomId === 'a')).toEqual({ roomId: 'a', count: 3, overall: 4.3, cleanliness: 4.3, equipment: 3.3, ease: 5 });
    expect(summary.find((item) => item.roomId === 'b')?.count).toBe(1);
  });

  it('ไม่มีรีวิว ได้รายการว่าง', () => {
    expect(summarizeRoomRatings([])).toEqual([]);
  });
});
