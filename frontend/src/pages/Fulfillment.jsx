// ============================================================
// Store Locator — Interactive Map + PostGIS Proximity
// Reference: Image 6 (Store Locator Map)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Navigation, Clock, Search, Eye, ChevronRight } from 'lucide-react';
import { getNearbyStores } from '../services/api';
import useCartStore from '../store/cartStore';

const MOCK_STORES = [
  { pmbjk_code: 'PMBJK-MH-001', name: 'Vasant Kunj Kendra #402', phone: '+91 98765 00001', address: '15, Sector 12, Vasant Kunj, New Delhi - 110070', distance_km: 1.2, status: 'Open', lat: 28.52, lng: 77.15 },
  { pmbjk_code: 'PMBJK-MH-002', name: 'Saket Health Kendra', phone: '+91 98765 00002', address: 'B-4, Saket District Centre, New Delhi - 110017', distance_km: 3.8, status: 'Open', lat: 28.53, lng: 77.20 },
  { pmbjk_code: 'PMBJK-MH-003', name: 'Hauz Khas Medical Centre', phone: '+91 98765 00003', address: '22 Aurobindo Marg, Hauz Khas, New Delhi - 110016', distance_km: 5.1, status: 'Closed', lat: 28.55, lng: 77.19 },
  { pmbjk_code: 'PMBJK-KA-001', name: 'Koramangala Kendra', phone: '+91 98765 00006', address: '80 Feet Road, Koramangala, Bangalore - 560034', distance_km: 6.2, status: 'Open', lat: 12.93, lng: 77.62 },
];

export default function Fulfillment() {
  const navigate = useNavigate();
  const [stores, setStores] = useState(MOCK_STORES);
  const [loading, setLoading] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [serviceFilter, setServiceFilter] = useState('all');
  const setCartStore = useCartStore(s => s.setStore);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setLoading(true);
          try {
            const data = await getNearbyStores(pos.coords.latitude, pos.coords.longitude);
            if (data.stores?.length > 0) setStores(data.stores);
          } catch { /* mock */ }
          setLoading(false);
        },
        () => {}
      );
    }
  }, []);

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    setCartStore(store);
  };

  const filteredStores = serviceFilter === 'all' ? stores : stores.filter(s => s.status === 'Open');

  return (
    <div className="flex-1 w-full bg-surface">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-[var(--nav-height,80px)])]">

        {/* Sidebar */}
        <div className="w-full lg:w-[420px] bg-surface-lowest border-r border-outline-variant flex flex-col overflow-hidden z-20 clinical-shadow">
          <div className="p-6 border-b border-outline-variant">
            <h1 className="font-display text-2xl font-bold text-on-surface mb-5">Stores Nearby</h1>
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-on-surface/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text" value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Search by location or pincode"
                className="w-full py-3.5 pl-10 pr-4 bg-surface-low border border-outline-variant rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface placeholder-on-surface/50"
              />
            </div>
            <select
              value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full py-3.5 px-4 bg-surface-low border border-outline-variant rounded-md text-sm outline-none text-on-surface/80 appearance-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ghost-border"
            >
              <option value="all">All Services</option>
              <option value="open">Open Now</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            {loading && <div className="text-center py-8 text-on-surface/50 text-sm font-medium">Locating stores near you...</div>}
            {filteredStores.map((store) => (
              <div
                key={store.pmbjk_code}
                onClick={() => handleSelectStore(store)}
                className={`bg-surface-lowest border rounded-lg p-5 cursor-pointer transition-all hover:bg-surface-low ${
                  selectedStore?.pmbjk_code === store.pmbjk_code ? 'border-primary shadow-sm bg-primary/5' : 'border-outline-variant'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-display font-bold text-on-surface text-base">{store.name}</h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ghost-border ${
                    (store.status || 'Open') === 'Open' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {store.status || 'Open'}
                  </span>
                </div>
                <p className="text-sm text-on-surface/70 mb-4 leading-[1.6]">{store.address}</p>
                <div className="flex items-center gap-5 text-sm mb-5">
                  <span className="flex items-center gap-1.5 text-on-surface/80 font-semibold"><MapPin className="w-4 h-4 text-primary" />{store.distance_km || '?'} km</span>
                  <span className="flex items-center gap-1.5 text-on-surface/60 font-medium"><Clock className="w-4 h-4 text-on-surface/40" />9 AM - 9 PM</span>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-none rounded-md">
                    <Eye className="w-3.5 h-3.5" /> Details
                  </button>
                  <button className="flex-1 btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-none rounded-md border-outline-variant bg-surface-lowest">
                    <Navigation className="w-3.5 h-3.5" /> Directions
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 bg-surface-low relative min-h-[400px] z-10">
          {/* Mock Map Background Layer */}
          <div className="absolute inset-0 bg-[#e4e9ea]" />
          
          <div className="absolute inset-0">
            {/* Map pins */}
            {filteredStores.map((store, idx) => (
              <div
                key={store.pmbjk_code}
                onClick={() => handleSelectStore(store)}
                className={`absolute transition-all duration-300 cursor-pointer ${
                  selectedStore?.pmbjk_code === store.pmbjk_code ? 'scale-[1.6] z-20' : 'z-10 hover:scale-[1.3]'
                }`}
                style={{ top: `${15 + idx * 18}%`, left: `${20 + idx * 15}%` }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-[3px] ${
                  selectedStore?.pmbjk_code === store.pmbjk_code ? 'bg-primary border-surface-lowest' : (store.status === 'Open' ? 'bg-primary/70 border-surface-lowest' : 'bg-on-surface/30 border-surface-lowest')
                }`}>
                  <MapPin className="w-4 h-4 text-surface-lowest" />
                </div>
                {selectedStore?.pmbjk_code === store.pmbjk_code && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-primary" />
                )}
              </div>
            ))}

            {/* Selected store detail popup */}
            {selectedStore && (
              <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto md:w-[380px] bg-surface-lowest rounded-lg clinical-shadow p-6 ghost-border border-outline-variant z-30 animate-slideUp">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-display font-bold text-lg text-on-surface">{selectedStore.name}</h3>
                  <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider border border-primary/20">{selectedStore.status || 'Open'}</span>
                </div>
                <p className="text-sm text-on-surface/70 mb-4 leading-[1.6]">{selectedStore.address}</p>
                <div className="flex items-center gap-5 text-sm text-on-surface/80 font-medium mb-5">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {selectedStore.distance_km} km</span>
                  {selectedStore.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-primary" /> {selectedStore.phone}</span>}
                </div>
                <div className="bg-surface-low rounded-md px-4 py-3 mb-5 ghost-border">
                  <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Store Code</div>
                  <div className="font-display font-bold text-on-surface text-sm">{selectedStore.pmbjk_code}</div>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2"
                >
                  Select Store & Checkout <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {!selectedStore && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-surface-lowest/90 backdrop-blur-md px-6 py-3.5 rounded-md clinical-shadow ghost-border text-sm font-semibold text-on-surface/80 z-20 whitespace-nowrap">
                Select a store from the sidebar to begin fulfillment
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
