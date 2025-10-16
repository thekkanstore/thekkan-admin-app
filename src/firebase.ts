import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from "firebase/storage";
import { getFunctions } from 'firebase/functions';
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBaPEk58TUoYYJWBR0I3zjgv5Io19wbpbM",
  authDomain: "thekkans.firebaseapp.com",
  projectId: "thekkans",
  storageBucket: "thekkans.firebasestorage.app",
  messagingSenderId: "143958591372",
  appId: "1:143958591372:web:59ad2a1683be2234d7b8a9",
  measurementId: "G-HNQTSG5VSC"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const database = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const messaging = getMessaging(app);
