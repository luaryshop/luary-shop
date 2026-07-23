import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// As credenciais NUNCA ficam hardcoded no código-fonte.
// Elas vêm do arquivo .env (veja .env.example) e são injetadas pelo Vite em build time.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// databaseURL é obrigatório aqui porque o app usa o Realtime Database
// (é onde os dados reais de banhos/insumos/marketplaces/produtos já existem).
const requiredKeys = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'appId'];
const missingKeys = requiredKeys.filter((k) => !firebaseConfig[k]);

export const firebaseConfigError =
  missingKeys.length > 0
    ? 'Configuração do Firebase incompleta. Verifique se o arquivo .env existe e contém todas as chaves VITE_FIREBASE_* — incluindo VITE_FIREBASE_DATABASE_URL, obrigatória para o Realtime Database (veja .env.example).'
    : null;

// Namespace usado no Realtime Database (os dados reais ficam em /luary/luary_*).
export const appId = import.meta.env.VITE_APP_NAMESPACE || 'luary';

let app, auth, db, storage;

if (!firebaseConfigError) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
