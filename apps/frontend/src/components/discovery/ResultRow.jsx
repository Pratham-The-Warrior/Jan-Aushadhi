// ============================================================
// ResultRow — one search result: branded medicine → PMBJP generic
// Compact enough to show 6–8 results per screen; the whole row
// opens the product page, "Add" puts the generic in the cart.
// ============================================================

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, ChevronRight, Search } from 'lucide-react';
import MatchBadge, { MatchNotes } from './MatchBadge';
import { formatINR } from '../../utils/format';

function composition(branded) {
  return [branded.composition1, branded.composition2].filter(Boolean).join(' + ');
}

export function MatchedResultRow({ res, onAdd }) {
  const navigate = useNavigate();
  const { branded, generic, savings } = res;
  const open = () => navigate(`/product/${branded.id}`);
  // Different strength / release: a price difference is not a like-for-like saving.
  const comparable = generic.match_tier !== 'SALT_EQUIVALENT';

  return (
    <article
      onClick={open}
      className="group bg-surface-lowest rounded-xl ghost-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer p-4 md:p-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)_auto] gap-3 md:gap-6 md:items-center">
        {/* Branded */}
        <div className="min-w-0">
          <div className="text-xs text-on-surface/50 mb-0.5">Brand you searched</div>
          <h3 className="font-display font-bold text-on-surface leading-snug">{branded.name}</h3>
          <div className="text-sm text-on-surface/55 truncate">{branded.manufacturer}</div>
          <div className="text-sm text-on-surface/70 mt-1">
            MRP <span className="font-semibold">{formatINR(branded.mrp)}</span>
            {branded.pack_size && <span className="text-on-surface/50"> · {branded.pack_size}</span>}
          </div>
        </div>

        <ArrowRight className="hidden md:block w-5 h-5 text-primary/50" aria-hidden />

        {/* Generic */}
        <div className="min-w-0 border-t md:border-t-0 border-outline-variant/50 pt-3 md:pt-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs text-on-surface/50">Jan Aushadhi generic</span>
            <MatchBadge tier={generic.match_tier} />
          </div>
          <div className="font-display font-bold text-primary leading-snug">{generic.name}</div>
          <div className="text-sm text-on-surface/60 mt-1">
            <span className="font-semibold text-on-surface">{formatINR(generic.mrp)}</span>
            {generic.unit_size && <span> · {generic.unit_size}</span>}
          </div>
          {composition(branded) && <div className="text-xs text-on-surface/45 mt-1 truncate">{composition(branded)}</div>}
        </div>

        {/* Savings + actions */}
        <div className="flex md:flex-col items-center md:items-end justify-between gap-3">
          {!comparable ? (
            <div className="text-sm text-on-surface/55 md:text-right">Price not comparable</div>
          ) : savings?.percentage > 0 ? (
            <div className="md:text-right">
              <div className="inline-block bg-success-soft text-success font-bold text-sm px-2.5 py-1 rounded-md">Save {Math.round(savings.percentage)}%</div>
              <div className="text-xs text-on-surface/50 mt-1">{formatINR(savings.absolute)} less</div>
            </div>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(res); }}
              className="btn-primary py-2 px-4 text-sm font-semibold inline-flex items-center gap-1.5"
              aria-label={`Add ${generic.name} to cart`}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
            <ChevronRight className="hidden md:block w-5 h-5 text-on-surface/30 group-hover:text-primary transition-colors" aria-hidden />
          </div>
        </div>
      </div>

      {generic.match_tier !== 'EXACT_MATCH' && (
        <MatchNotes tier={generic.match_tier} notes={generic.match_notes} className="mt-3 pt-3 border-t border-outline-variant/40" />
      )}
    </article>
  );
}

export function UnmatchedResultRow({ res, onSearchSalt }) {
  const { branded } = res;
  const salt = branded.composition1?.split(/[\s(]/)[0];

  return (
    <article className="bg-surface-lowest rounded-xl ghost-border p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-on-surface leading-snug">{branded.name}</h3>
        <div className="text-sm text-on-surface/55">{branded.manufacturer} · MRP {formatINR(branded.mrp)}</div>
        {composition(branded) && <div className="text-xs text-on-surface/45 mt-1">{composition(branded)}</div>}
        <div className="text-sm text-[#8a4b00] mt-2">No Jan Aushadhi generic with the same composition yet. Ask the pharmacist at a Kendra.</div>
      </div>
      {salt && (
        <button onClick={() => onSearchSalt(salt)} className="btn-secondary py-2 px-4 text-sm font-semibold inline-flex items-center gap-1.5 w-fit">
          <Search className="w-4 h-4" /> Search {salt}
        </button>
      )}
    </article>
  );
}
