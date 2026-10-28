import type { MouseEvent } from 'react';
import type { BusySlot } from '@shared/domain/availability';
import { businessWindow } from '@shared/domain/booking-rules';
import type { SystemSettings } from '@shared/schemas/settings';
import { cn } from '../../lib/cn';

/**
 * แถบเวลาทั้งวันของห้องที่เลือก: ช่วงที่ว่าง ช่วงที่มีคนจอง และช่วงที่กำลังจะจอง
 * ดูแวบเดียวรู้ว่าวันนี้ห้องว่างตรงไหน — กดบนแถบเพื่อเริ่มที่เวลานั้นได้ (ทางลัดสำหรับเมาส์/นิ้ว)
 * ข้อมูลเดียวกันมีเป็นข้อความใน RoomAvailability และช่องเลือกเวลาอยู่แล้ว จึงซ่อนจากโปรแกรมอ่านหน้าจอ
 */
export function DayTimeline({
  busy,
  startMin,
  endMin,
  settings,
  conflict,
  onPickStart,
}: {
  busy: BusySlot[];
  startMin: number;
  endMin: number;
  settings: SystemSettings;
  conflict: boolean;
  onPickStart: (minute: number) => void;
}) {
  const { startMin: open, endMin: close } = businessWindow(settings);
  const span = close - open;
  const position = (from: number, to: number) => {
    const clamp = (minute: number) => Math.min(Math.max(minute, open), close);
    return { left: `${((clamp(from) - open) / span) * 100}%`, width: `${((clamp(to) - clamp(from)) / span) * 100}%` };
  };
  const step = span > 8 * 60 ? 120 : 60;
  const ticks: number[] = [];
  for (let minute = Math.ceil(open / 60) * 60; minute <= close; minute += step) ticks.push(minute);

  const pick = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const minute = open + ((event.clientX - box.left) / box.width) * span;
    onPickStart(open + Math.floor((minute - open) / settings.slotMinutes) * settings.slotMinutes);
  };

  return (
    <div aria-hidden="true" className="select-none">
      <div
        onClick={pick}
        title="กดเพื่อเริ่มที่เวลานี้"
        className="relative h-11 cursor-pointer overflow-hidden rounded-xl bg-ok-soft ring-1 ring-inset ring-ok-border"
      >
        {busy.map((slot) => (
          <span
            key={slot.startMin}
            className={cn('absolute inset-y-0', slot.status === 'pending' ? 'slot-pending' : 'slot-busy')}
            style={position(slot.startMin, slot.endMin)}
          />
        ))}
        <span
          className={cn(
            'absolute inset-y-1 rounded-lg ring-2 ring-inset',
            conflict ? 'bg-danger/20 ring-danger' : 'bg-brand/20 ring-brand',
          )}
          style={position(startMin, endMin)}
        />
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] tabular-nums text-ink-subtle">
        {ticks.map((minute, index) => (
          <span
            key={minute}
            className="absolute top-0"
            style={{
              left: `${((minute - open) / span) * 100}%`,
              transform: index === 0 ? 'none' : minute === close ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {String(minute / 60).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-ok-soft ring-1 ring-inset ring-ok-border" />ว่าง</li>
        <li className="flex items-center gap-1.5"><span className="slot-busy size-3 rounded-sm" />มีคนจองแล้ว</li>
        <li className="flex items-center gap-1.5"><span className="slot-pending size-3 rounded-sm" />รออนุมัติ</li>
        <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-brand/20 ring-2 ring-inset ring-brand" />เวลาที่เลือก</li>
      </ul>
    </div>
  );
}
