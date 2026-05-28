// ============================================================
// StoreCard — Individual store listing card
// Used in the Store Locator results panel
// ============================================================

import React from 'react';
import { Store, MapPin, Phone, Clock, Navigation, CheckCircle2 } from 'lucide-react';

/**
 * @param {object}   props
 * @param {object}   props.store       - Store data object
 * @param {boolean}  props.isSelected  - Whether this store is currently selected
 * @param {function} props.onSelect    - Selection callback
 */
export default function StoreCard({ store, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(store)}
      className={`group relative rounded-xl p-5 cursor-pointer transition-all duration-200 border-2 ${
        isSelected
          ? 'border-primary bg-primary/[0.04] shadow-[0_0_0_1px_rgba(0,106,106,0.1)]'
          : 'border-transparent bg-surface-lowest hover:border-outline-variant hover:shadow-sm'
      }`}
    >
      {/* Selected accent bar */}
      {isSelected && (
        <div className="absolute -left-[2px] top-4 bottom-4 w-[3px] bg-primary rounded-r-full" />
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isSelected ? 'bg-primary text-white' : 'bg-surface-low text-primary'
          }`}>
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-on-surface text-[15px] leading-tight group-hover:text-primary transition-colors">
              {store.name}
            </h3>
            <div className="text-[10px] text-on-surface/40 font-bold tracking-wider uppercase mt-0.5">
              {store.pmbjk_code}
            </div>
          </div>
        </div>
        <span className="bg-[#e6f4ea] text-[#137333] text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-[#a8dab5] flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 bg-[#137333] rounded-full animate-pulse" />
          Open
        </span>
      </div>

      {/* Address */}
      <p className="text-sm text-on-surface/60 mb-4 leading-relaxed line-clamp-2 pl-[52px]">
        {store.address}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-4 pl-[52px] mb-4">
        {store.district && (
          <span className="flex items-center gap-1.5 text-xs text-on-surface/50 font-medium">
            <MapPin className="w-3.5 h-3.5 text-primary/60" /> {store.district}
          </span>
        )}
        {store.phone && (
          <span className="flex items-center gap-1.5 text-xs text-on-surface/50 font-medium">
            <Phone className="w-3.5 h-3.5 text-primary/60" /> {store.phone}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-xs text-on-surface/50 font-medium">
          <Clock className="w-3.5 h-3.5 text-on-surface/30" /> 9 AM – 9 PM
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pl-[52px]">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(store); }}
          className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
            isSelected
              ? 'bg-primary text-white shadow-sm'
              : 'bg-primary/8 text-primary hover:bg-primary/15'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isSelected ? 'Selected' : 'Select'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (store.phone) window.open(`tel:${store.phone}`);
          }}
          className="py-2.5 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-surface-low text-on-surface/60 hover:text-on-surface transition-all flex items-center gap-1.5 border border-outline-variant/50"
        >
          <Phone className="w-3.5 h-3.5" /> Call
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://www.google.com/maps/search/${encodeURIComponent(store.name + ' ' + store.address)}`);
          }}
          className="py-2.5 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-surface-low text-on-surface/60 hover:text-on-surface transition-all flex items-center gap-1.5 border border-outline-variant/50"
        >
          <Navigation className="w-3.5 h-3.5" /> Map
        </button>
      </div>
    </div>
  );
}
