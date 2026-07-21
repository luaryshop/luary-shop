import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// As credenciais NUNCA ficam hardcoded no código-fonte.
// Elas vêm do arquivo .env (veja .env.example) e são injetadas pelo Vite em build time.
// Isso permite que o repositório seja público no GitHub sem vazar as chaves do projeto.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
const missingKeys = requiredKeys.filter((k) => !firebaseConfig[k]);

export const firebaseConfigError =
  missingKeys.length > 0
    ? 'Configuração do Firebase incompleta. Verifique se o arquivo .env existe e contém todas as chaves VITE_FIREBASE_* (veja .env.example).'
    : null;

// Namespace lógico usado para separar os dados no Firestore
// (útil se você quiser rodar ambientes de teste e produção no mesmo projeto Firebase).
export const appId = import.meta.env.VITE_APP_NAMESPACE || 'LuaryShop';

let app, auth, db, storage;

if (!firebaseConfigError) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
