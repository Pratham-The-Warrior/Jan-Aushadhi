// ============================================================
// Cart Context — Global shopping cart state management
// Carries medicines from Discovery -> Checkout
// ============================================================

import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext(null);

const initialState = {
  items: [],  // { drug_code, name, mrp, branded_name, branded_mrp, quantity, savings }
  selectedStore: null,
  legalAttestation: false,
};

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const exists = state.items.find(i => i.drug_code === action.payload.drug_code);
      if (exists) {
        return {
          ...state,
          items: state.items.map(i =>
            i.drug_code === action.payload.drug_code
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => i.drug_code !== action.payload),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          i.drug_code === action.payload.drug_code
            ? { ...i, quantity: Math.max(1, action.payload.quantity) }
            : i
        ),
      };
    case 'SET_STORE':
      return { ...state, selectedStore: action.payload };
    case 'SET_ATTESTATION':
      return { ...state, legalAttestation: action.payload };
    case 'CLEAR_CART':
      return initialState;
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', payload: item });
  const removeItem = (drugCode) => dispatch({ type: 'REMOVE_ITEM', payload: drugCode });
  const updateQuantity = (drugCode, quantity) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { drug_code: drugCode, quantity } });
  const setStore = (store) => dispatch({ type: 'SET_STORE', payload: store });
  const setAttestation = (val) => dispatch({ type: 'SET_ATTESTATION', payload: val });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const subtotal = state.items.reduce((sum, i) => sum + i.mrp * i.quantity, 0);
  const totalBrandedValue = state.items.reduce((sum, i) => sum + (i.branded_mrp || 0) * i.quantity, 0);
  const totalSavings = totalBrandedValue - subtotal;

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        updateQuantity,
        setStore,
        setAttestation,
        clearCart,
        subtotal,
        totalBrandedValue,
        totalSavings,
        itemCount: state.items.reduce((sum, i) => sum + i.quantity, 0),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
