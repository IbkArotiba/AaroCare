import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  define: {
    __DEV__: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://aarocare.onrender.com' || 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log(' PROXY ERROR:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(' PROXY REQUEST:', req.method, req.url, '-> http://localhost:5001' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(' PROXY RESPONSE:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          forms: ['react-hook-form', '@hookform/resolvers', 'yup'],
          ui: ['@headlessui/react', '@heroicons/react'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx', 'axios'],
        },
      },
    },
  },
  preview: {
    port: 4173,
  },
})