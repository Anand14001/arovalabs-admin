import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 5174 so the website (5173) and the admin can run side by side.
  server: { port: 5174, open: false },
  /*
   * base stays '/' with relative asset paths, so one build works on Vercel and
   * on Apache/LiteSpeed under a cPanel document root without rebuilding.
   */
  build: { outDir: 'dist', sourcemap: false },
});
