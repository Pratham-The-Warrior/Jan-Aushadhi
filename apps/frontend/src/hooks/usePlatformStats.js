// ============================================================
// usePlatformStats — live platform counts for marketing pages
// Returns null until loaded (or if the API is unreachable), so
// callers can hide numbers rather than show invented ones.
// ============================================================

import { useEffect, useState } from 'react';
import { getPlatformStats } from '../services/api';

export default function usePlatformStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPlatformStats()
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return stats;
}
