import { useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Star } from 'lucide-react';
import { REVIEW_ASPECTS, REVIEW_ASPECT_LABEL_TH, summarizeRoomRatings, type Review } from '@shared/schemas/review';
import { useApp } from '../../app/providers/AppProvider';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { LoadingState } from '../../components/ui/States';
import type { DemoRoom } from '../../lib/api/demo';
import { useLiveRefresh } from '../../lib/hooks/useLiveRefresh';
import { cn } from '../../lib/cn';
import { StarScore } from './StarRating';

const dateText = (key: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(`${key}T12:00:00+07:00`));
const selectClass = 'min-h-11 rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

/** หน้ารวมรีวิว (ผู้ดูแล) — ห้องคะแนนต่ำสุดขึ้นก่อน เพราะเป็นห้องที่ต้องรีบดูแล */
export function ReviewsPage() {
  const { api, token } = useApp();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [error, setError] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [commentsOnly, setCommentsOnly] = useState(false);

  const load = () => Promise.all([api.reviews(token), api.rooms(token)])
    .then(([r, rm]) => { setReviews(r.reviews); setRooms(rm.rooms); setError(''); })
    .catch((e: Error) => setError(e.message));
  useEffect(() => { void load(); }, [api, token]);
  useLiveRefresh(load);

  const roomName = (roomId: string) => rooms.find((room) => room.roomId === roomId)?.name ?? 'ห้องที่ถูกลบไปแล้ว';
  const summary = useMemo(() => summarizeRoomRatings(reviews ?? []).sort((a, b) => a.overall - b.overall || b.count - a.count), [reviews]);
  const visible = useMemo(() => (reviews ?? [])
    .filter((review) => (!roomFilter || review.roomId === roomFilter) && (!commentsOnly || review.comment.trim() !== ''))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.createdAt.localeCompare(a.createdAt)), [reviews, roomFilter, commentsOnly]);

  return <>
    <PageHeader title="รีวิวห้องประชุม" description="คะแนนและความคิดเห็นจากผู้ใช้ห้องหลังประชุมเสร็จ — ความคิดเห็นเห็นเฉพาะผู้ดูแล" />
    {error && <Alert tone="danger" title="โหลดรีวิวไม่สำเร็จ">{error}</Alert>}
    {reviews === null && !error && <LoadingState message="กำลังโหลดรีวิว" />}

    {reviews !== null && reviews.length === 0 && (
      <Card><CardBody className="py-14 text-center">
        <Star className="mx-auto size-8 text-ink-subtle" aria-hidden="true" />
        <p className="mt-3 font-medium text-ink">ยังไม่มีรีวิว</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">หลังประชุมเสร็จ ผู้จองจะเห็นปุ่ม "ให้คะแนนห้อง" ในหน้ารายการจองของฉัน คะแนนจะมาขึ้นที่นี่</p>
      </CardBody></Card>
    )}

    {summary.length > 0 && (
      <section aria-labelledby="summary-title" className="mb-6">
        <h2 id="summary-title" className="mb-3 text-base font-semibold text-ink">คะแนนเฉลี่ยรายห้อง <span className="text-sm font-normal text-ink-muted">(คะแนนต่ำสุดอยู่บน)</span></h2>
        <div className="grid gap-3 md:grid-cols-2">
          {summary.map((item) => (
            <Card key={item.roomId}><CardBody className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-ink">{roomName(item.roomId)}</h3>
                  <p className="text-xs text-ink-subtle">{item.count} รีวิว</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StarScore value={item.overall} />
                  <span className={cn('text-lg font-semibold tabular-nums', item.overall < 3 ? 'text-danger' : 'text-ink')}>{item.overall.toFixed(1)}</span>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                {REVIEW_ASPECTS.filter((aspect) => aspect !== 'overall').map((aspect) => (
                  <div key={aspect} className="min-w-0">
                    <dt className="truncate text-xs text-ink-muted">{REVIEW_ASPECT_LABEL_TH[aspect].replace('ความสะดวกในการใช้งาน', 'ใช้งานง่าย')}</dt>
                    <dd className={cn('text-sm font-semibold tabular-nums', item[aspect] < 3 ? 'text-danger' : 'text-ink')}>{item[aspect].toFixed(1)}</dd>
                  </div>
                ))}
              </dl>
              <button type="button" onClick={() => setRoomFilter(item.roomId)} className="mt-3 min-h-9 text-sm font-medium text-brand hover:underline">ดูรีวิวของห้องนี้</button>
            </CardBody></Card>
          ))}
        </div>
      </section>
    )}

    {reviews !== null && reviews.length > 0 && (
      <section aria-labelledby="list-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="list-title" className="text-base font-semibold text-ink">รีวิวทั้งหมด <span className="text-sm font-normal text-ink-muted">({visible.length} รายการ)</span></h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="review-room">กรองตามห้อง</label>
            <select id="review-room" className={selectClass} value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
              <option value="">ทุกห้อง</option>
              {[...new Set(reviews.map((review) => review.roomId))].map((roomId) => <option key={roomId} value={roomId}>{roomName(roomId)}</option>)}
            </select>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={commentsOnly} onChange={(event) => setCommentsOnly(event.target.checked)} />
              เฉพาะที่มีความคิดเห็น
            </label>
          </div>
        </div>
        <div className="space-y-3">
          {visible.map((review) => (
            <Card key={review.bookingId}><CardBody className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink">{roomName(review.roomId)}</h3>
                  <p className="text-sm text-ink-muted">{review.bookingTitle || 'ไม่ระบุหัวข้อ'} · {dateText(review.dateKey)}</p>
                  <p className="text-xs text-ink-subtle">{review.userName}{review.department ? ` · ${review.department}` : ''}</p>
                </div>
                <div className="flex items-center gap-2"><StarScore value={review.overall} /><span className="font-semibold tabular-nums">{review.overall}</span></div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="คะแนนรายด้าน">
                {REVIEW_ASPECTS.filter((aspect) => aspect !== 'overall').map((aspect) => (
                  <li key={aspect} className={cn('rounded-md px-2 py-1 text-xs', review[aspect] < 3 ? 'bg-danger-soft text-danger' : 'bg-surface-sunken text-ink-muted')}>
                    {REVIEW_ASPECT_LABEL_TH[aspect]} {review[aspect]}/5
                  </li>
                ))}
              </ul>
              {review.comment.trim()
                ? <p className="mt-3 flex gap-2 rounded-inner bg-brand-soft/60 p-3 text-sm text-ink"><MessageSquareText className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" /><span className="whitespace-pre-line break-words">{review.comment}</span></p>
                : <p className="mt-3 text-xs text-ink-subtle">ไม่มีความคิดเห็น</p>}
            </CardBody></Card>
          ))}
          {visible.length === 0 && <p className="py-8 text-center text-sm text-ink-muted">ไม่มีรีวิวตามตัวกรองนี้</p>}
        </div>
      </section>
    )}
  </>;
}
