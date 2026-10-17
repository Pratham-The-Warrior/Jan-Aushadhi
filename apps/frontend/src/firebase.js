import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase web config comes from Vite env vars. If they are missing we do NOT
// fall back to dummy values (that only fails later with confusing errors);
// instead `auth` is null and the UI tells the user sign-in is unavailable.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isAuthConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !String(firebaseConfig.apiKey).startsWith('your_'),
);

let app = null;
let auth = null;

if (isAuthConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (err) {
    console.warn("⚠️ Firebase Initialization Warning:", err);
  }
} else {
  console.warn("⚠️ Firebase is not configured (VITE_FIREBASE_* env vars missing). Sign-in is disabled.");
}

export { auth };
export default app;
