import { create } from 'zustand';
import { getFirebaseAuth, isAuthConfigured } from '../firebase';

// --- AUTHENTICATION STATE STORE ---
// Single source of truth for the user's login state, backed by Firebase Auth.
// Firebase is loaded lazily (see firebase.js) so it never delays the first paint.
const TOKEN_KEY = 'janaushadhi_token';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: true,       // Tracks if we are still checking the session on boot
  initialized: false,  // Becomes true once the first handshake is done

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),

  // Subscribe to Firebase auth changes (login, logout, token refresh, reloads).
  init: async () => {
    const auth = await getFirebaseAuth();
    if (!auth) {
      set({ user: null, token: null, loading: false, initialized: true });
      return;
    }
    try {
      const { onAuthStateChanged } = await import('firebase/auth');
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          set({ user, token, loading: false, initialized: true });
          try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
        } else {
          set({ user: null, token: null, loading: false, initialized: true });
          try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
        }
      });
    } catch (err) {
      console.warn("⚠️ Auth listener fallback active:", err);
      set({ user: null, token: null, loading: false, initialized: true });
    }
  },

  logout: async () => {
    const auth = await getFirebaseAuth();
    if (auth) {
      try {
        await auth.signOut();
      } catch (err) {
        console.warn('⚠️ Sign out notice:', err);
      }
    }
    set({ user: null, token: null });
  }
}));

// --- AUTO-INITIALIZATION ---
// Returning signed-in users, and pages that need an account, restore the session
// straight away. Everyone else gets Firebase once the browser is idle, so the
// search experience is never blocked by sign-in code.
function startAuth() {
  useAuthStore.getState().init();
}

if (!isAuthConfigured) {
  startAuth(); // resolves immediately to "signed out"
} else {
  let hadSession = false;
  try { hadSession = Boolean(localStorage.getItem(TOKEN_KEY)); } catch { /* storage unavailable */ }
  const needsAuthNow = hadSession || /^\/(account|checkout|auth|wellness|dashboard)/.test(window.location.pathname);
  if (needsAuthNow) startAuth();
  else if ('requestIdleCallback' in window) window.requestIdleCallback(startAuth, { timeout: 3000 });
  else setTimeout(startAuth, 1500);
}

export default useAuthStore;
