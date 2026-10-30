import { Download, Search, X } from 'lucide-react';
import type { DemoRoom } from '../../lib/api/demo';
import { cn } from '../../lib/cn';
import { roomColorOf } from './roomBands';

/**
 * แถบกรองปฏิทิน: เลือกดูเฉพาะบางห้อง (ชิปสีเดียวกับในตาราง) ค้นหาตามแผนก/ชื่อผู้จอง
 * และดาวน์โหลดรายการที่กรองแล้วเป็นไฟล์ Excel (CSV)
 */
export function CalendarFilters({
  rooms, selectedRooms, query, resultCount, approvedCount, onRooms, onQuery, onExport,
}: {
  /** จำนวนที่อนุมัติครบแล้ว (ที่แสดงบนปฏิทิน) */
  approvedCount: number;
  rooms: DemoRoom[];
  /** ว่าง = ทุกห้อง */
  selectedRooms: string[];
  query: string;
  resultCount: number;
  onRooms: (value: string[]) => void;
  onQuery: (value: string) => void;
  onExport: () => void;
}) {
  const roomIds = rooms.map((room) => room.roomId);
  const toggle = (roomId: string) =>
    onRooms(selectedRooms.includes(roomId) ? selectedRooms.filter((id) => id !== roomId) : [...selectedRooms, roomId]);
  const chip = 'flex min-h-9 shrink-0 items-center gap-2 rounded-pill px-3 text-sm ring-1 ring-inset transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand';

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <label htmlFor="calendar-search" className="sr-only">ค้นหาตามแผนกวิชาหรือชื่อผู้จอง</label>
          <input
            id="calendar-search"
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="ค้นหาแผนกวิชา หรือชื่อผู้จอง"
            className="min-h-11 w-full rounded-control border border-line bg-surface pl-9 pr-9 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {query && (
            <button type="button" onClick={() => onQuery('')} aria-label="ล้างคำค้นหา" className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-control text-ink-subtle hover:text-ink">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={resultCount === 0}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-surface px-4 text-[15px] font-medium text-ink ring-1 ring-line transition-colors hover:bg-surface-sunken hover:ring-line-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4 text-ok" aria-hidden="true" />
          ดาวน์โหลด Excel
          <span className="text-sm font-normal text-ink-muted">({resultCount} รายการ)</span>
        </button>
      </div>

      <p className="text-sm text-ink-muted">บนปฏิทิน {approvedCount} รายการที่อนุมัติแล้ว ไฟล์ Excel มีทุกสถานะ (รวมที่รออนุมัติ) {resultCount} รายการ</p>
      <div role="group" aria-label="กรองตามห้องประชุม" className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          aria-pressed={selectedRooms.length === 0}
          onClick={() => onRooms([])}
          className={cn(chip, selectedRooms.length === 0 ? 'bg-ink font-medium text-ink-inverse ring-ink' : 'bg-surface text-ink-muted ring-line hover:text-ink')}
        >
          ทุกห้อง
        </button>
        {rooms.map((room) => {
          const color = roomColorOf(roomIds, room.roomId);
          const on = selectedRooms.includes(room.roomId);
          return (
            <button
              key={room.roomId}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(room.roomId)}
              className={cn(chip, on ? `${color.chip} font-medium` : 'bg-surface text-ink-muted ring-line hover:text-ink')}
            >
              <span aria-hidden="true" className={cn('size-2.5 rounded-full', color.dot)} />
              {room.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** ตรงกับคำค้นไหม: ค้นในแผนกวิชา ชื่อผู้จอง และชื่อบัญชี (ไม่สนตัวพิมพ์/ช่องว่างหัวท้าย) */
export function matchesBookingQuery(booking: { department?: string; bookerName?: string; userName?: string }, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return [booking.department, booking.bookerName, booking.userName].some((value) => (value ?? '').toLowerCase().includes(needle));
}
