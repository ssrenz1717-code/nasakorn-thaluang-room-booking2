import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { LoadingState } from '../components/ui/States';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { NotFoundPage } from '../features/NotFoundPage';
import { LoginPage } from '../features/auth/LoginPage';
import { BookingPage, BookingsPage, RoomsPage } from '../features/BookingPages';
import { ApprovalsPage, PrintFormPage } from '../features/ApprovalReportPages';
import { useApp } from './providers/AppProvider';

export function App() {
  const { phase } = useApp();

  if (phase === 'booting') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingState message="กำลังเตรียมระบบ" />
      </div>
    );
  }

  if (phase === 'anonymous') return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/calendar" element={<BookingsPage calendar />} />
        <Route path="/my-bookings" element={<BookingsPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/reports" element={<PrintFormPage />} />
        {/*
          เส้นทางของโมดูลที่ยังไม่เสร็จ ชี้กลับหน้าภาพรวม
          เพื่อไม่ให้ใครเจอหน้าขาวจากการพิมพ์ URL หรือกดลิงก์เก่า
        */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
