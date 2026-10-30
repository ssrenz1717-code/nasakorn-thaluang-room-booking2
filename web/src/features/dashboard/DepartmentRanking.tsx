import { GraduationCap } from 'lucide-react';
import type { DemoBooking } from '../../lib/api/demo';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { CountUp } from '../../components/ui/CountUp';

const COUNTED = ['pending', 'confirmed', 'completed'];

/** จัดอันดับแผนกวิชาที่ขอใช้ห้องมากที่สุด (นับคำขอที่ไม่ถูกยกเลิก/ไม่ถูกปฏิเสธ) */
export function rankDepartments(bookings: DemoBooking[]): { department: string; count: number; attendees: number }[] {
  const byDepartment = new Map<string, { count: number; attendees: number }>();
  for (const booking of bookings) {
    if (!COUNTED.includes(booking.status)) continue;
    const name = booking.department?.trim() || 'ไม่ระบุแผนก';
    const current = byDepartment.get(name) ?? { count: 0, attendees: 0 };
    byDepartment.set(name, { count: current.count + 1, attendees: current.attendees + (Number(booking.attendees) || 0) });
  }
  return [...byDepartment.entries()]
    .map(([department, value]) => ({ department, ...value }))
    .sort((a, b) => b.count - a.count || b.attendees - a.attendees || a.department.localeCompare(b.department, 'th'));
}

export function DepartmentRanking({ bookings }: { bookings: DemoBooking[] }) {
  const ranking = rankDepartments(bookings).slice(0, 8);
  const top = ranking[0]?.count ?? 1;
  return (
    <Card className="xl:col-span-2">
      <CardHeader title="แผนกวิชาที่ขอใช้บริการมากที่สุด" description="จัดอันดับจากจำนวนคำขอ (ไม่นับที่ยกเลิกหรือไม่อนุมัติ)" />
      <CardBody>
        {ranking.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">ยังไม่มีข้อมูลการขอใช้ห้อง</p>
        ) : (
          <ol className="group/rank grid gap-x-8 gap-y-3 md:grid-cols-2">
            {ranking.map((item, index) => (
              <li key={item.department} className="flex items-center gap-3 transition-opacity duration-200 group-hover/rank:opacity-55 hover:opacity-100!">
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${index === 0 ? 'bg-brand-gradient text-ink-inverse' : 'bg-brand-soft text-brand'}`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink">
                      {index === 0 && <GraduationCap className="size-4 shrink-0 text-brand" aria-hidden="true" />}
                      <span className="truncate">{item.department}</span>
                    </span>
                    <span className="shrink-0 text-ink-muted">
                      <strong data-numeric className="text-ink"><CountUp value={item.count} duration={900} /></strong> ครั้ง
                      <span className="hidden sm:inline"> ({item.attendees} คน)</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-line">
                    <div
                      className="grow-x h-full origin-left rounded-full bg-brand-gradient"
                      style={{ transform: `scaleX(${item.count / top})`, animationDelay: `${index * 60}ms` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
