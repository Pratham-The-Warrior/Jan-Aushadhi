import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, Plus, Eye, Clock, X } from 'lucide-react';
import { searchMedicines } from '../services/api';
import useCartStore from '../store/cartStore';

const MOCK_RESULTS = [
  { id: 1, branded: { name: 'Augmentin 625 Duo', manufacturer: 'GSK Pharmaceuticals Ltd.', mrp: 223.50, composition1: 'Amoxycillin (500mg)', composition2: 'Clavulanic Acid (125mg)' }, generic: { drug_code: '01342', name: 'Amoxycillin & Potassium Clavulanate Tablets', mrp: 56.10, unit_size: "10's", group_name: 'Anti-Infective' }, savings: { absolute: 167.40, percentage: 74.9 } },
  { id: 2, branded: { name: 'Pan-40 Tablet', manufacturer: 'Alkem Laboratories', mrp: 145.00, composition1: 'Pantoprazole (40mg)', composition2: '' }, generic: { drug_code: '02551', name: 'Pantoprazole Gastro-resistant Tablets IP 40mg', mrp: 22.00, unit_size: "10's", group_name: 'Gastro-intestinal' }, savings: { absolute: 123.00, percentage: 84.8 } },
  { id: 3, branded: { name: 'Azithral 500', manufacturer: 'Alembic Pharmaceuticals', mrp: 132.36, composition1: 'Azithromycin (500mg)', composition2: '' }, generic: { drug_code: '00456', name: 'Azithromycin Tablets IP 500mg', mrp: 30.50, unit_size: "3's", group_name: 'Anti-Infective' }, savings: { absolute: 101.86, percentage: 77.0 } },
];

