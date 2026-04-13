// ============================================================
// StoreMapArea — Map panel with pins and decorative background
// Used as the right panel in Store Locator
// ============================================================

import React from 'react';
import { Store, Map } from 'lucide-react';
import StoreDetailPopup from './StoreDetailPopup';

/**
 * @param {object}   props
 * @param {Array}    props.stores         - List of store objects
 * @param {object}   props.selectedStore  - Currently selected store (or null)
 * @param {function} props.onSelectStore  - Store selection callback
 */
export default function StoreMapArea({ stores, selectedStore, onSelectStore }) {
  return (
    <div className="sticky top-24 h-[calc(100vh-200px)] rounded-xl overflow-hidden ghost-border clinical-shadow">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e8eef0] via-[#eef2f4] to-[#e4eaec]">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, #006A6A 0.5px, transparent 0.5px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Range rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-2 border-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border-2 border-primary/8" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-full border-2 border-primary/12 bg-primary/[0.03]" />

        {/* Pins */}
        {stores.map((store, idx) => (
          <div
            key={store.pmbjk_code}
            onClick={() => onSelectStore(store)}
            className={`absolute transition-all duration-300 cursor-pointer group ${
              selectedStore?.pmbjk_code === store.pmbjk_code ? 'z-30 scale-110' : 'z-10 hover:z-20 hover:scale-110'
            }`}
            style={{
              top: `${25 + Math.abs(Math.sin(idx * 1.7 + 1)) * 50}%`,
              left: `${15 + Math.abs(Math.cos(idx * 2.1 + 0.5)) * 60}%`,
            }}
          >
            <div className={`relative transition-transform ${
              selectedStore?.pmbjk_code === store.pmbjk_code ? 'animate-bounce' : ''
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border-2 transition-all ${
                selectedStore?.pmbjk_code === store.pmbjk_code
                  ? 'bg-primary border-white text-white shadow-primary/30'
                  : 'bg-surface-lowest border-outline-variant text-primary hover:bg-primary hover:text-white hover:border-white'
              }`}>
                <Store className="w-5 h-5" />
              </div>
              <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b transition-all ${
                selectedStore?.pmbjk_code === store.pmbjk_code
                  ? 'bg-primary border-white'
                  : 'bg-surface-lowest border-outline-variant'
              }`} />
              {/* Hover tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                <div className="bg-on-surface text-white text-[10px] font-bold px-3 py-1.5 rounded-md shadow-lg">{store.name}</div>
              </div>
            </div>
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-2 rounded-full transition-all ${
              selectedStore?.pmbjk_code === store.pmbjk_code ? 'bg-primary/20 blur-sm' : 'bg-on-surface/10 blur-[2px]'
            }`} />
          </div>
        ))}
      </div>

      {/* Selected store detail */}
      <StoreDetailPopup store={selectedStore} />

      {/* Prompt banner */}
      {!selectedStore && stores.length > 0 && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-surface-lowest/95 backdrop-blur-xl px-6 py-3.5 rounded-xl clinical-shadow ghost-border text-sm font-semibold text-on-surface/80 z-30 flex items-center gap-3 animate-slideUp">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Select a Kendra from the list to proceed
        </div>
      )}

      {/* Empty map branding */}
      {stores.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="w-24 h-24 bg-primary/[0.06] rounded-2xl flex items-center justify-center mb-6 border border-primary/10">
            <Map className="w-12 h-12 text-primary/25" />
          </div>
          <div className="text-on-surface/30 font-display font-bold text-xl mb-2">Store Locations</div>
          <div className="text-on-surface/20 text-sm font-medium">Search to discover nearby Kendras</div>
        </div>
      )}
    </div>
  );
}
