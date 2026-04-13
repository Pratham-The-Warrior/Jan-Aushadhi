// ============================================================
// useSearch — Encapsulates medicine search + suggestion logic
// Extracts ~80 lines of inline logic from Discovery.jsx
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchMedicines, suggestMedicines } from '../services/api';
import useCartStore from '../store/cartStore';
import useDebounce from './useDebounce';

/**
 * Manages full-text medicine search and live autocomplete suggestions.
 *
 * @returns {object} Search state and actions
 *
 * @example
 * const { query, setQuery, results, suggestions, doSearch, ... } = useSearch();
 */
export default function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const abortRef = useRef(null);
  const debouncedQuery = useDebounce(query, 250);

  // Recent searches from cart store
  const recentSearches = useCartStore((s) => s.recentSearches);
  const addRecentSearch = useCartStore((s) => s.addRecentSearch);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();

    if (debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }

    setSuggestLoading(true);
    setActiveIndex(-1);

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const data = await suggestMedicines(debouncedQuery);
        if (!controller.signal.aborted) {
          setSuggestions(data || []);
          setSuggestLoading(false);
          setShowDropdown(true);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  // Start loading indicator as user types
  useEffect(() => {
    if (query.trim().length >= 2) {
      setSuggestLoading(true);
    }
  }, [query]);

  /**
   * Execute a full search against the backend.
   * @param {string} [searchQuery] - Override query (used by suggestion selection)
   */
  const doSearch = useCallback(
    async (searchQuery) => {
      const q = searchQuery || query;
      if (!q.trim()) return;

      setLoading(true);
      setSearched(true);
      setShowDropdown(false);
      setSuggestions([]);
      addRecentSearch(q.trim());

      try {
        const data = await searchMedicines(q);
        setResults(data || []);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      }

      setLoading(false);
    },
    [query, addRecentSearch],
  );

  /**
   * Handle keyboard navigation in the suggestion dropdown.
   */
  const handleKeyDown = useCallback(
    (e) => {
      const hasSuggestions = suggestions.length > 0;
      const hasRecent = recentSearches.length > 0 && query.trim().length < 2;
      const listLen = hasSuggestions ? suggestions.length : hasRecent ? recentSearches.length : 0;

      if (listLen === 0) {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSearch();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setShowDropdown(true);
          setActiveIndex((prev) => (prev + 1) % listLen);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + listLen) % listLen);
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && hasSuggestions) {
            const selected = suggestions[activeIndex];
            setQuery(selected.name);
            doSearch(selected.name);
          } else if (activeIndex >= 0 && hasRecent) {
            const selected = recentSearches[activeIndex];
            setQuery(selected);
            doSearch(selected);
          } else {
            doSearch();
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          setActiveIndex(-1);
          break;
      }
    },
    [suggestions, recentSearches, query, activeIndex, doSearch],
  );

  /** Clear the search state */
  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
  }, []);

  /** Select a suggestion from the dropdown */
  const selectSuggestion = useCallback(
    (name) => {
      setQuery(name);
      doSearch(name);
    },
    [doSearch],
  );

  return {
    // State
    query,
    setQuery,
    results,
    loading,
    searched,
    suggestions,
    suggestLoading,
    showDropdown,
    setShowDropdown,
    activeIndex,
    setActiveIndex,
    recentSearches,

    // Actions
    doSearch,
    handleKeyDown,
    clearSearch,
    selectSuggestion,
  };
}
