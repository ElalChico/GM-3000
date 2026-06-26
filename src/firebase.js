// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCU6_62MZZib6xboyPYU94OOJOdKkWpEwg",
  authDomain: "gm-3000.firebaseapp.com",
  projectId: "gm-3000",
  storageBucket: "gm-3000.firebasestorage.app",
  messagingSenderId: "458763093369",
  appId: "1:458763093369:web:1a5f619a25ffde038b9ba8",
  measurementId: "G-W83YVY4HL4",
  databaseURL: "https://gm-3000-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
