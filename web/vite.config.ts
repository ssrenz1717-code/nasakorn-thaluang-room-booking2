import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  /*
   * base แบบ relative ทำให้ไฟล์ที่ build แล้วทำงานได้ทุก path
   * ไม่ว่าจะวางที่ https://user.github.io/ชื่อ-repo/ หรือ root ของโดเมนตัวเอง
   * คู่กับ HashRouter จึงไม่ต้องตั้งค่า base ใหม่ทุกครั้งที่เปลี่ยนที่ฝาก
   */
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': sharedDir },
  },
  server: {
    port: 5173,
    // ต้องอนุญาตให้อ่านโฟลเดอร์แม่ เพราะ domain logic อยู่นอกโฟลเดอร์ web
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    css: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // ขึ้นเตือนถ้า bundle บวม จะได้รู้ตัวก่อนผู้ใช้โหลดช้า
    chunkSizeWarningLimit: 400,
  },
});
