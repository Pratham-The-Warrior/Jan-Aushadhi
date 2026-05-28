// ============================================================
// StoreDetailPopup — Selected store detail overlay on map
// Used in the Store Locator map area
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';

/**
 * @param {object}  props
 * @param {object}  props.store  - Selected store data
 */
export default function StoreDetailPopup({ store }) {
  const navigate = useNavigate();

  if (!store) return null;

  return (
    <div className="absolute bottom-5 left-5 right-5 md:left-5 md:right-auto md:w-[400px] z-40 animate-slideUp">
      <div className="bg-surface-lowest/95 backdrop-blur-xl rounded-xl clinical-shadow p-6 border border-outline-variant/50">
        {/* Identity */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
            <Store className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg text-on-surface leading-tight">{store.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded tracking-wider">
                {store.pmbjk_code}
              </span>
              <span className="bg-[#e6f4ea] text-[#137333] text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#137333] rounded-full" /> Open
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-surface-low rounded-lg p-3 ghost-border">
            <div className="text-[9px] font-bold tracking-widest text-on-surface/40 uppercase mb-1">Location</div>
            <div className="text-xs text-on-surface/80 font-medium leading-relaxed">{store.district}, {store.state}</div>
          </div>
          <div className="bg-surface-low rounded-lg p-3 ghost-border">
            <div className="text-[9px] font-bold tracking-widest text-on-surface/40 uppercase mb-1">Contact</div>
            <div className="text-xs text-on-surface/80 font-medium">{store.phone || 'N/A'}</div>
          </div>
        </div>

        {/* Address */}
        <p className="text-xs text-on-surface/50 leading-relaxed mb-5 bg-surface-low/50 rounded-lg p-3 ghost-border">
          <MapPin className="w-3 h-3 text-primary/50 inline mr-1.5 -mt-0.5" />
          {store.address}
        </p>

        {/* Certification */}
        <div className="flex items-center gap-2 mb-5 bg-primary/[0.04] rounded-lg p-3 border border-primary/10">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
            Government Certified PMBJK Outlet
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/checkout')}
          className="w-full btn-primary py-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/15 text-sm font-bold"
        >
          Select & Continue to Checkout
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
