# Luary Shop — ERP de Precificação para Semijoias

ERP comercial focado em precificação de semijoias: produtos, kits, insumos, banhos (custo do ouro/prata por grama), marketplaces (canais de venda com todas as taxas), fornecedores, estoque, financeiro/DRE e um gerador de conteúdo para anúncios.

## O que foi corrigido nesta versão

Este projeto veio de um único arquivo `.tsx` pensado para rodar num ambiente de preview (com a chave do Firebase exposta no código). Antes de publicar no GitHub, os seguintes pontos foram corrigidos:

- **Credenciais do Firebase removidas do código-fonte.** Agora vêm de variáveis de ambiente (`.env`, que fica fora do Git). Veja `.env.example`.
- **Regras de segurança do Firestore e Storage** (`firestore.rules`, `storage.rules`) para exigir autenticação antes de ler/escrever dados.
- **Exclusão de itens agora pede confirmação** (produtos, kits, insumos, banhos, canais, fornecedores, lançamentos financeiros) — antes apagava direto no clique.
- **Exportação real de Excel e PDF** no Dashboard — antes era só um alerta fingindo gerar o arquivo.
- **Validação de SKU duplicado** ao cadastrar produtos e kits.
- **Tela de carregamento e tela de erro de conexão** — antes, se o Firebase falhasse ao conectar, a tela ficava em branco sem explicação.
- **Projeto transformado em app Vite completo** (antes era um arquivo solto, sem `package.json`, sem build, sem como rodar localmente ou fazer deploy).

### Pontos que continuam simplificados (por escolha, não é bug)
- O **Gerador de SEO** é baseado em templates/regras, não chama nenhuma IA externa — é instantâneo e não depende de nenhuma chave de API extra. Se quiser IA de verdade, dá pra plugar a API da Anthropic ou OpenAI depois (isso exigiria uma função de backend para não expor a chave no navegador).
- O **Financeiro/DRE** soma o que for lançado manualmente; não puxa vendas automaticamente dos marketplaces.
- A autenticação é **anônima** (qualquer pessoa que abrir o link vira "usuário" com acesso total aos dados). Isso é aceitável para uso pessoal/interno, mas veja a seção de segurança abaixo se for usar com equipe ou dados sensíveis.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- Uma conta no [Firebase](https://console.firebase.google.com/) (gratuita)

## 1. Configurar o Firebase

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com/).
2. Em **Build > Authentication > Sign-in method**, ative o provedor **Anônimo**.
3. Em **Build > Firestore Database**, crie o banco (modo produção).
4. Em **Build > Storage**, ative o Storage (para as fotos dos produtos).
5. Em **Configurações do projeto > Seus apps**, crie um app da Web e copie as credenciais (`apiKey`, `authDomain` etc.).
6. Publique as regras de segurança inclusas neste repositório:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore storage   # aponte para o projeto que você criou
   firebase deploy --only firestore:rules,storage
   ```
   (ou cole o conteúdo de `firestore.rules` e `storage.rules` direto no console do Firebase, nas abas "Regras")

## 2. Rodar localmente

```bash
npm install
cp .env.example .env
# edite o .env e preencha com as credenciais do seu Firebase
npm run dev
```

Abra o endereço mostrado no terminal (geralmente `http://localhost:5173`).

## 3. Build de produção

```bash
npm run build
npm run preview   # para testar o build localmente
```

Os arquivos finais ficam em `dist/`.

## 4. Publicar no GitHub

```bash
git init
git add .
git commit -m "Luary Shop ERP"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/luary-shop.git
git push -u origin main
```

O arquivo `.env` **não vai** para o repositório (está no `.gitignore`) — suas credenciais do Firebase ficam seguras.

## 5. Deploy (hospedagem)

Qualquer host de site estático funciona. Opções simples:

**Vercel / Netlify** (recomendado): conecte o repositório do GitHub, configure as variáveis de ambiente do `.env.example` no painel do serviço, e o deploy é automático a cada `git push`.

**Firebase Hosting**:
```bash
firebase init hosting   # aponte a pasta pública para "dist"
npm run build
firebase deploy --only hosting
```

**GitHub Pages**: rode `npm run build`, publique a pasta `dist` numa branch `gh-pages`, e ajuste `base` em `vite.config.js` para `'/nome-do-repositorio/'`.

> Em qualquer um desses serviços, lembre-se de configurar as variáveis `VITE_FIREBASE_*` do `.env.example` como variáveis de ambiente do próprio serviço de hospedagem — o Vite as injeta no build.

## Segurança — leia antes de usar com dados reais

- As regras atuais (`firestore.rules`) liberam leitura/escrita para **qualquer usuário autenticado**, e a autenticação é anônima — ou seja, qualquer pessoa com o link do site tem acesso total aos seus dados. Isso é intencional para simplicidade de uso pessoal.
- Se você for usar com funcionários ou dados sensíveis, troque para autenticação por e-mail/senha e restrinja as regras a uma lista de UIDs autorizados (há um exemplo comentado dentro de `firestore.rules`).
- A `apiKey` do Firebase que vai no `.env` **não é secreta por natureza** (ela é enviada ao navegador de qualquer forma) — quem protege seus dados são as **regras de segurança**, não a chave em si. Ainda assim, mantenha-a fora do Git por boas práticas e para evitar que outras pessoas usem sua cota do projeto.

## Estrutura do projeto

```
src/
  App.jsx        # aplicação principal (todos os módulos do ERP)
  firebase.js     # inicialização do Firebase a partir das variáveis de ambiente
  main.jsx        # entrypoint do React
  index.css       # Tailwind
firestore.rules   # regras de segurança do banco
storage.rules     # regras de segurança do storage (fotos)
.env.example      # modelo de variáveis de ambiente
```
