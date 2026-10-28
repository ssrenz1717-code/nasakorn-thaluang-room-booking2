import { formatTimeOfDay } from '@shared/time/bangkok';

/**
 * ช่องเลือกเวลาแบบรายการ แทน <input type="time">
 *
 * input type="time" แสดงผลไม่เหมือนกันในแต่ละเครื่อง และในเบราว์เซอร์ในแอป
 * (Instagram, LINE, Facebook บน iPhone/Android) บางครั้งเลือกเวลาไม่ได้เลย
 * อีกทั้ง step ทุก 15 นาทีไม่ถูกบังคับ ผู้ใช้เลือก 09:07 แล้วฟอร์มส่งไม่ผ่านแบบเงียบ ๆ
 * <select> เปิดเป็นวงล้อ/รายการบนมือถือทุกรุ่น และมีให้เลือกเฉพาะเวลาที่จองได้จริง
 */
export function TimeSelect({
  id,
  value,
  options,
  onChange,
  isDisabled,
  className,
}: {
  id: string;
  /** "HH:mm" */
  value: string;
  /** นาทีนับจากเที่ยงคืน */
  options: number[];
  onChange: (value: string) => void;
  /** เวลาที่เลือกไม่ได้เพราะห้องไม่ว่าง — ยังแสดงให้เห็น แต่กดไม่ได้ */
  isDisabled?: (minutes: number) => boolean;
  className?: string;
}) {
  return (
    <select id={id} required value={value} onChange={(event) => onChange(event.target.value)} className={className}>
      {options.map((minutes) => {
        const time = formatTimeOfDay(minutes);
        const disabled = isDisabled?.(minutes) ?? false;
        return (
          <option key={minutes} value={time} disabled={disabled}>
            {disabled ? `${time} น. (ไม่ว่าง)` : `${time} น.`}
          </option>
        );
      })}
    </select>
  );
}
