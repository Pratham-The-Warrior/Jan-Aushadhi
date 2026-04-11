// ============================================================
// Zustand Cart Store — Persistent cart with localStorage
// Replaces React Context for cross-page persistence
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { searchMedicines, getDiscovery, getNearbyStores, getStoreByCode, createRequirement, getRequirements, getUserDashboard, getUserProfile, updateMedicalBasket, healthCheck, syncCart } from '../services/api';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      selectedStore: null,
      legalAttestation: false,
      recentSearches: [],

      // Cart actions
      addItem: (item) => set((state) => {
        const exists = state.items.find(i => i.drug_code === item.drug_code);
        if (exists) {
          return { items: state.items.map(i => i.drug_code === item.drug_code ? { ...i, quantity: i.quantity + 1 } : i) };
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),

      removeItem: (drugCode) => set((state) => ({
        items: state.items.filter(i => i.drug_code !== drugCode),
      })),

      updateQuantity: (drugCode, quantity) => set((state) => ({
        items: state.items.map(i => i.drug_code === drugCode ? { ...i, quantity: Math.max(1, quantity) } : i),
      })),

      setStore: (store) => set({ selectedStore: store }),
      setAttestation: (val) => set({ legalAttestation: val }),
      clearCart: () => set({ items: [], selectedStore: null, legalAttestation: false }),

      // Recent searches
      addRecentSearch: (query) => set((state) => {
        const filtered = state.recentSearches.filter(s => s !== query);
        return { recentSearches: [query, ...filtered].slice(0, 8) };
      }),

      // Server Sync logic (Merge & Max)
      syncWithServer: async () => {
        try {
          const profile = await getUserProfile();
          const serverBasket = profile.medical_basket || [];
          const localItems = get().items;

          // Merge & Max logic
          const merged = [...localItems];
          serverBasket.forEach(serverItem => {
            const localIndex = merged.findIndex(i => i.drug_code === serverItem.drug_code);
            if (localIndex > -1) {
              // Same item: take the max quantity
              merged[localIndex].quantity = Math.max(merged[localIndex].quantity, serverItem.quantity);
            } else {
              // New item from server: add to local
              merged.push(serverItem);
            }
          });

          set({ items: merged });
          // Update server with the combined result
          await updateMedicalBasket(merged);
        } catch (err) {
          console.error("Cart sync failed:", err);
        }
      },

      // Computed
      get subtotal() { return get().items.reduce((sum, i) => sum + i.mrp * i.quantity, 0); },
      get totalBrandedValue() { return get().items.reduce((sum, i) => sum + (i.branded_mrp || 0) * i.quantity, 0); },
      get totalSavings() { return get().totalBrandedValue - get().subtotal; },
      get itemCount() { return get().items.reduce((sum, i) => sum + i.quantity, 0); },
    }),
    { name: 'janaushadhi-cart' }
  )
);

export default useCartStore;
