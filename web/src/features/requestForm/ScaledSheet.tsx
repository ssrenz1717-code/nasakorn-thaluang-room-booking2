import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** A4 กว้าง 210mm = 793.7px ที่ 96dpi */
const SHEET_PX = 793.7;

/**
 * ย่อแผ่น A4 ให้พอดีความกว้างที่มี (เช่นบนมือถือ) โดยไม่เปลี่ยนขนาดจริงของแบบฟอร์ม
 * ตอนพิมพ์ CSS ล้างการย่อทิ้ง (.print-scale) กระดาษจึงได้ขนาดเต็มเสมอ
 */
export function ScaledSheet({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const fit = () => {
      const next = Math.min(1, outer.clientWidth / SHEET_PX);
      setScale(next);
      setHeight(inner.offsetHeight * next);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden print:overflow-visible" style={{ height }}>
      <div ref={innerRef} className="print-scale mx-auto w-[210mm] origin-top-left" style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}>
        {children}
      </div>
    </div>
  );
}
