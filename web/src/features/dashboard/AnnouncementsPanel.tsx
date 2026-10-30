import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Bell, Info, Megaphone, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
import {
  ANNOUNCEMENT_TONES, ANNOUNCEMENT_TONE_LABEL_TH, type Announcement, type AnnouncementInput, type AnnouncementTone,
} from '@shared/schemas/announcement';
import { toDateKey } from '@shared/time/bangkok';
import { useApp, useCurrentUser } from '../../app/providers/AppProvider';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/cn';

const TONE_STYLE: Record<AnnouncementTone, { icon: LucideIcon; box: string; icon_: string }> = {
  urgent: { icon: AlertTriangle, box: 'bg-danger-soft ring-danger-border', icon_: 'text-danger' },
  notice: { icon: Bell, box: 'bg-warn-soft ring-warn-border', icon_: 'text-warn' },
  info: { icon: Info, box: 'bg-brand-soft ring-brand-border', icon_: 'text-brand' },
};

const EMPTY_DRAFT: AnnouncementInput = { announcementId: '', title: '', body: '', tone: 'info', expiresOn: '' };
const thaiDate = (key: string) =>
  new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(`${key}T12:00:00+07:00`));

/**
 * ประกาศประชาสัมพันธ์จากงานศูนย์ดิจิทัลฯ บนหน้าภาพรวม
 * ผู้ใช้ทั่วไป: เห็นเฉพาะเมื่อมีประกาศ / ผู้ดูแล: เห็นเสมอ เพิ่ม แก้ ลบได้ในที่เดียว
 */
export function AnnouncementsPanel({ refreshKey }: { refreshKey: number }) {
  const { api, token } = useApp();
  const user = useCurrentUser();
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [draft, setDraft] = useState<AnnouncementInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState('');

  const load = useCallback(() => {
    api.announcements(token).then(({ announcements }) => setItems(announcements)).catch(() => setItems((current) => current ?? []));
  }, [api, token]);
  useEffect(load, [load, refreshKey]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (draft === null) return;
    setSaving(true);
    setError('');
    try {
      await api.saveAnnouncement(token, draft);
      toast.success(draft.announcementId ? 'แก้ไขประกาศแล้ว' : 'เพิ่มประกาศแล้ว');
      setDraft(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกประกาศไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (announcementId: string) => {
    try {
      await api.archiveAnnouncement(token, announcementId);
      toast.info('ลบประกาศแล้ว');
      setConfirmId('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ลบประกาศไม่สำเร็จ');
    }
  };

  if (items === null || (!isAdmin && items.length === 0)) return null;

  return (
    <section aria-labelledby="announcements-title" className="enter mb-4 rounded-card border border-line bg-surface p-4 shadow-card sm:mb-5 sm:p-5">
      <header className="mb-3 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-ink-inverse">
          <Megaphone className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="announcements-title" className="text-[15px] font-semibold text-ink">ประกาศจากงานศูนย์ดิจิทัลฯ</h2>
          <p className="text-sm text-ink-muted">สถานะห้องประชุมและข่าวสารการใช้ห้อง</p>
        </div>
        {isAdmin && draft === null && (
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => { setDraft(EMPTY_DRAFT); setError(''); }}>
            เพิ่มประกาศ
          </Button>
        )}
      </header>

      {draft !== null && (
        <form onSubmit={save} className="mb-3 space-y-3 rounded-control bg-surface-sunken p-3.5 ring-1 ring-inset ring-line">
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          <div>
            <label htmlFor="announcement-title" className="mb-1.5 block text-sm font-medium text-ink">หัวข้อประกาศ</label>
            <input id="announcement-title" autoFocus required maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="เช่น ห้องประชุมใหญ่ปิดปรับปรุง 5–7 พ.ย." className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label htmlFor="announcement-body" className="mb-1.5 block text-sm font-medium text-ink">รายละเอียด <span className="font-normal text-ink-subtle">(ถ้ามี)</span></label>
            <textarea id="announcement-body" maxLength={1000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="min-h-20 w-full rounded-control border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-medium text-ink">ประเภท</legend>
              <div className="flex flex-wrap gap-2">
                {ANNOUNCEMENT_TONES.map((tone) => (
                  <label key={tone} className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-pill px-3 text-sm ring-1 ring-inset transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand', draft.tone === tone ? `${TONE_STYLE[tone].box} font-medium text-ink` : 'bg-surface text-ink-muted ring-line')}>
                    <input type="radio" name="announcement-tone" className="sr-only" checked={draft.tone === tone} onChange={() => setDraft({ ...draft, tone })} />
                    {ANNOUNCEMENT_TONE_LABEL_TH[tone]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="announcement-expires" className="mb-1.5 block text-sm font-medium text-ink">แสดงถึงวันที่ <span className="font-normal text-ink-subtle">(ว่าง = ไม่หมดอายุ)</span></label>
              <input id="announcement-expires" type="date" min={toDateKey(new Date())} value={draft.expiresOn} onChange={(e) => setDraft({ ...draft, expiresOn: e.target.value })} className="min-h-10 rounded-control border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDraft(null)} disabled={saving}>ยกเลิก</Button>
            <Button type="submit" loading={saving} loadingLabel="กำลังบันทึก">{draft.announcementId ? 'บันทึกการแก้ไข' : 'เผยแพร่ประกาศ'}</Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        draft === null && <p className="rounded-control bg-surface-sunken px-3.5 py-4 text-center text-sm text-ink-muted">ยังไม่มีประกาศ กด "เพิ่มประกาศ" เพื่อแจ้งข่าวถึงทุกคน</p>
      ) : (
        <ul className="grid gap-2.5 lg:grid-cols-2">
          {items.map((item) => {
            const style = TONE_STYLE[item.tone];
            const Icon = style.icon;
            return (
              <li key={item.announcementId} className={cn('flex gap-3 rounded-control p-3.5 ring-1 ring-inset', style.box)}>
                <Icon className={cn('mt-0.5 size-5 shrink-0', style.icon_)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    <span className="sr-only">{ANNOUNCEMENT_TONE_LABEL_TH[item.tone]}: </span>
                    {item.title}
                  </p>
                  {item.body && <p className="mt-0.5 whitespace-pre-line text-sm text-ink-muted">{item.body}</p>}
                  {item.expiresOn && <p className="mt-1 text-xs text-ink-subtle">ประกาศถึง {thaiDate(item.expiresOn)}</p>}
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-start gap-1">
                    {confirmId === item.announcementId ? (
                      <>
                        <Button size="sm" variant="danger" onClick={() => void archive(item.announcementId)}>ยืนยันลบ</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId('')}>ไม่ลบ</Button>
                      </>
                    ) : (
                      <>
                        <button type="button" aria-label={`แก้ไขประกาศ ${item.title}`} onClick={() => { setDraft({ announcementId: item.announcementId, title: item.title, body: item.body, tone: item.tone, expiresOn: item.expiresOn }); setError(''); }} className="grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface hover:text-ink">
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`ลบประกาศ ${item.title}`} onClick={() => setConfirmId(item.announcementId)} className="grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface hover:text-danger">
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
