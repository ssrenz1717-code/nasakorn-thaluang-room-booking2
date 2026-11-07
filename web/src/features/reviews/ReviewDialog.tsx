import { useState } from 'react';
import { REVIEW_ASPECTS, REVIEW_ASPECT_LABEL_TH, REVIEW_COMMENT_MAX, type Review, type ReviewAspect } from '@shared/schemas/review';
import { useApp } from '../../app/providers/AppProvider';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import type { DemoBooking } from '../../lib/api/demo';
import { StarInput } from './StarRating';

type Scores = Record<ReviewAspect, number>;
const EMPTY: Scores = { overall: 0, cleanliness: 0, equipment: 0, ease: 0 };

/** ให้คะแนนห้องหลังประชุม — ต้องให้ดาวครบ 4 ด้าน ความคิดเห็นไม่บังคับ */
export function ReviewDialog({ booking, placeName, onClose, onDone }: {
  booking: DemoBooking; placeName: string; onClose: () => void; onDone: (review: Review) => void;
}) {
  const { api, token } = useApp();
  const [scores, setScores] = useState<Scores>(EMPTY);
  const [comment, setComment] = useState('');
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (REVIEW_ASPECTS.some((aspect) => scores[aspect] === 0)) { setMissing(true); return; }
    setBusy(true); setError('');
    api.submitReview(token, { bookingId: booking.bookingId, ...scores, comment })
      .then(({ review }) => onDone(review))
      .catch((e: Error) => { setError(e.message); setBusy(false); });
  };

  return (
    <Dialog
      labelId="review-title"
      title={`ให้คะแนน ${placeName}`}
      description={booking.title}
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>ไว้ทีหลัง</Button>
        <Button loading={busy} loadingLabel="กำลังส่ง" onClick={submit}>ส่งคะแนน</Button>
      </>}
    >
      <div className="space-y-4">
        {error && <Alert tone="danger" title="ส่งคะแนนไม่สำเร็จ">{error}</Alert>}
        {REVIEW_ASPECTS.map((aspect) => (
          <StarInput
            key={aspect}
            name={`review-${aspect}`}
            legend={REVIEW_ASPECT_LABEL_TH[aspect]}
            value={scores[aspect]}
            onChange={(value) => setScores((current) => ({ ...current, [aspect]: value }))}
            error={missing && scores[aspect] === 0 ? 'กรุณาให้คะแนนด้านนี้' : undefined}
          />
        ))}
        <div>
          <label htmlFor="review-comment" className="mb-1.5 block text-sm font-medium text-ink">ความคิดเห็นถึงผู้ดูแล (ถ้ามี)</label>
          <textarea
            id="review-comment"
            rows={3}
            maxLength={REVIEW_COMMENT_MAX}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="เช่น ไมค์มีเสียงจี่ แอร์ไม่เย็น"
            aria-describedby="review-comment-help"
            className="w-full rounded-control border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:text-sm"
          />
          <p id="review-comment-help" className="mt-1 flex justify-between gap-3 text-xs text-ink-subtle">
            <span>ผู้ดูแลระบบเท่านั้นที่เห็นความคิดเห็น คนอื่นเห็นแค่คะแนนเฉลี่ย</span>
            <span className="shrink-0 tabular-nums">{comment.length}/{REVIEW_COMMENT_MAX}</span>
          </p>
        </div>
      </div>
    </Dialog>
  );
}
