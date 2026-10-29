import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { serverlessDevPlugin } from './vite-plugin-serverless';

export default defineConfig({
  plugins: [react(), tailwindcss(), serverlessDevPlugin()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
