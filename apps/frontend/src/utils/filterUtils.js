export function applyFiltersAndSort(results, { sortKey, savingsRange, matchFilter = 'matched' } = {}) {
  let filtered = [...results];

  // If the user chooses 'matched', only show results with a Jan Aushadhi generic equivalent.
  // Exception: if there are NO matched results at all, fall back to showing all so the user
  // doesn't see a blank screen when searching for rare commercial drugs.
  const hasAnyMatch = results.some((r) => Boolean(r.generic));
  if (matchFilter === 'matched' && hasAnyMatch) {
    filtered = filtered.filter((r) => Boolean(r.generic));
  } else if (matchFilter === 'unmatched') {
    filtered = filtered.filter((r) => !r.generic);
  }

  // Filter by savings %
  if (savingsRange && savingsRange !== 'all') {
    filtered = filtered.filter((r) => {
      const pct = r.savings?.percentage ?? 0;
      if (savingsRange === 'low') return pct < 50;
      if (savingsRange === 'mid') return pct >= 50 && pct <= 75;
      if (savingsRange === 'high') return pct > 75 && pct <= 90;
      if (savingsRange === 'very_high') return pct > 90;
      return true;
    });
  }

  // Sort: always prioritize items with generics first, then apply sortKey
  filtered.sort((a, b) => {
    // Primary sort: Items with generic match always precede unmatched items
    if (a.generic && !b.generic) return -1;
    if (!a.generic && b.generic) return 1;

    if (sortKey === 'savings_desc') return (b.savings?.percentage ?? 0) - (a.savings?.percentage ?? 0);
    if (sortKey === 'savings_asc') return (a.savings?.percentage ?? 0) - (b.savings?.percentage ?? 0);
    if (sortKey === 'price_asc') return (a.generic?.mrp ?? 0) - (b.generic?.mrp ?? 0);
    if (sortKey === 'price_desc') return (b.generic?.mrp ?? 0) - (a.generic?.mrp ?? 0);
    if (sortKey === 'name_asc') return (a.branded?.name || '').localeCompare(b.branded?.name || '');
    return 0;
  });

  return filtered;
}
