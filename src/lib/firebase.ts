import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBckPXI2QKxPzYTUMRfp-PzlLoVCAbn0Ig",
  authDomain: "heal-u-ai-studio.firebaseapp.com",
  projectId: "heal-u-ai-studio",
  storageBucket: "heal-u-ai-studio.firebasestorage.app",
  messagingSenderId: "861650997395",
  appId: "1:861650997395:web:2dc426b00e364ab15f3d66",
  measurementId: "G-5LPDNHT1ZC",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
