// ============================================================
// Discovery Page — Medicine Search + Generic Matching
// Refactored: uses useSearch hook, extracted components
// ============================================================

import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, Plus, MapPin, Loader2, Sparkles, Clock, X, Info, Pill, Beaker } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useSearch from '../hooks/useSearch';
import useClickOutside from '../hooks/useClickOutside';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';

// ---- Inline Helpers ----

/** Highlight matching text in suggestion names */
function HighlightMatch({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-bold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function Discovery() {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const {
    query, setQuery, results, loading, searched,
    suggestions, suggestLoading, showDropdown, setShowDropdown,
    activeIndex, setActiveIndex, recentSearches,
    doSearch, handleKeyDown, clearSearch, selectSuggestion,
  } = useSearch();

  useClickOutside(searchRef, () => setShowDropdown(false));

  const handleAddToCart = (res) => {
    if (!res.generic) return;
    addItem({
      drug_code: res.generic.drug_code, name: res.generic.name, mrp: res.generic.mrp,
      branded_name: res.branded.name, branded_mrp: res.branded.mrp,
      unit_size: res.generic.unit_size, group_name: res.generic.group_name,
    });
  };

  const hasSuggestions = suggestions.length > 0;
  const showRecentInDropdown = !hasSuggestions && query.trim().length < 2 && recentSearches.length > 0;
  const dropdownVisible = showDropdown && (hasSuggestions || showRecentInDropdown || suggestLoading);

  return (
    <div className="flex-1 w-full bg-surface pb-20">
      {/* Search Header */}
      <div className="bg-surface-low py-16 w-full px-4 border-b border-outline-variant">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-on-surface mb-4">
            Find Reliable <span className="text-primary">Generic Alternatives</span>
          </h1>
          <p className="text-on-surface/70 mb-10 max-w-2xl mx-auto text-lg leading-[1.6]">
            Search by branded name to discover the JanAushadhi equivalent and save up to 90%.
          </p>

          {/* Search Input */}
          <div className="relative max-w-3xl mx-auto" ref={searchRef}>
            <div className="bg-surface-lowest ghost-border rounded-md clinical-shadow">
              <div className="flex items-center p-2">
                <Search className="w-5 h-5 text-on-surface/50 ml-4" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Start typing a medicine name…"
                  className="w-full py-4 px-4 text-base outline-none text-on-surface placeholder-on-surface/50 font-medium bg-transparent"
                  autoComplete="off"
                  aria-label="Search medicines"
                  aria-expanded={dropdownVisible}
                  role="combobox"
                />
                {query.length > 0 && (
                  <button
                    onClick={() => { clearSearch(); inputRef.current?.focus(); }}
                    className="mr-2 text-on-surface/30 hover:text-on-surface/70 transition-colors p-1"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => doSearch()}
                  disabled={loading || !query.trim()}
                  className="btn-primary py-3.5 px-8 disabled:opacity-50 min-w[120px] transition-all flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {dropdownVisible && (
              <div
                className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-surface-lowest clinical-shadow ghost-border rounded-md z-50 text-left overflow-hidden animate-slideUp"
                style={{ maxHeight: '380px', overflowY: 'auto' }}
                role="listbox"
              >
                {suggestLoading && query.trim().length >= 2 && (
                  <div className="px-6 py-5 flex items-center gap-3 text-on-surface/50">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">Finding medicines…</span>
                  </div>
                )}

                {hasSuggestions && (
                  <>
                    <div className="flex justify-between items-center px-6 py-3 bg-surface-low border-b border-outline-variant">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface/50 flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-primary" /> Suggestions
                      </div>
                      <div className="text-[10px] text-on-surface/40 font-medium">↑↓ navigate · Enter to search</div>
                    </div>
                    {suggestions.map((s, i) => (
                      <div
                        key={s.id}
                        onClick={() => selectSuggestion(s.name)}
                        onMouseEnter={() => setActiveIndex(i)}
                        role="option"
                        aria-selected={activeIndex === i}
                        className={`px-6 py-4 border-b border-outline-variant/30 cursor-pointer transition-all flex items-start gap-4 ${activeIndex === i ? 'bg-primary/8' : 'hover:bg-primary/5'}`}
                      >
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Pill className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-on-surface text-sm truncate">
                            <HighlightMatch text={s.name} query={query} />
                          </div>
                          <div className="text-xs text-on-surface/50 mt-0.5 flex items-center gap-2 truncate">
                            {s.manufacturer && <span>{s.manufacturer}</span>}
                            {s.composition && <><span className="opacity-30">•</span><span>{s.composition}</span></>}
                          </div>
                        </div>
                        {s.mrp > 0 && (
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-on-surface/70">₹{s.mrp.toFixed(2)}</div>
                            <div className="text-[10px] text-on-surface/40">MRP</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {showRecentInDropdown && !suggestLoading && (
                  <>
                    <div className="flex justify-between items-center px-6 py-3 bg-surface-low border-b border-outline-variant">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface/50 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Recent Searches
                      </div>
                      <button onClick={() => setShowDropdown(false)}><X className="w-4 h-4 text-on-surface/50 hover:text-on-surface" /></button>
                    </div>
                    {recentSearches.map((s, i) => (
                      <div key={i}
                        onClick={() => selectSuggestion(s)}
                        onMouseEnter={() => setActiveIndex(i)}
                        role="option"
                        aria-selected={activeIndex === i}
                        className={`px-6 py-4 border-b border-outline-variant/30 text-on-surface font-medium cursor-pointer transition-all flex items-center gap-4 ${activeIndex === i ? 'bg-primary/8' : 'hover:bg-primary/5'}`}
                      >
                        <Clock className="w-4 h-4 text-on-surface/30" /> {s}
                      </div>
                    ))}
                  </>
                )}

                {!suggestLoading && !hasSuggestions && query.trim().length >= 2 && (
                  <div className="px-6 py-5 text-center">
                    <div className="text-sm text-on-surface/50 font-medium">No suggestions found</div>
                    <div className="text-xs text-on-surface/40 mt-1">Press Enter to perform a full search</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {searched && (
          <div className="flex flex-col md:flex-row justify-between items-end mb-10">
            <div>
              <h2 className="font-display text-2xl font-bold text-on-surface mb-2">Search Results</h2>
              <p className="text-sm text-on-surface/60">Found {results.length} pharmaceutical equivalents for "{query}"</p>
            </div>
            {results.length > 0 && (
              <div className="flex gap-3 mt-4 md:mt-0">
                <button className="btn-secondary py-2.5 px-5 flex items-center gap-2 text-xs uppercase tracking-widest font-bold"><Filter className="w-4 h-4" /> Filter</button>
                <button className="btn-secondary py-2.5 px-5 flex items-center gap-2 text-xs uppercase tracking-widest font-bold"><ArrowUpDown className="w-4 h-4" /> Sort</button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-8">
          {loading && <SkeletonCard count={3} />}

          {!loading && searched && results.length === 0 && (
            <EmptyState
              icon={<Search className="w-10 h-10 text-on-surface/10" />}
              title="No Matching Generic Found"
              description={`We couldn't find a direct JanAushadhi equivalent for "${query}". Try checking the spelling or searching for the primary chemical salt.`}
              action={<button onClick={clearSearch} className="text-primary font-bold text-sm uppercase tracking-widest hover:underline">Clear Search</button>}
            />
          )}

          {!loading && results.map((res) => (
            <div key={res.id} className="relative flex flex-col md:flex-row bg-surface-lowest rounded-lg ghost-border p-8 pt-10 clinical-shadow group hover:border-primary/20 transition-all">
              {/* Branded */}
              <div className="w-full md:w-[35%] pr-8 pb-8 md:pb-0 relative z-10 border-r-0 md:border-r border-outline-variant/30">
                <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-3 flex items-center gap-2"><Beaker className="w-3.5 h-3.5" /> Branded Medication</div>
                <h3 className="font-display text-2xl font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">{res.branded.name}</h3>
                <div className="text-sm text-on-surface/60 mb-8 font-medium">{res.branded.manufacturer}</div>
                <div className="bg-surface-low border border-outline-variant p-6 rounded-md w-full max-w-[240px] ghost-border">
                  <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-2">Estimated MRP</div>
                  <div className="font-display text-3xl font-bold text-on-surface">₹{(res.branded.mrp || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Savings Badge - Mobile */}
              <div className="md:hidden flex items-center justify-center py-6 bg-primary/5 my-4 rounded-md border border-primary/10">
                <div className="text-primary font-bold text-sm">SAVE {res.savings.percentage}% WITH JAN AUSHADHI</div>
              </div>

              {/* Connector + Savings Badge - Desktop */}
              <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 hidden md:flex flex-col items-center z-20">
                <div className="w-10 h-10 bg-primary border-[4px] border-surface-lowest text-white flex items-center justify-center rounded-lg shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                </div>
                {res.savings?.percentage > 0 && (
                  <div className="mt-3 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider shadow-sm">
                    SAVE {res.savings.percentage}%
                  </div>
                )}
              </div>

              {/* Generic */}
              <div className="w-full md:w-[65%] md:pl-16 relative z-10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-8 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/60 uppercase flex items-center gap-2"><Pill className="w-3.5 h-3.5" /> PMBJP Equivalent</div>
                        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm uppercase">✓ Lab Tested</div>
                      </div>
                      <h3 className="font-display text-2xl font-bold text-primary mb-2 leading-tight">{res.generic?.name || 'No match'}</h3>
                      <div className="text-sm text-on-surface/60 font-medium font-body flex items-center gap-3">
                        <span className="bg-surface-low px-2 py-0.5 rounded ghost-border">Code: {res.generic?.drug_code}</span>
                        <span className="opacity-30">•</span>
                        <span>{res.generic?.group_name}</span>
                      </div>
                    </div>
                    {res.generic && (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-2">JanAushadhi Price</div>
                        <div className="font-display text-3xl font-bold text-primary">₹{(res.generic.mrp || 0).toFixed(2)}</div>
                      </div>
                    )}
                  </div>

                  {res.branded.composition1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                      <div>
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-4 flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Chemical Composition</div>
                        <div className="text-sm pb-2 border-b border-outline-variant/30 font-semibold text-on-surface/80">{res.branded.composition1}</div>
                        {res.branded.composition2 && <div className="text-sm pt-2 font-semibold text-on-surface/80">{res.branded.composition2}</div>}
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-4">Storage & Form</div>
                        <div className="text-sm font-medium text-on-surface/70 bg-surface-low p-3 rounded-md ghost-border inline-block flex items-center gap-2">
                          <Pill className="w-4 h-4 text-primary" /> {res.branded.form || 'Tablet'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {res.generic && (
                  <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                    <button onClick={() => navigate('/fulfillment')} className="btn-primary flex-1 sm:flex-initial sm:w-48 py-3.5 flex items-center justify-center gap-2 text-sm uppercase tracking-widest font-bold"><MapPin className="w-4 h-4" /> Find in Store</button>
                    <button onClick={() => navigate(`/product/${res.branded.id}`)} className="btn-secondary flex-1 sm:flex-initial sm:w-40 py-3.5 flex items-center justify-center gap-2 text-sm uppercase tracking-widest font-bold">View Details</button>
                    <button onClick={() => handleAddToCart(res)} className="btn-secondary flex-1 sm:flex-initial sm:w-48 py-3.5 flex items-center justify-center gap-2 text-sm uppercase tracking-widest font-bold"><Plus className="w-5 h-5" /> Add to Order</button>
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
