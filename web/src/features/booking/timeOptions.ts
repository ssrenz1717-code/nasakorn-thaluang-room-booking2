import { businessWindow } from '@shared/domain/booking-rules';
import { isEndBlocked, isStartBlocked, type BusySlot } from '@shared/domain/availability';
import type { SystemSettings } from '@shared/schemas/settings';

/** 570 -> "09:30" */
export const timeText = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** "09:30" -> 570 */
export const asMinute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** เวลาเริ่มที่เลือกได้: ทุกช่วงความละเอียด ตั้งแต่เปิดทำการ จนถึงเวลาที่ยังจองขั้นต่ำได้ทัน */
export function startTimeOptions(settings: SystemSettings): number[] {
  const { startMin, endMin } = businessWindow(settings);
  const options: number[] = [];
  for (let minute = startMin; minute + settings.minBookingMinutes <= endMin; minute += settings.slotMinutes) options.push(minute);
  return options;
}

/** เวลาสิ้นสุดที่เลือกได้: หลังเวลาเริ่มอย่างน้อยเท่าความยาวขั้นต่ำ ไม่เกินเวลาปิดและความยาวสูงสุด */
export function endTimeOptions(settings: SystemSettings, startMinute: number): number[] {
  const { endMin } = businessWindow(settings);
  const last = Math.min(endMin, startMinute + settings.maxBookingMinutes);
  const options: number[] = [];
  for (let minute = startMinute + settings.minBookingMinutes; minute <= last; minute += settings.slotMinutes) options.push(minute);
  return options;
}

/** เปลี่ยนเวลาเริ่มแล้วเวลาสิ้นสุดเดิมใช้ไม่ได้ -> เลื่อนให้เป็นอีกหนึ่งชั่วโมง (หรือใกล้ที่สุดที่เลือกได้) */
export function adjustEndTime(settings: SystemSettings, startMinute: number, currentEnd: number, busy: BusySlot[] = []): number {
  const options = endTimeOptions(settings, startMinute).filter((minute) => !isEndBlocked(startMinute, minute, busy));
  if (options.includes(currentEnd)) return currentEnd;
  return options.find((minute) => minute >= startMinute + 60) ?? options[options.length - 1] ?? startMinute + settings.slotMinutes;
}

/** เวลาเริ่มแรกที่ห้องว่างและยังไม่เลย notBefore — ใช้เปิดฟอร์มที่เวลาที่จองได้จริง ไม่ใช่เวลาที่ชนอยู่แล้ว */
export function firstFreeStart(settings: SystemSettings, busy: BusySlot[], notBefore = 0): number | undefined {
  return startTimeOptions(settings).find((minute) => minute >= notBefore && !isStartBlocked(minute, settings.minBookingMinutes, busy));
}
