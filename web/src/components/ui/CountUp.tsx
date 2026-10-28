import { useAnimatedNumber } from '../../lib/hooks/useAnimatedNumber';

/**
 * ตัวเลขที่นับขึ้นจาก 0 ตอนเปิดหน้า
 *
 * ตัวเลขที่กำลังนับจะถูกซ่อนจากโปรแกรมอ่านหน้าจอ แล้วอ่านค่าจริงจาก sr-only แทน
 * ไม่งั้นโปรแกรมอ่านหน้าจออาจอ่านเลขระหว่างทางอย่าง "2" ทั้งที่ค่าจริงคือ "6"
 */
export function CountUp({
  value,
  duration,
  delay,
}: {
  value: number;
  duration?: number;
  delay?: number;
}) {
  const shown = useAnimatedNumber(value, {
    ...(duration !== undefined && { duration }),
    ...(delay !== undefined && { delay }),
  });

  return (
    <>
      <span aria-hidden="true">{Math.round(shown).toLocaleString('th-TH')}</span>
      <span className="sr-only-focusable">{value.toLocaleString('th-TH')}</span>
    </>
  );
}
