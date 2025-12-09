import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Ensures process.env.API_KEY still works in the code if you set it in Vercel Environment Variables
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  },
  preview: {
    host: true,
    port: 5000,
  }
});