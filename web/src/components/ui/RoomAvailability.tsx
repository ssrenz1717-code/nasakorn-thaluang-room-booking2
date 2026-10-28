import { CalendarCheck2, CalendarX2 } from 'lucide-react';
import { suggestAlternatives } from '@shared/domain/overlap';
import { conflictingSlots, type BusySlot } from '@shared/domain/availability';
import { businessWindow } from '@shared/domain/booking-rules';
import type { SystemSettings } from '@shared/schemas/settings';
import { formatTimeOfDay } from '@shared/time/bangkok';
import { Spinner } from './Spinner';

const range = (startMin: number, endMin: number) => `${formatTimeOfDay(startMin)}–${formatTimeOfDay(endMin)} น.`;

/**
 * บอกในฟอร์มเลยว่าห้องนี้ว่างไหม ก่อนผู้ใช้กดส่ง
 *  - ชน: บอกช่วงที่ไม่ว่าง และเสนอเวลาว่างที่ใกล้ที่สุดให้กดเลือกได้ทันที
 *  - ไม่ชนแต่มีคนจองบางช่วง: แสดงช่วงที่ถูกจองไว้ ให้วางแผนได้
 *  - ว่างทั้งวัน: บอกให้มั่นใจ
 * ข้อความอยู่ใน aria-live ให้โปรแกรมอ่านหน้าจอประกาศเมื่อเปลี่ยน
 */
export function RoomAvailability({
  busy,
  loading,
  startMin,
  endMin,
  settings,
  onPick,
}: {
  busy: BusySlot[];
  loading: boolean;
  startMin: number;
  endMin: number;
  settings: SystemSettings;
  onPick: (startMin: number, endMin: number) => void;
}) {
  const conflicts = conflictingSlots({ startMin, endMin }, busy);
  const suggestions =
    conflicts.length > 0
      ? suggestAlternatives({ startMin, endMin }, busy, businessWindow(settings), { stepMin: settings.slotMinutes, limit: 3 })
      : [];

  return (
    <div aria-live="polite" className="text-sm">
      {loading ? (
        <p className="flex items-center gap-2 text-ink-muted">
          <Spinner size="sm" /> กำลังตรวจว่าห้องว่างไหม
        </p>
      ) : conflicts.length > 0 ? (
        <div role="alert" className="rounded-card bg-danger-soft p-3 text-danger ring-1 ring-inset ring-danger-border">
          <p className="flex items-start gap-2 font-semibold">
            <CalendarX2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ห้องนี้ไม่ว่างเวลา {conflicts.map((slot) => range(slot.startMin, slot.endMin)).join(' และ ')}
          </p>
          {suggestions.length > 0 ? (
            <>
              <p className="mt-2 text-ink-muted">เวลาว่างที่ใกล้ที่สุด กดเพื่อใช้เวลานี้</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((slot) => (
                  <button
                    key={slot.startMin}
                    type="button"
                    onClick={() => onPick(slot.startMin, slot.endMin)}
                    className="min-h-10 rounded-pill bg-surface px-3 font-medium text-brand ring-1 ring-brand-border transition-colors duration-150 hover:bg-brand-soft"
                  >
                    {range(slot.startMin, slot.endMin)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-ink-muted">วันนี้ไม่มีช่วงว่างยาวพอ ลองเลือกวันอื่นหรือห้องอื่น</p>
          )}
        </div>
      ) : busy.length > 0 ? (
        <div className="rounded-card bg-surface-sunken p-3">
          <p className="text-ink-muted">ช่วงที่มีคนจองห้องนี้แล้วในวันนี้</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {busy.map((slot) => (
              <li
                key={slot.startMin}
                className="rounded-pill bg-surface px-3 py-1 font-medium text-ink ring-1 ring-line"
              >
                {range(slot.startMin, slot.endMin)}
                {slot.status === 'pending' && <span className="text-warn"> (รออนุมัติ)</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 font-medium text-ok">
          <CalendarCheck2 className="size-4" aria-hidden="true" /> ห้องนี้ว่างทั้งวัน
        </p>
      )}
    </div>
  );
}
