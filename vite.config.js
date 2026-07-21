import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Publicando em github.com/SEU-USUARIO/luary-shop via GitHub Pages,
// o site fica em https://SEU-USUARIO.github.io/luary-shop/
// então o base PRECISA bater com o nome do repositório:
const base = '/luary-shop/';

// Inclui todas as páginas .html da raiz do projeto no build (multi-página).
// Se algum desses arquivos não existir no seu repositório, ele é ignorado
// automaticamente — não precisa editar esta lista na mão.
const candidatas = ['index.html', 'admin.html', 'painel.html', 'carrinho.html', 'editor.html'];
const input = {};
for (const nome of candidatas) {
  const caminho = resolve(__dirname, nome);
  if (existsSync(caminho)) {
    input[nome.replace('.html', '')] = caminho;
  }
}

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    rollupOptions: { input }
  }
});
