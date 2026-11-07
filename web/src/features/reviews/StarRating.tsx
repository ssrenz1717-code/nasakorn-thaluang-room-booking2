import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';

export const SCORE_LABEL_TH = ['', 'ควรปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก', 'ดีเยี่ยม'] as const;

/** ดาวแสดงคะแนน (อ่านอย่างเดียว) — ดาวที่เป็นเศษเติมสีบางส่วนตามค่าจริง */
export function StarScore({ value, size = 'sm', className }: { value: number; size?: 'sm' | 'md'; className?: string }) {
  const icon = size === 'md' ? 'size-5' : 'size-4';
  return (
    <span className={cn('inline-flex items-center', className)} role="img" aria-label={`${value.toFixed(1)} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fill = Math.max(0, Math.min(1, value - (index - 1)));
        return (
          <span key={index} className={cn('relative', icon)} aria-hidden="true">
            <Star className={cn('absolute inset-0 text-line-strong', icon)} />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn('fill-gold text-gold', icon)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * ช่องให้ดาว 1–5 — ใช้ radio จริงซ่อนไว้ จึงกดลูกศรซ้าย/ขวาเลือกด้วยคีย์บอร์ดได้
 * และโปรแกรมอ่านหน้าจออ่านเป็น "ดีมาก 4 จาก 5" ไม่ใช่ปุ่มดาวเปล่า ๆ
 */
export function StarInput({ name, legend, value, onChange, error }: {
  name: string; legend: string; value: number; onChange: (value: number) => void; error?: string | undefined;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex rounded-control has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40">
          {[1, 2, 3, 4, 5].map((score) => (
            <label key={score} className="grid size-11 cursor-pointer place-items-center rounded-control transition-transform duration-100 active:scale-90">
              <input
                type="radio"
                name={name}
                value={score}
                checked={value === score}
                onChange={() => onChange(score)}
                className="sr-only"
                aria-label={`${SCORE_LABEL_TH[score]} ${score} จาก 5`}
              />
              <Star
                aria-hidden="true"
                className={cn('size-7 transition-colors duration-100', score <= value ? 'fill-gold text-gold' : 'text-line-strong hover:text-gold')}
              />
            </label>
          ))}
        </div>
        <span className={cn('text-sm', value ? 'font-medium text-ink' : 'text-ink-subtle')} aria-hidden="true">
          {value ? SCORE_LABEL_TH[value] : 'แตะดาวเพื่อให้คะแนน'}
        </span>
      </div>
      {error && <p className="mt-1 text-sm text-danger" role="alert">{error}</p>}
    </fieldset>
  );
}
