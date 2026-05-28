// ============================================================
// useClickOutside — Detects clicks outside a ref'd element
// ============================================================

import { useEffect } from 'react';

/**
 * Calls `handler` when a click occurs outside the given ref.
 *
 * @param {React.RefObject} ref       - Ref to the target element
 * @param {function}        handler   - Callback on outside click
 * @param {boolean}         [enabled] - Whether the hook is active
 *
 * @example
 * const dropdownRef = useRef(null);
 * useClickOutside(dropdownRef, () => setOpen(false));
 */
export default function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}
