// ============================================================
// Prescription Check — whole-prescription savings calculator
// Patients on long-term treatment take several medicines. Enter
// them all (one by one or pasted as a list), confirm each match,
// set tablets per day, and see the monthly and yearly saving.
// The list is kept in this browser so it survives a refresh.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShoppingCart, Share2, MapPin, ClipboardList, Loader2, AlertTriangle } from 'lucide-react';
import { searchMedicines } from '../services/api';
import useCartStore from '../store/cartStore';
import { toast } from '../store/toastStore';
import usePageMeta from '../hooks/usePageMeta';
import MatchBadge from '../components/discovery/MatchBadge';
import { formatINR, formatRupees } from '../utils/format';
import { cartItemFor, monthlyCosts } from '../utils/pack';
import PerDayStepper from '../components/common/PerDayStepper';

const STORAGE_KEY = 'janaushadhi-prescription';
const EXAMPLE = 'Telma 40, Glycomet 500, Atorva 10';

let nextId = 1;

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/** Prefer the first result with a like-for-like generic; else the top result. */
function pickBest(results) {
  const idx = results.findIndex((r) => r.generic && r.generic.match_tier !== 'SALT_EQUIVALENT');
  return idx >= 0 ? idx : 0;
}

/** Monthly figures for one line, or null when it can't be costed like-for-like. */
function lineCosts(line) {
  const res = line.results?.[line.chosen];
  if (!res?.generic || res.generic.match_tier === 'SALT_EQUIVALENT') return null;
  return monthlyCosts({
    brandPrice: res.branded.mrp,
    brandPack: res.branded.pack_size,
    genericPrice: res.generic.mrp,
    genericPack: res.generic.unit_size,
    perDay: line.perDay,
  });
}

