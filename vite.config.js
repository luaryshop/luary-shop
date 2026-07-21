import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Publicando em usuario.github.io/NOME-DO-REPO: troque para '/NOME-DO-REPO/'
  base: './'
});
