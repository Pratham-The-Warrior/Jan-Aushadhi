// ============================================================
// useDebounce — Generic debounce hook
// Returns a debounced version of the value that only updates
// after the specified delay.
// ============================================================

import { useState, useEffect } from 'react';

/**
 * Debounce a rapidly-changing value.
 *
 * @param {T}      value   - Value to debounce
 * @param {number} delay   - Debounce delay in milliseconds
 * @returns {T} Debounced value
 *
 * @example
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 250);
 */
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
