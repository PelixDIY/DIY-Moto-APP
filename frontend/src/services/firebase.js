// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// TODO: Replace with your project's config object
const firebaseConfig = {
  apiKey: "AIzaSyDW2jmdhLHc6C90rX83VHhBQXoJ3T5-pDQ",
  authDomain: "diy-moto-app.firebaseapp.com",
  projectId: "diy-moto-app",
  storageBucket: "diy-moto-app.firebasestorage.app",
  messagingSenderId: "977690987988",
  appId: "1:977690987988:web:a3b7817e2c7da9fecb9a41",
  measurementId: "G-T3DVL1JNLX"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
