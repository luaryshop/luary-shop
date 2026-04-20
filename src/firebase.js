import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD62Yef2ggoAFSc-qKPlBTaRPRn20D91ug",
  authDomain: "luary-shop.firebaseapp.com",
  databaseURL: "https://luary-shop-default-rtdb.firebaseio.com",
  projectId: "luary-shop",
  storageBucket: "luary-shop.firebasestorage.app",
  messagingSenderId: "266203283836",
  appId: "1:266203283836:web:8d969c1379f82abda0a4f9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
