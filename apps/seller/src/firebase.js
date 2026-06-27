import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyApiKey1234567890123456789012",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jan-aushadhi.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jan-aushadhi",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jan-aushadhi.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:1234567890123456789012"
};

let app;
let auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (err) {
  console.warn("⚠️ Firebase Initialization Warning:", err);
}

export { auth };
export default app;
