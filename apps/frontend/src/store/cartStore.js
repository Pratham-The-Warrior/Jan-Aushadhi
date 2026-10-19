// ============================================================
// Zustand Cart Store — Persistent cart with localStorage
// Replaces React Context for cross-page persistence
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getUserProfile, updateMedicalBasket } from '../services/api';
import useAuthStore from './authStore';

// Save the basket to the account only when someone is signed in; guests keep it
// in this browser (it is merged into their account when they sign in).
const saveBasket = (items) => {
  if (useAuthStore.getState().user) updateMedicalBasket(items).catch(() => {});
};

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      selectedStore: null,
      legalAttestation: false,
      recentSearches: [],

      // Cart actions
      // `item.quantity` (e.g. from a reorder) defaults to 1
      addItem: (item) => set((state) => {
        const qty = Math.max(1, item.quantity || 1);
        const exists = state.items.find(i => i.drug_code === item.drug_code);
        const newItems = exists
          ? state.items.map(i => i.drug_code === item.drug_code ? { ...i, quantity: i.quantity + qty } : i)
          : [...state.items, { ...item, quantity: qty }];
        saveBasket(newItems);
        return { items: newItems };
      }),

      removeItem: (drugCode) => set((state) => {
        const newItems = state.items.filter(i => i.drug_code !== drugCode);
        saveBasket(newItems);
        return { items: newItems };
      }),

      updateQuantity: (drugCode, quantity) => set((state) => {
        const newItems = state.items.map(i => i.drug_code === drugCode ? { ...i, quantity: Math.max(1, quantity) } : i);
        saveBasket(newItems);
        return { items: newItems };
      }),

      setStore: (store) => set({ selectedStore: store }),
      setAttestation: (val) => set({ legalAttestation: val }),
      clearCart: () => {
        saveBasket([]);
        return set({ items: [], selectedStore: null, legalAttestation: false });
      },

      // Recent searches
      addRecentSearch: (query) => set((state) => {
        const filtered = state.recentSearches.filter(s => s !== query);
        return { recentSearches: [query, ...filtered].slice(0, 8) };
      }),

      // Server Sync logic (Merge & Max)
      // This is called right after authentication to reconcile the local guest cart with 
      // the authenticated server cart.
      syncWithServer: async () => {
        try {
          const profile = await getUserProfile();
          const serverBasket = profile.medical_basket || [];
          const localItems = get().items;

          // MERGE & MAX ALGORITHM RATIONALE:
          // A classic e-commerce headache: a user adds 3 packs of a drug as a guest, then logs in.
          // The database says they already had 1 pack in their saved basket. What do we do?
          // We merge the two lists. For duplicate items, we take the maximum quantity (Math.max)
          // instead of summing or overwriting. This prevents accidental duplicate orders while 
          // ensuring the user doesn't lose items added in either session.
          const merged = [...localItems];
          serverBasket.forEach(serverItem => {
            const localIndex = merged.findIndex(i => i.drug_code === serverItem.drug_code);
            if (localIndex > -1) {
              // Item exists in both: take the maximum of the two quantities.
              merged[localIndex].quantity = Math.max(merged[localIndex].quantity, serverItem.quantity);
            } else {
              // Item only exists on server: append it to our local state.
              merged.push(serverItem);
            }
          });

          set({ items: merged });
          
          // Once reconciled in memory, we push the updated, merged basket back up to the server 
          // to persist the resolved state in the PostgreSQL database.
          await updateMedicalBasket(merged);
        } catch (err) {
          // If sync fails, we log it and fallback safely to the local-only cart so the user's
          // shopping flow is uninterrupted.
          console.error("Cart sync failed:", err);
        }
      },

    }),
    { name: 'janaushadhi-cart' }
  )
);

// Reusable selectors for derived cart values
export const selectSubtotal = (s) => s.items.reduce((sum, i) => sum + i.mrp * i.quantity, 0);
// Items without a comparable brand price (e.g. different strength) count as no saving.
export const selectBrandedTotal = (s) => s.items.reduce((sum, i) => sum + (i.branded_mrp ?? i.mrp ?? 0) * i.quantity, 0);
export const selectSavings = (s) => selectBrandedTotal(s) - selectSubtotal(s);
export const selectItemCount = (s) => s.items.reduce((sum, i) => sum + i.quantity, 0);

export default useCartStore;
