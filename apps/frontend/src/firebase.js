// ============================================================
// Firebase — loaded on demand
// Firebase Auth is large (~half the old entry bundle) and most
// visitors only search, so it is never part of the initial
// download. getFirebaseAuth() imports and initialises it once,
// the first time something needs it.
// ============================================================

// Firebase web config comes from Vite env vars. If they are missing we do NOT
// fall back to dummy values (that only fails later with confusing errors);
// instead sign-in is reported as unavailable.
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

let authPromise = null;

/**
 * Resolve the Firebase Auth instance, loading the SDK on first call.
 * @returns {Promise<import('firebase/auth').Auth | null>} null when not configured or on load failure
 */
export function getFirebaseAuth() {
  if (!isAuthConfigured) return Promise.resolve(null);
  if (!authPromise) {
    authPromise = Promise.all([import('firebase/app'), import('firebase/auth')])
      .then(([{ initializeApp }, { getAuth }]) => getAuth(initializeApp(firebaseConfig)))
      .catch((err) => {
        console.warn('⚠️ Firebase failed to load:', err);
        authPromise = null; // allow a retry later
        return null;
      });
  }
  return authPromise;
}

if (!isAuthConfigured) {
  console.warn("⚠️ Firebase is not configured (VITE_FIREBASE_* env vars missing). Sign-in is disabled.");
}