export default function Discovery() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(MOCK_RESULTS);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const searchRef = useRef(null);

  const addItem = useCartStore(s => s.addItem);
  const recentSearches = useCartStore(s => s.recentSearches);
  const addRecentSearch = useCartStore(s => s.addRecentSearch);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowRecent(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowRecent(false);
    addRecentSearch(q.trim());
    try {
      const data = await searchMedicines(q);
      if (data && data.length > 0) setResults(data);
      else setResults(MOCK_RESULTS);
    } catch { setResults(MOCK_RESULTS); }
    setLoading(false);
  }, [query, addRecentSearch]);

  const handleAddToCart = (res) => {
    if (!res.generic) return;
    addItem({
      drug_code: res.generic.drug_code, name: res.generic.name, mrp: res.generic.mrp,
      branded_name: res.branded.name, branded_mrp: res.branded.mrp,
      unit_size: res.generic.unit_size, group_name: res.generic.group_name,
    });
  };

  return (
    <div className="flex-1 w-full bg-surface pb-20">
      {/* Search Header */}
      <div className="bg-surface-low py-16 w-full px-4 border-b border-outline-variant">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-on-surface mb-4">
            Find Reliable <span className="text-primary">Generic Alternatives</span>
          </h1>
          <p className="text-on-surface/70 mb-10 max-w-2xl mx-auto text-lg leading-[1.6]">Search by branded name to discover the JanAushadhi equivalent and save up to 90%.</p>
          <div className="relative max-w-3xl mx-auto" ref={searchRef}>
            <div className="bg-surface-lowest ghost-border rounded-md clinical-shadow">
              <div className="flex items-center p-2">
                <Search className="w-5 h-5 text-on-surface/50 ml-4" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowRecent(true)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="Enter Branded Medicine Name (e.g. Augmentin, Lipitor)"
                  className="w-full py-4 px-4 text-base outline-none text-on-surface placeholder-on-surface/50 font-medium bg-transparent"
                />
                <button onClick={() => doSearch()} disabled={loading} className="btn-primary py-3.5 px-8 disabled:opacity-50 min-w[120px]">
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Recent Searches Dropdown */}
            {showRecent && recentSearches.length > 0 && (
              <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-surface-lowest clinical-shadow ghost-border rounded-md z-50 text-left overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 bg-surface-low border-b border-outline-variant">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface/50">Recent Searches</div>
                  <button onClick={() => setShowRecent(false)}><X className="w-4 h-4 text-on-surface/50 hover:text-on-surface" /></button>
                </div>
                {recentSearches.map((s, i) => (
                  <div key={i}
                    onClick={() => { setQuery(s); doSearch(s); }}
                    className="px-6 py-4 border-b border-outline-variant/50 text-on-surface font-medium cursor-pointer hover:bg-primary/5 transition-colors flex items-center gap-4"
                  >
                    <Clock className="w-4 h-4 text-on-surface/40" /> {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">Search Results</h2>
            <p className="text-sm text-on-surface/60">Found {results.length} pharmaceutical equivalents{searched ? ` for "${query}"` : ''}</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button className="btn-secondary py-2.5 px-5 flex items-center gap-2"><Filter className="w-4 h-4" /> Filter</button>
            <button className="btn-secondary py-2.5 px-5 flex items-center gap-2"><ArrowUpDown className="w-4 h-4" /> Sort</button>
          </div>
        </div>

        <div className="space-y-8">
          {results.map((res) => (
            <div key={res.id} className="relative flex flex-col md:flex-row bg-surface-lowest rounded-lg ghost-border p-8 pt-10 clinical-shadow">
              {/* Branded */}
              <div className="w-full md:w-[35%] pr-8 pb-8 md:pb-0 relative z-10">
                <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-3">Branded Medication</div>
                <h3 className="font-display text-2xl font-bold text-on-surface mb-2">{res.branded.name}</h3>
                <div className="text-sm text-on-surface/60 mb-8">{res.branded.manufacturer}</div>
                <div className="bg-surface-low border border-outline-variant p-6 rounded-md w-full max-w-[240px]">
                  <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-2">Estimated MRP</div>
                  <div className="font-display text-3xl font-bold text-on-surface">₹{(res.branded.mrp || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Connector + Savings Badge */}
              <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 hidden md:flex flex-col items-center z-20">
                <div className="w-10 h-10 bg-primary border-[4px] border-surface-lowest text-white flex items-center justify-center rounded-lg shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                </div>
                {res.savings?.percentage > 0 && (
                  <div className="mt-3 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">
                    SAVE {res.savings.percentage}%
                  </div>
                )}
              </div>

              {/* Generic */}
              <div className="w-full md:w-[65%] md:pl-16 relative z-10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/60 uppercase">Janaushadhi Generic Equivalent</div>
                        <div className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm uppercase">✓ LAB TESTED</div>
                      </div>
                      <h3 className="font-display text-2xl font-bold text-primary mb-2">{res.generic?.name || 'No match'}</h3>
                      <div className="text-sm text-on-surface/60">Code: {res.generic?.drug_code} • {res.generic?.group_name}</div>
                    </div>
                    {res.generic && (
                      <div className="text-right">
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-2">PMBJP Price</div>
                        <div className="font-display text-3xl font-bold text-primary">₹{(res.generic.mrp || 0).toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                  
                  {res.branded.composition1 && (
                    <div className="grid grid-cols-2 gap-10 mb-8">
                      <div>
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-4">Composition</div>
                        <div className="text-sm pb-2 border-b border-outline-variant font-medium text-on-surface/80">{res.branded.composition1}</div>
                        {res.branded.composition2 && <div className="text-sm pt-2 font-medium text-on-surface/80">{res.branded.composition2}</div>}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-4">Quick Info</div>
                        <div className="text-sm pb-2 font-medium text-on-surface/80">Form: Tablet</div>
                        <div className="text-sm pt-2 font-medium text-on-surface/80">Store below 25°C</div>
                      </div>
                    </div>
                  )}
                </div>
                {res.generic && (
                  <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => navigate(`/product/${res.id}`)} className="btn-secondary w-32 py-3.5 flex items-center justify-center gap-2"><Eye className="w-4 h-4" /> Details</button>
                    <button onClick={() => handleAddToCart(res)} className="btn-primary w-48 py-3.5 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add to Cart</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
