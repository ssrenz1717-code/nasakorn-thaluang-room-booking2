/** สีประจำห้อง (สีหมวดหมู่ ไม่ใช่สถานะ) — เลี่ยงเหลือง/เขียว/แดงที่ใช้บอกสถานะการจอง */
export const ROOM_BANDS = [
  'from-sky-500 to-blue-700',
  'from-cyan-500 to-teal-700',
  'from-blue-700 to-blue-950',
  'from-teal-500 to-cyan-800',
  'from-sky-400 to-blue-600',
];

/**
 * สีประจำห้องในปฏิทิน (พื้นอ่อน + ตัวอักษรเข้ม contrast ผ่าน AA)
 * เลี่ยงเขียว (ช่วงที่กำลังเลือก) และเหลือง/แดง (สถานะ) — รออนุมัติแสดงด้วยเส้นประแทนสี
 */
export const ROOM_COLORS = [
  { dot: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-900', ring: 'ring-sky-300', chip: 'bg-sky-100 text-sky-900 ring-sky-400' },
  { dot: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-900', ring: 'ring-rose-300', chip: 'bg-rose-100 text-rose-900 ring-rose-400' },
  { dot: 'bg-indigo-500', soft: 'bg-indigo-50', text: 'text-indigo-900', ring: 'ring-indigo-300', chip: 'bg-indigo-100 text-indigo-900 ring-indigo-400' },
  { dot: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-900', ring: 'ring-orange-300', chip: 'bg-orange-100 text-orange-900 ring-orange-400' },
  { dot: 'bg-cyan-600', soft: 'bg-cyan-50', text: 'text-cyan-900', ring: 'ring-cyan-300', chip: 'bg-cyan-100 text-cyan-900 ring-cyan-400' },
  { dot: 'bg-stone-500', soft: 'bg-stone-100', text: 'text-stone-900', ring: 'ring-stone-300', chip: 'bg-stone-200 text-stone-900 ring-stone-400' },
] as const;

export type RoomColor = (typeof ROOM_COLORS)[number];

/** สีของแต่ละห้องตามลำดับห้องในระบบ — ห้องเดิมได้สีเดิมทุกหน้า */
export function roomColorOf(roomIds: string[], roomId: string): RoomColor {
  const index = roomIds.indexOf(roomId);
  return ROOM_COLORS[(index < 0 ? roomIds.length : index) % ROOM_COLORS.length]!;
}
