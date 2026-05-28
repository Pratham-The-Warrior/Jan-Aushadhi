import { create } from 'zustand';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

// --- AUTHENTICATION STATE STORE ---
// Built with Zustand, this acts as the single source of truth for the user's login state.
// We integrate Firebase Authentication here to keep client sessions perfectly reactive.
const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: true,       // Tracks if we are still checking the session on boot
  initialized: false,  // Becomes true once the first handshake is done

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),

  // Initialize the Auth Listener
  // We subscribe to Firebase's auth status changes. This is extremely robust because it automatically 
  // fires on login, logout, token refresh, and page reloads.
  init: () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch the fresh JWT token directly from the Firebase Auth client
        const token = await user.getIdToken();
        set({ user, token, loading: false, initialized: true });
        
        // BACKEND SYNC gotcha: We write this token to localStorage so our axios/fetch API interceptor 
        // can synchronously attach it as a Bearer token in the 'Authorization' headers of outgoing backend calls.
        localStorage.setItem('janaushadhi_token', token);
      } else {
        // User is logged out: clear state and purge tokens from storage to keep it secure
        set({ user: null, token: null, loading: false, initialized: true });
        localStorage.removeItem('janaushadhi_token');
      }
    });
  },

  logout: async () => {
    await auth.signOut();
    set({ user: null, token: null });
  }
}));

// --- AUTO-INITIALIZATION ---
// Self-starting pattern: By invoking init() immediately when this module is imported, we guarantee the 
// Firebase listener is active from the millisecond the application starts, removing the need for a manual 
// hook trigger in main.jsx or App.jsx.
useAuthStore.getState().init();

export default useAuthStore;
