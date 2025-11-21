import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // تحميل متغيرات البيئة من المجلد الحالي
  // Fix: Cast process to any to avoid TS error regarding missing 'cwd' on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // تعريف API_KEY ليتم استبداله أثناء البناء بالقيمة الموجودة في Vercel Environment Variables
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});