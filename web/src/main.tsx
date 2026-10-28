import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import { AppProvider } from './app/providers/AppProvider';
import { ToastProvider } from './components/ui/Toast';
import './styles/index.css';

const container = document.getElementById('root');
if (container === null) throw new Error('ไม่พบ element #root ในหน้า');

createRoot(container).render(
  <StrictMode>
    {/*
      ใช้ HashRouter เพราะ GitHub Pages ไม่มี server มาเขียน rewrite ให้
      ถ้าใช้ BrowserRouter แล้วผู้ใช้กดรีเฟรชที่ /calendar จะได้ 404 จาก GitHub
      แลกกับ URL ที่มี # คั่น ซึ่งยอมรับได้สำหรับระบบใช้ภายในองค์กร
    */}
    <HashRouter>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </HashRouter>
  </StrictMode>,
);
