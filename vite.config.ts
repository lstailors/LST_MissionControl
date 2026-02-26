import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json';
import { HttpsProxyAgent } from 'https-proxy-agent';

const egressProxy = process.env.HTTPS_PROXY || process.env.https_proxy;

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/supabase-proxy': {
        target: 'https://eusjiygcqzsmqonhuxlq.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
        secure: true,
        ...(egressProxy ? { agent: new HttpsProxyAgent(egressProxy) } : {}),
      },
    },
  },
});