function LineRow({ line, onChange, onRemove }) {
  const res = line.results?.[line.chosen];
  const costs = lineCosts(line);

  return (
    <li className="bg-surface-lowest rounded-xl ghost-border p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-on-surface/70">You searched “{line.query}”</div>
          {line.status === 'loading' && (
            <div className="flex items-center gap-2 text-on-surface/70 mt-2"><Loader2 className="w-4 h-4 animate-spin" /> Finding the generic…</div>
          )}
          {line.status === 'error' && (
            <div className="text-sm text-red-700 mt-2">Couldn't search right now. Remove it and try again.</div>
          )}
          {line.status === 'none' && (
            <div className="text-sm text-on-surface/70 mt-2">No medicine found with this name. Check the spelling on the strip.</div>
          )}
          {res && (
            <>
              {line.results.length > 1 ? (
                <label className="block mt-1">
                  <span className="sr-only">Choose the exact brand</span>
                  <select
                    value={line.chosen}
                    onChange={(e) => onChange({ chosen: Number(e.target.value) })}
                    className="w-full max-w-md font-display font-bold text-on-surface bg-transparent border-b border-dashed border-outline-variant py-1 pr-6 focus:outline-none focus:border-primary"
                  >
                    {line.results.slice(0, 8).map((r, i) => (
                      <option key={r.id} value={i}>{r.branded.name} — {formatINR(r.branded.mrp)}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="font-display font-bold text-on-surface mt-1">{res.branded.name}</div>
              )}
              <div className="text-xs text-on-surface/70 mt-1">
                {[res.branded.composition1, res.branded.composition2].filter(Boolean).join(' + ')}
              </div>
            </>
          )}
        </div>
        <button onClick={onRemove} className="p-2 -m-1 text-on-surface/70 hover:text-red-700" aria-label={`Remove ${line.query}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {res && (
        <div className="mt-4 pt-4 border-t border-outline-variant/60 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:items-center">
          <div className="min-w-0">
            {res.generic ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-on-surface/70">Jan Aushadhi generic</span>
                  <MatchBadge tier={res.generic.match_tier} />
                </div>
                <div className="font-semibold text-primary leading-snug mt-0.5">{res.generic.name}</div>
              </>
            ) : (
              <div className="text-sm text-[#8a4b00]">No Jan Aushadhi generic with this composition yet — not included in the total.</div>
            )}
            {res.generic?.match_tier === 'SALT_EQUIVALENT' && (
              <div className="text-sm text-[#8a4b00] mt-1 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Different strength or release — ask your doctor. Not included in the total.
              </div>
            )}
          </div>

          {costs ? (
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <PerDayStepper value={line.perDay} onChange={(perDay) => onChange({ perDay })} />
              <div className="text-right">
                <div className="text-sm text-on-surface/70"><span className="line-through">{formatRupees(costs.brand)}</span> → <span className="font-semibold text-on-surface">{formatRupees(costs.generic)}</span> /month</div>
                <div className="text-sm font-bold text-success">Save {formatRupees(costs.saving)} a month</div>
              </div>
            </div>
          ) : res.generic && res.generic.match_tier !== 'SALT_EQUIVALENT' ? (
            <div className="text-sm text-on-surface/70 md:text-right">
              Per pack: <span className="line-through">{formatINR(res.branded.mrp)}</span> → <span className="font-semibold text-on-surface">{formatINR(res.generic.mrp)}</span>
              <div className="text-xs">Monthly estimate not available for this pack type</div>
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}

export default function Prescription() {
  usePageMeta({
    title: 'Check your whole prescription',
    description: 'Add every medicine on your prescription and see the Jan Aushadhi generics and how much you save each month and year.',
  });
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const inputRef = useRef(null);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState(() => loadSaved().map((l) => ({ ...l, id: nextId++, results: [], status: 'loading' })));

  const update = (id, patch) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  async function runSearch(id, query, brandId) {
    try {
      const results = await searchMedicines(query);
      if (!results?.length) return update(id, { status: 'none', results: [] });
      const saved = brandId ? results.findIndex((r) => r.id === brandId) : -1;
      update(id, { status: 'ok', results, chosen: saved >= 0 ? saved : pickBest(results) });
    } catch {
      update(id, { status: 'error' });
    }
  }

  // Re-run searches for a restored list, once.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    lines.forEach((l) => runSearch(l.id, l.query, l.brandId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the list across visits (queries, chosen brand and dose only).
  useEffect(() => {
    try {
      const minimal = lines.map((l) => ({ query: l.query, perDay: l.perDay, brandId: l.results?.[l.chosen]?.id }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch { /* storage unavailable: list just won't persist */ }
  }, [lines]);

  const addQueries = (raw) => {
    const queries = raw.split(/[\n,;]+/).map((q) => q.trim()).filter((q) => q.length >= 2);
    if (!queries.length) return;
    const fresh = queries.map((query) => ({ id: nextId++, query, perDay: 1, chosen: 0, results: [], status: 'loading' }));
    setLines((ls) => [...ls, ...fresh]);
    fresh.forEach((l) => runSearch(l.id, l.query));
    setInput('');
    inputRef.current?.focus();
  };

  const costed = lines.map(lineCosts).filter(Boolean);
  const totals = costed.reduce((t, c) => ({ brand: t.brand + c.brand, generic: t.generic + c.generic, saving: t.saving + c.saving }), { brand: 0, generic: 0, saving: 0 });
  const substitutable = lines
    .map((l) => l.results?.[l.chosen])
    .filter((r) => r?.generic && r.generic.match_tier !== 'SALT_EQUIVALENT');

  const addAllToCart = () => {
    substitutable.forEach((r) => addItem(cartItemFor(r.branded, r.generic)));
    toast.success(`Added ${substitutable.length} generic${substitutable.length === 1 ? '' : 's'} to cart`);
    navigate('/checkout');
  };

  const shareText = [
    'My medicines with Jan Aushadhi generics:',
    ...lines.map((l) => {
      const r = l.results?.[l.chosen];
      if (!r) return null;
      return r.generic && r.generic.match_tier !== 'SALT_EQUIVALENT'
        ? `• ${r.branded.name} → ${r.generic.name} (${formatINR(r.generic.mrp)})`
        : `• ${r.branded.name} → no direct generic`;
    }).filter(Boolean),
    totals.saving > 0 ? `Saving about ${formatRupees(totals.saving)} a month (${formatRupees(totals.saving * 12)} a year).` : null,
    window.location.origin + '/prescription',
  ].filter(Boolean).join('\n');

  return (
    <div className="flex-1 w-full bg-surface pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <header className="max-w-2xl mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Check your whole prescription</h1>
          <p className="text-on-surface/70 text-lg mt-2">
            Add every medicine you take. We'll find each Jan Aushadhi generic and show what you save in a month and a year.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
          <section aria-label="Your medicines">
            <form
              onSubmit={(e) => { e.preventDefault(); addQueries(input); }}
              className="flex items-center bg-surface-lowest rounded-xl ghost-border clinical-shadow p-1.5 focus-within:border-primary/50"
            >
              <label htmlFor="rx-input" className="sr-only">Medicine name</label>
              <input
                id="rx-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Medicine name — or paste a list separated by commas"
                className="flex-1 min-w-0 py-3 px-3 bg-transparent outline-none text-base text-on-surface placeholder-on-surface/60"
                autoComplete="off"
              />
              <button type="submit" className="btn-primary py-3 px-5 text-base font-semibold inline-flex items-center gap-1.5 shrink-0">
                <Plus className="w-5 h-5" /> Add
              </button>
            </form>

            {lines.length === 0 ? (
              <div className="mt-6 bg-surface-lowest rounded-xl ghost-border p-8 text-center">
                <ClipboardList className="w-10 h-10 text-primary mx-auto mb-3" aria-hidden="true" />
                <p className="font-semibold text-on-surface">Your list is empty</p>
                <p className="text-sm text-on-surface/70 mt-1 mb-4">Type the brand names exactly as they appear on your strips or prescription.</p>
                <button onClick={() => addQueries(EXAMPLE)} className="btn-secondary py-2.5 px-4 text-sm">Try an example: {EXAMPLE}</button>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {lines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    onChange={(patch) => update(line.id, patch)}
                    onRemove={() => setLines((ls) => ls.filter((l) => l.id !== line.id))}
                  />
                ))}
              </ul>
            )}
          </section>

          <aside className="lg:sticky lg:top-28" aria-label="Savings summary">
            <div className="bg-primary text-white rounded-2xl p-6">
              <div className="text-white/90 text-sm">You could save</div>
              <div className="font-display text-4xl font-bold mt-1">{formatRupees(totals.saving)}<span className="text-lg font-semibold text-white/90"> /month</span></div>
              <div className="text-white/90 mt-1">That's <span className="font-bold text-white">{formatRupees(totals.saving * 12)}</span> a year.</div>
              <dl className="mt-5 pt-4 border-t border-white/20 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-white/90">Brands, per month</dt><dd className="font-semibold">{formatRupees(totals.brand)}</dd></div>
                <div className="flex justify-between"><dt className="text-white/90">Jan Aushadhi, per month</dt><dd className="font-semibold">{formatRupees(totals.generic)}</dd></div>
                <div className="flex justify-between"><dt className="text-white/90">Medicines counted</dt><dd className="font-semibold">{costed.length} of {lines.length}</dd></div>
              </dl>
            </div>

            <div className="mt-4 space-y-2">
              <button onClick={addAllToCart} disabled={!substitutable.length} className="w-full btn-primary py-3.5 text-base font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                <ShoppingCart className="w-5 h-5" /> Add {substitutable.length || ''} generic{substitutable.length === 1 ? '' : 's'} to cart
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!lines.length}
                className={`w-full btn-secondary py-3 text-base font-semibold inline-flex items-center justify-center gap-2 ${lines.length ? '' : 'pointer-events-none opacity-50'}`}
              >
                <Share2 className="w-5 h-5" /> Share with family on WhatsApp
              </a>
              <Link to="/fulfillment" className="w-full btn-secondary py-3 text-base font-semibold inline-flex items-center justify-center gap-2">
                <MapPin className="w-5 h-5" /> Find a Kendra near you
              </Link>
              {lines.length > 0 && (
                <button onClick={() => setLines([])} className="w-full py-2 text-sm font-semibold text-on-surface/70 hover:text-red-700">Clear list</button>
              )}
            </div>
            <p className="text-xs text-on-surface/70 mt-4 leading-relaxed">
              Monthly figures assume 30 days at the doses you set, using the price per tablet from MRPs. Medicines with a different strength or no generic aren't counted. Always check with your doctor before switching.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
