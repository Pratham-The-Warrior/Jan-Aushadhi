// ============================================================
// useInView — Intersection Observer hook for scroll-reveal animations
// Returns a ref and boolean indicating if the element is in the viewport
// ============================================================

import { useRef, useState, useEffect } from 'react';

/**
 * @param {Object} options
 * @param {number} options.threshold — visibility ratio to trigger (default 0.15)
 * @param {string} options.rootMargin — margin around root (default '0px 0px -60px 0px')
 * @param {boolean} options.triggerOnce — only trigger once (default true)
 */
export default function useInView({
  threshold = 0.15,
  rootMargin = '0px 0px -60px 0px',
  triggerOnce = true,
} = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) observer.unobserve(element);
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isInView];
}
