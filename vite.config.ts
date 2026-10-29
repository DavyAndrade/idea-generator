import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { serverlessDevPlugin } from './vite-plugin-serverless';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Disponibiliza as variáveis do .env no process.env para os handlers serverless em dev
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), serverlessDevPlugin()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  };
});
