import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/States';

export function NotFoundPage() {
  return (
    <EmptyState
      title="ไม่พบหน้าที่คุณเรียก"
      description="หน้านี้อาจถูกย้าย หรือยังไม่ได้เปิดใช้งานในรุ่นนี้"
      action={
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-control bg-brand px-4 text-[15px] font-medium text-ink-inverse transition-colors hover:bg-brand-hover"
        >
          กลับไปหน้าภาพรวม
        </Link>
      }
    />
  );
}
