import { create } from 'zustand';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),

  // Initialize the auth listener
  init: () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        set({ user, token, loading: false, initialized: true });
        // Store for persistence if needed, though onAuthStateChanged handles it
        localStorage.setItem('janaushadhi_token', token);
      } else {
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

// Auto-initialize
useAuthStore.getState().init();

export default useAuthStore;
