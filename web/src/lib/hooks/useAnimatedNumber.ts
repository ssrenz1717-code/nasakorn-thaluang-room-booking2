import { useEffect, useRef, useState } from 'react';

/**
 * ค่อย ๆ เปลี่ยนตัวเลขจากค่าเดิมไปหาค่าเป้าหมาย ใช้ทำตัวเลขนับขึ้นและกราฟที่โตขึ้นตอนเปิดหน้า
 *
 * - เริ่มที่ 0 เสมอ ข้อมูลโหลดเสร็จเมื่อไหร่ก็เลื่อนจาก 0 ขึ้นไปหาค่าจริง
 * - ถ้าค่าเปลี่ยนอีก (เช่น มีการจองใหม่) จะเลื่อนต่อจากค่าที่แสดงอยู่ ไม่กระโดดกลับไปเริ่ม 0
 * - ผู้ใช้ที่ตั้งเครื่องให้ลดการเคลื่อนไหว จะเห็นค่าสุดท้ายทันที
 *
 * คืนค่าเป็นทศนิยม ผู้เรียกปัดเศษเองตอนแสดงผล
 */
export function useAnimatedNumber(
  target: number,
  options: { duration?: number; delay?: number } = {},
): number {
  const duration = options.duration ?? 900;
  const delay = options.delay ?? 0;
  const reduced = prefersReducedMotion();

  const [value, setValue] = useState(reduced ? target : 0);
  const valueRef = useRef(value);

  useEffect(() => {
    if (reduced || duration <= 0) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) return;

    let frame = 0;
    let startedAt: number | null = null;

    const tick = (now: number) => {
      if (startedAt === null) startedAt = now + delay;
      const elapsed = Math.max(0, now - startedAt);
      const progress = Math.min(1, elapsed / duration);
      // ease-out: เร็วตอนต้น ค่อย ๆ ช้าลงตอนเข้าใกล้ค่าจริง ดูเป็นธรรมชาติกว่าเส้นตรง
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;
      valueRef.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay, reduced]);

  return value;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
