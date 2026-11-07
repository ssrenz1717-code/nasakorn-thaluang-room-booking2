/**
 * รีวิวห้องหลังใช้งาน — กฎว่าใครรีวิวอะไรได้อยู่ใน Domain.reviewEligibility (ใช้ร่วมกับหน้าเว็บ)
 * คะแนนเฉลี่ย: ทุกคนเห็น · ความคิดเห็น: ผู้ดูแลเห็นทั้งหมด คนอื่นเห็นเฉพาะของตัวเอง
 */

function publicReview_(row) {
  const review = {
    bookingId: String(row.bookingId), roomId: String(row.roomId), userEmail: String(row.userEmail),
    userName: String(row.userName || ''), department: String(row.department || ''),
    bookingTitle: String(row.bookingTitle || ''), dateKey: Domain.normalizeDateKey(row.dateKey),
    comment: String(row.comment || ''), createdAt: String(row.createdAt || ''),
  };
  Domain.REVIEW_ASPECTS.forEach(function (aspect) { review[aspect] = Number(row[aspect]) || 0; });
  return review;
}

function readReviews_() {
  return readAll_(Domain.SHEET_REVIEWS).objects.map(publicReview_);
}

/** คะแนนเฉลี่ยรายห้อง — ไม่มีชื่อหรือความคิดเห็นของใครติดไป */
function reviewSummary_() {
  return { summary: Domain.summarizeRoomRatings(readReviews_()) };
}

function listReviews_(user) {
  const reviews = readReviews_();
  return { reviews: user.role === 'admin' ? reviews : reviews.filter(function (review) {
    return review.userEmail === user.email;
  }) };
}

function submitReview_(user, raw) {
  const parsed = Domain.validateReviewInput(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'ข้อมูลรีวิวไม่ถูกต้อง', parsed.issues);
  const input = parsed.value;
  return withScriptLock_(function () {
    const booking = findByKey_(Domain.SHEET_BOOKINGS, input.bookingId);
    if (!booking) throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบรายการจอง');
    const eligibility = Domain.reviewEligibility({
      status: String(booking.status), dateKey: Domain.normalizeDateKey(booking.dateKey),
      endMin: Number(booking.endMin), userEmail: String(booking.userEmail),
    }, { userEmail: user.email, now: serverNow_(), alreadyReviewed: findByKey_(Domain.SHEET_REVIEWS, input.bookingId) !== null });
    if (!eligibility.ok) throw appError_(ERROR_CODES.CONFLICT, eligibility.message);
    const review = {
      bookingId: input.bookingId, roomId: String(booking.roomId), userEmail: user.email, userName: user.displayName,
      department: String(booking.department || ''), bookingTitle: String(booking.title || ''),
      dateKey: Domain.normalizeDateKey(booking.dateKey), comment: input.comment, createdAt: nowIso_(),
    };
    Domain.REVIEW_ASPECTS.forEach(function (aspect) { review[aspect] = input[aspect]; });
    appendObject_(Domain.SHEET_REVIEWS, review);
    audit_(user.email, 'review.create', 'booking', input.bookingId, { overall: input.overall });
    bumpDataVersion_();
    return { review: review };
  });
}
