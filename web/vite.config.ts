import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相对路径，保证构建产物可被 file:// 离线双击打开（AC-10 / §8.3.2）
  base: './',
  plugins: [react()],
});
