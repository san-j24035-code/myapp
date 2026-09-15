import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiOrigin = env.VITE_API_ORIGIN;
  return {
    plugins: [react()],
    base: './',
    build: { rollupOptions: { input: { main: 'index.html', regist: 'regist.html' } } },
    server: apiOrigin ? { proxy: { '/api': { target: apiOrigin, changeOrigin: true } } } : undefined,
  };
});
