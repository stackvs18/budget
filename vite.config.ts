import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dataApi } from './server/data-api.ts';

const root = fileURLToPath(new URL('.', import.meta.url));

// Local only: 127.0.0.1 keeps the app (and your numbers) off the network.
const host = { host: '127.0.0.1', port: 5050, strictPort: true };

export default defineConfig({
  plugins: [react(), tailwindcss(), dataApi(root)],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    ...host,
    watch: { ignored: ['**/data*.json', '**/legacy-v1/**'] },
  },
  preview: host,
});
