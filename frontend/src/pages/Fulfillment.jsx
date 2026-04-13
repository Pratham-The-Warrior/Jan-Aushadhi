// ============================================================
// Store Locator Page — PMBJK Kendra Discovery
// Thin page: all UI components extracted to components/store/
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Search, AlertCircle, Locate, Building2, Globe, Map, Compass,
} from 'lucide-react';
import { getStoresByPincode, getStoreStates, getStoresByDistrict } from '../services/api';
import useCartStore from '../store/cartStore';
import StatBadge from '../components/common/StatBadge';
import StoreCard from '../components/store/StoreCard';
import StoreMapArea from '../components/store/StoreMapArea';

export default function Fulfillment() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState('pincode');
  const [pincode, setPincode] = useState('');
  const [statesList, setStatesList] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [districtText, setDistrictText] = useState('');
  const [error, setError] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchedLabel, setSearchedLabel] = useState('');
  const setCartStore = useCartStore((s) => s.setStore);
  const inputRef = useRef(null);

  // Load states on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getStoreStates();
        if (data.states) setStatesList(data.states);
      } catch (err) {
        console.error('Failed to load states', err);
      }
    })();
  }, []);

  // ---- Search Handler ----
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (searchMode === 'pincode') {
        if (pincode.length !== 6) { setError('Please enter a valid 6-digit pincode'); setLoading(false); return; }
        setSearchedLabel(`Pincode ${pincode}`);
        data = await getStoresByPincode(pincode);
      } else {
        if (!selectedState || !districtText) { setError('Please select a state and enter a district name'); setLoading(false); return; }
        setSearchedLabel(`${districtText}, ${selectedState}`);
        data = await getStoresByDistrict(selectedState, districtText.toUpperCase());
      }

      if (data.stores?.length > 0) {
        setStores(data.stores);
        setSelectedStore(data.stores[0]);
        setCartStore(data.stores[0]);
      } else {
        setStores([]);
        setError('No Jan Aushadhi Kendras found in this area.');
      }
    } catch {
      setError('Failed to fetch stores. The backend service may be offline.');
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    setCartStore(store);
  };

  // ---- GPS: Use My Location ----
  const handleUseLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by your browser.'); return; }
    setGpsLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          const pc = data?.address?.postcode;
          if (pc) {
            setPincode(pc);
            setSearchMode('pincode');
            setTimeout(() => inputRef.current?.form?.requestSubmit(), 100);
          } else {
            setError('Could not determine your pincode. Please enter it manually.');
          }
        } catch { setError('Location lookup failed. Please enter your pincode manually.'); }
        setGpsLoading(false);
      },
      () => { setError('Location access denied. Please enter your pincode manually.'); setGpsLoading(false); },
      { timeout: 10000 },
    );
  };

  return (
    <div className="flex-1 w-full bg-surface">
      {/* Hero */}
      <div className="bg-surface-lowest border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">PMBJK Store Network</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-2">
                Find Your <span className="text-primary">Jan Aushadhi Kendra</span>
              </h1>
              <p className="text-on-surface/60 text-base max-w-lg leading-relaxed">
                Search by pincode or district to locate the nearest government-certified medicine outlet.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StatBadge value="10,000+" label="Kendras" icon={Building2} />
              <StatBadge value="700+" label="Districts" icon={Globe} />
              <StatBadge value="36" label="States / UTs" icon={Map} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left: Search + Results */}
          <div className="w-full lg:w-[440px] shrink-0 space-y-6">
            {/* Search Card */}
            <div className="bg-surface-lowest rounded-xl ghost-border clinical-shadow p-6">
              <div className="flex gap-1 mb-5 bg-surface-low p-1 rounded-lg">
                {[{ key: 'pincode', label: 'Pincode', icon: MapPin }, { key: 'district', label: 'State & District', icon: Globe }].map((m) => (
                  <button key={m.key} onClick={() => setSearchMode(m.key)}
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${searchMode === m.key ? 'bg-surface-lowest shadow-sm text-primary border border-outline-variant/50' : 'text-on-surface/50 hover:text-on-surface'}`}>
                    <m.icon className="w-3.5 h-3.5" /> {m.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSearch} className="space-y-3">
                {searchMode === 'pincode' ? (
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-on-surface/40 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input ref={inputRef} type="text" inputMode="numeric" value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit pincode" aria-label="Pincode"
                      className="w-full py-4 pl-11 pr-12 bg-surface-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface placeholder-on-surface/40 font-semibold" />
                    <button type="submit" disabled={loading} aria-label="Search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2 rounded-md hover:bg-primary-dim transition-colors disabled:opacity-50">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} aria-label="Select State"
                      className="w-full py-4 px-4 bg-surface-low border border-outline-variant rounded-lg text-sm outline-none text-on-surface appearance-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold">
                      <option value="">Select State / UT</option>
                      {statesList.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="relative">
                      <input type="text" value={districtText} onChange={(e) => setDistrictText(e.target.value)}
                        placeholder="Enter District Name" aria-label="District"
                        className="w-full py-4 pl-4 pr-12 bg-surface-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface placeholder-on-surface/40 font-semibold" />
                      <button type="submit" disabled={loading} aria-label="Search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2 rounded-md hover:bg-primary-dim transition-colors disabled:opacity-50">
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <button type="button" onClick={handleUseLocation} disabled={gpsLoading}
                  className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-primary bg-primary/[0.06] hover:bg-primary/10 border border-primary/15 transition-all disabled:opacity-50">
                  {gpsLoading
                    ? <><div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Detecting...</>
                    : <><Locate className="w-3.5 h-3.5" /> Use My Location</>}
                </button>

                {error && (
                  <div className="flex items-start gap-2.5 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5 animate-slideUp">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="text-xs font-medium leading-relaxed">{error}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Results Header */}
            {stores.length > 0 && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-on-surface text-lg">{stores.length} Kendra{stores.length !== 1 ? 's' : ''} Found</h2>
                  <p className="text-xs text-on-surface/50 font-medium mt-0.5">Showing results for {searchedLabel}</p>
                </div>
                <div className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/8 px-3 py-1.5 rounded-md">{stores.length} Results</div>
              </div>
            )}

            {/* Store List */}
            <div className="space-y-3 max-h-[calc(100vh-460px)] overflow-y-auto pr-1 no-scrollbar pb-24 lg:pb-4">
              {loading && (
                <div className="text-center py-16">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-5" />
                  <div className="text-on-surface/60 text-sm font-semibold">Locating Kendras...</div>
                </div>
              )}

              {!loading && stores.length === 0 && !error && (
                <div className="text-center py-16 px-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/10">
                    <Compass className="w-10 h-10 text-primary/40" />
                  </div>
                  <h3 className="font-display font-bold text-on-surface text-xl mb-2">Find Your Nearest Kendra</h3>
                  <p className="text-sm text-on-surface/50 leading-relaxed max-w-xs mx-auto mb-8">
                    Enter your pincode or use GPS to discover government-certified medicine outlets near you.
                  </p>
                  <div className="flex flex-col gap-3 text-left max-w-xs mx-auto">
                    {[{ icon: MapPin, text: 'Search by 6-digit PIN code' }, { icon: Globe, text: 'Browse by state and district' }, { icon: Locate, text: 'Auto-detect your location' }].map((h, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs text-on-surface/50 font-medium bg-surface-low/50 rounded-lg px-4 py-3 ghost-border">
                        <h.icon className="w-4 h-4 text-primary/50 shrink-0" /> {h.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && stores.map((store) => (
                <StoreCard key={store.pmbjk_code} store={store} isSelected={selectedStore?.pmbjk_code === store.pmbjk_code} onSelect={handleSelectStore} />
              ))}
            </div>
          </div>

          {/* Right: Map */}
          <div className="flex-1 min-h-[500px] lg:min-h-0 relative">
            <StoreMapArea stores={stores} selectedStore={selectedStore} onSelectStore={handleSelectStore} />
          </div>
        </div>
      </div>
    </div>
  );
}
