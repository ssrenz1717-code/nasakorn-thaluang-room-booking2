import { useEffect, useState } from 'react';

/** จุดแบ่งระหว่างมือถือ/แท็บเล็ตแนวตั้ง กับจอคอม — ตรงกับ lg: ของ Tailwind */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * ตรวจว่าตอนนี้หน้าจอตรงเงื่อนไขหรือไม่ และอัปเดตเมื่อหมุนจอหรือย่อหน้าต่าง
 *
 * ดูจากความกว้างจอ ไม่ใช่ชื่ออุปกรณ์: แท็บเล็ตแนวนอนหรือหน้าต่างคอมที่ย่อแคบ
 * จะได้หน้าตาที่เหมาะกับพื้นที่ที่มีจริง
 *
 * fallback ใช้เมื่อเบราว์เซอร์ไม่มี matchMedia (เช่น ตอนรันเทส)
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const read = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : fallback;

  const [matches, setMatches] = useState(read);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
