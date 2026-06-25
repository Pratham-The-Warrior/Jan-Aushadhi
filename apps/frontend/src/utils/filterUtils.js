export function applyFiltersAndSort(results, { sortKey, savingsRange }) {
  let filtered = [...results];

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

  // Sort
  if (sortKey) {
    filtered.sort((a, b) => {
      if (sortKey === 'savings_desc') return (b.savings?.percentage ?? 0) - (a.savings?.percentage ?? 0);
      if (sortKey === 'savings_asc') return (a.savings?.percentage ?? 0) - (b.savings?.percentage ?? 0);
      if (sortKey === 'price_asc') return (a.generic?.mrp ?? 0) - (b.generic?.mrp ?? 0);
      if (sortKey === 'price_desc') return (b.generic?.mrp ?? 0) - (a.generic?.mrp ?? 0);
      if (sortKey === 'name_asc') return a.branded.name.localeCompare(b.branded.name);
      return 0;
    });
  }

  return filtered;
}
