import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Site publicado em https://SEU-USUARIO.github.io/luary-shop/
  base: '/luary-shop/'
});
