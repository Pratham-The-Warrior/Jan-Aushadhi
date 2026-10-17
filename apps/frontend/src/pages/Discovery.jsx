// ============================================================
// Discovery Page — Medicine Search + Generic Matching
// Refactored: uses useSearch hook, extracted components
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, Sparkles, Clock, X, Pill, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useCartStore from '../store/cartStore';
import useSearch from '../hooks/useSearch';
import useClickOutside from '../hooks/useClickOutside';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import { MatchedResultRow, UnmatchedResultRow } from '../components/discovery/ResultRow';
import FilterSortPanel from '../components/discovery/FilterSortPanel';
import { applyFiltersAndSort } from '../utils/filterUtils';
import { toast } from '../store/toastStore';

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
  const addItem = useCartStore((s) => s.addItem);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const {
    query, setQuery, results, loading, searched, error,
    suggestions, suggestLoading, showDropdown, setShowDropdown,
    activeIndex, setActiveIndex, recentSearches,
    doSearch, handleKeyDown, clearSearch, selectSuggestion,
  } = useSearch();

  // Deep links: /discovery?q=telma (used by the home page search box and shared links)
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q');
  useEffect(() => {
    if (urlQuery) {
      setQuery(urlQuery);
      doSearch(urlQuery);
    }
    // Run only when the URL query changes, not when doSearch's identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  // Filter & sort state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ sortKey: 'relevance', savingsRange: 'all', matchFilter: 'matched' });

  // Counts for quick tabs
  const matchedCount = results.filter((r) => Boolean(r.generic)).length;

  // Apply filters + sort to results
  const displayResults = applyFiltersAndSort(results, filters);
  const activeFilterCount = [
    filters.sortKey !== 'relevance',
    filters.savingsRange !== 'all',
    filters.matchFilter !== 'matched',
  ].filter(Boolean).length;

  useClickOutside(searchRef, () => setShowDropdown(false));

  const handleAddToCart = (res) => {
    if (!res.generic) return;
    addItem({
      drug_code: res.generic.drug_code, name: res.generic.name, mrp: res.generic.mrp,
      branded_name: res.branded.name,
      // Only like-for-like matches count towards "you save" in the cart
      branded_mrp: res.generic.match_tier === 'SALT_EQUIVALENT' ? undefined : res.branded.mrp,
      unit_size: res.generic.unit_size, group_name: res.generic.group_name,
    });
    toast.success(`Added ${res.generic.name} to cart`);
  };

  const hasSuggestions = suggestions.length > 0;
  const showRecentInDropdown = !hasSuggestions && query.trim().length < 2 && recentSearches.length > 0;
  const dropdownVisible = showDropdown && (hasSuggestions || showRecentInDropdown || suggestLoading);

  return (
    <div className="flex-1 w-full bg-surface pb-20">
      <FilterSortPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />
      {/* Search Header */}
      <div className={`bg-surface-low w-full px-4 border-b border-outline-variant ${searched ? 'py-8' : 'py-12 md:py-16'}`}>
        <div className="max-w-4xl mx-auto text-center">
          {!searched && (
            <>
              <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-on-surface mb-3">
                Find the <span className="text-primary">generic for your medicine</span>
              </h1>
              <p className="text-on-surface/70 mb-8 max-w-2xl mx-auto text-lg leading-[1.6]">
                Type the brand name on your strip or prescription. We'll show the Jan Aushadhi generic with the same salt and strength.
              </p>
            </>
          )}

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
                  placeholder="Type a brand name, e.g. Telma 40"
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
                      <div className="text-xs font-bold text-on-surface/50 flex items-center gap-2">
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
                          <div className="text-xs text-on-surface/55 mt-0.5 truncate">
                            {s.composition || s.manufacturer}
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
                      <div className="text-xs font-bold text-on-surface/50 flex items-center gap-2">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="space-y-8">
          {!searched && !loading && (
            <div className="animate-fadeIn">
              <h2 className="font-display text-xl font-bold text-on-surface mb-1">Popular searches</h2>
              <p className="text-sm text-on-surface/60 mb-5">Common medicines people switch to Jan Aushadhi generics</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { query: 'Dolo 650', name: 'Dolo 650', desc: 'Fever & pain' },
                  { query: 'Telma 40', name: 'Telma 40', desc: 'Blood pressure' },
                  { query: 'Glycomet', name: 'Glycomet', desc: 'Diabetes' },
                  { query: 'Pan 40', name: 'Pan 40', desc: 'Acidity' },
                ].map((item) => (
                  <button
                    key={item.query}
                    onClick={() => { setQuery(item.query); doSearch(item.query); }}
                    className="text-left p-4 rounded-xl bg-surface-lowest ghost-border hover:border-primary/40 hover:shadow-sm transition-all group"
                  >
                    <div className="font-display font-bold text-on-surface group-hover:text-primary transition-colors">{item.name}</div>
                    <div className="text-sm text-on-surface/55">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && <SkeletonCard count={3} />}

          <AnimatePresence>
            {!loading && searched && error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={<Search className="w-10 h-10 text-on-surface/20" />}
                  title="Search is temporarily unavailable"
                  description="We couldn't reach the medicine database. Please check your connection and try again in a moment."
                  action={<button onClick={() => doSearch(query)} className="btn-secondary py-2.5 px-5 text-sm">Try again</button>}
                />
              </motion.div>
            )}

            {!loading && searched && !error && results.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={<Search className="w-10 h-10 text-on-surface/20" />}
                  title={`No medicines found for "${query}"`}
                  description="Check the spelling, or search by the salt name printed on the strip (for example, Paracetamol)."
                  action={<button onClick={() => { clearSearch(); inputRef.current?.focus(); }} className="btn-secondary py-2.5 px-5 text-sm">Clear search</button>}
                />
              </motion.div>
            )}

            {!loading && results.length > 0 && (
              <div>
                {/* Result toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
                  <div>
                    <h2 className="font-display text-xl font-bold text-on-surface">Results for &quot;{query}&quot;</h2>
                    <p className="text-sm text-on-surface/60">{matchedCount} of {results.length} brands have a Jan Aushadhi generic</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-surface-low p-1 rounded-lg border border-outline-variant/50" role="tablist">
                      {[
                        { key: 'matched', label: 'With generic', count: matchedCount },
                        { key: 'all', label: 'All brands', count: results.length },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          role="tab"
                          aria-selected={filters.matchFilter === tab.key}
                          onClick={() => setFilters((f) => ({ ...f, matchFilter: tab.key }))}
                          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                            filters.matchFilter === tab.key ? 'bg-surface-lowest text-primary shadow-sm' : 'text-on-surface/60 hover:text-on-surface'
                          }`}
                        >
                          {tab.label} <span className="text-on-surface/40 font-medium">{tab.count}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setFilterOpen(true)}
                      className={`btn-secondary py-2 px-3 text-sm font-semibold inline-flex items-center gap-1.5 ${activeFilterCount > 0 ? 'border-primary text-primary' : ''}`}
                    >
                      <SlidersHorizontal className="w-4 h-4" /> Sort{activeFilterCount > 0 && ` (${activeFilterCount})`}
                    </button>
                  </div>
                </div>

                {matchedCount === 0 && (
                  <div className="p-4 bg-warning-soft border border-warning/30 rounded-xl mb-5 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                    <p className="text-sm text-on-surface/80">
                      None of these brands has a Jan Aushadhi generic with the same composition yet. A Kendra pharmacist may suggest an alternative your doctor can approve.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {displayResults.length === 0 ? (
                    <div className="py-10 text-center bg-surface-lowest rounded-xl ghost-border">
                      <p className="text-on-surface/60">No results match these filters.</p>
                      <button
                        onClick={() => setFilters({ sortKey: 'relevance', savingsRange: 'all', matchFilter: 'all' })}
                        className="text-primary font-semibold text-sm mt-2 hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    displayResults.map((res) => (
                      res.generic
                        ? <MatchedResultRow key={res.id} res={res} onAdd={handleAddToCart} />
                        : <UnmatchedResultRow key={res.id} res={res} onSearchSalt={(salt) => { setQuery(salt); doSearch(salt); }} />
                    ))
                  )}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
