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

  // relative: ข้อความ sr-only เป็น position:absolute ถ้าไม่มีกรอบอ้างอิงใกล้ ๆ
  // มันจะหลุดออกนอกกล่องเลื่อนของกราฟ แล้วดันให้ทั้งหน้าเลื่อนซ้ายขวาได้บนมือถือ
  return (
    <span className="relative">
      <span aria-hidden="true">{Math.round(shown).toLocaleString('th-TH')}</span>
      <span className="sr-only-focusable">{value.toLocaleString('th-TH')}</span>
    </span>
  );
}
