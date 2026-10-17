// ============================================================
// Product Page — branded medicine vs its Jan Aushadhi generic
// Side-by-side comparison, honest match explanation, savings,
// add to cart / find a Kendra / share on WhatsApp.
// Only shows clinical information we actually hold.
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Plus, MapPin, Share2, ShieldCheck, Info } from 'lucide-react';
import { getDiscovery } from '../services/api';
import useCartStore from '../store/cartStore';
import { toast } from '../store/toastStore';
import MatchBadge, { MatchNotes } from '../components/discovery/MatchBadge';
import { formatINR, formatRupees } from '../utils/format';
import { monthlyCosts } from '../utils/pack';
import PerDayStepper from '../components/common/PerDayStepper';
import usePageMeta from '../hooks/usePageMeta';

function Row({ label, brand, generic, emphasize = false }) {
  return (
    <tr className="border-t border-outline-variant/60 align-top">
      <th scope="row" className="py-3 pr-3 text-left text-sm font-medium text-on-surface/70 w-24 md:w-40">{label}</th>
      <td className={`py-3 pr-3 text-sm ${emphasize ? 'font-display text-lg md:text-xl font-bold text-on-surface/70' : 'text-on-surface/80'}`}>{brand || '—'}</td>
      <td className={`py-3 text-sm ${emphasize ? 'font-display text-lg md:text-xl font-bold text-primary' : 'text-on-surface font-medium'}`}>{generic || '—'}</td>
    </tr>
  );
}

function InfoCard({ title, children }) {
  return (
    <section className="bg-surface-lowest rounded-2xl ghost-border p-5 md:p-6">
      <h2 className="font-display text-lg font-bold text-on-surface mb-2">{title}</h2>
      <div className="text-on-surface/75 leading-relaxed">{children}</div>
    </section>
  );
}

// What switching is worth over a month and a year at the patient's own dose.
function MonthlyCost({ branded, generic }) {
  const [perDay, setPerDay] = useState(1);
  const costs = monthlyCosts({
    brandPrice: branded.mrp, brandPack: branded.pack_size,
    genericPrice: generic.mrp, genericPack: generic.unit_size, perDay,
  });
  if (!costs || costs.saving <= 0) return null;
  return (
    <div className="mt-5 rounded-xl bg-primary text-white p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
      <div>
        <div className="text-sm text-white/90">If you take this every day</div>
        <div className="font-display text-2xl md:text-3xl font-bold">
          Save {formatRupees(costs.saving)}<span className="text-base font-semibold text-white/90"> /month</span>
        </div>
        <div className="text-sm text-white/90">
          {formatRupees(costs.saving * 12)} a year · {formatRupees(costs.brand)} → {formatRupees(costs.generic)} a month
        </div>
      </div>
      <div className="text-on-surface self-start md:self-auto">
        <PerDayStepper value={perDay} onChange={setPerDay} />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  // Result for the id it was loaded for; loading = no result for the current id yet.
  const [result, setResult] = useState({ id: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    getDiscovery(id)
      .then((res) => { if (!cancelled) setResult({ id, data: res || null, error: res ? null : 'We could not find this medicine.' }); })
      .catch(() => { if (!cancelled) setResult({ id, data: null, error: "We couldn't load this medicine. Please check your connection and try again." }); });
    return () => { cancelled = true; };
  }, [id]);

  const loading = result.id !== id;
  const { data, error } = result;

  const metaBranded = data?.branded;
  const metaGeneric = data?.generic;
  usePageMeta({
    title: metaBranded
      ? `${metaBranded.name}${metaGeneric ? ` vs Jan Aushadhi generic (${formatINR(metaGeneric.mrp)})` : ''}`
      : 'Medicine',
    description: metaBranded
      ? `${metaBranded.name} (${[metaBranded.composition1, metaBranded.composition2].filter(Boolean).join(' + ')}) costs ${formatINR(metaBranded.mrp)}.${metaGeneric ? ` The Jan Aushadhi generic ${metaGeneric.generic_name} costs ${formatINR(metaGeneric.mrp)}.` : ''}`
      : undefined,
    jsonLd: metaBranded && {
      '@context': 'https://schema.org',
      '@type': 'Drug',
      name: metaBranded.name,
      manufacturer: metaBranded.manufacturer ? { '@type': 'Organization', name: metaBranded.manufacturer } : undefined,
      activeIngredient: [metaBranded.composition1, metaBranded.composition2].filter(Boolean).join(', '),
      ...(metaGeneric && data?.match_tier === 'EXACT_MATCH'
        ? { isRelatedTo: { '@type': 'Drug', name: metaGeneric.generic_name, nonProprietaryName: metaGeneric.generic_name } }
        : {}),
    },
  });

  if (loading) return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 space-y-4">
      <div className="h-8 w-2/3 rounded-lg bg-surface-low animate-pulse" />
      <div className="h-72 rounded-2xl bg-surface-low animate-pulse" />
    </div>
  );

  if (error || !data) return (
    <div className="flex-1 flex flex-col items-center justify-center py-32 bg-surface px-6 text-center">
      <AlertTriangle className="w-10 h-10 text-warning mb-4" />
      <h1 className="font-display text-xl font-bold text-on-surface mb-2">Medicine not available</h1>
      <p className="text-on-surface/70 max-w-md mb-6">{error}</p>
      <button onClick={() => navigate('/discovery')} className="btn-secondary px-6 py-2.5 text-sm">Back to search</button>
    </div>
  );

  const { branded, savings } = data;
  // The discovery API returns `generic_name` and a top-level `match_tier`;
  // normalise so the page and cart work with one shape.
  const generic = data.generic
    ? { ...data.generic, name: data.generic.generic_name ?? data.generic.name, match_tier: data.match_tier, match_notes: data.match_notes || [] }
    : null;
  const composition = [branded.composition1, branded.composition2].filter(Boolean).join(' + ');
  // Different strength / release: don't present the price gap as a saving.
  const comparable = generic && generic.match_tier !== 'SALT_EQUIVALENT';
  const showSaving = comparable && savings?.percentage > 0;

  const handleAddToCart = () => {
    addItem({
      drug_code: generic.drug_code, name: generic.name, mrp: generic.mrp,
      branded_name: branded.name, branded_mrp: comparable ? branded.mrp : undefined,
      unit_size: generic.unit_size, group_name: generic.group_name,
    });
    toast.success('Added to cart');
  };

  const shareText = generic
    ? `${branded.name} costs ${formatINR(branded.mrp)}. The Jan Aushadhi generic (${generic.name}) costs ${formatINR(generic.mrp)}${showSaving ? ` — about ${Math.round(savings.percentage)}% less` : ''}. Check here: ${window.location.href}`
    : `${branded.name}: ${window.location.href}`;

  return (
    <div className="flex-1 w-full bg-surface pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface/70 hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <header className="mb-6">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-on-surface leading-tight">{branded.name}</h1>
          <p className="text-on-surface/70 mt-1">{composition || 'Composition not listed'}</p>
        </header>

        {!generic ? (
          <section className="bg-surface-lowest rounded-2xl ghost-border p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-on-surface mb-2">No Jan Aushadhi generic with the same composition yet</h2>
            <p className="text-on-surface/70 leading-relaxed max-w-2xl">
              The Jan Aushadhi range doesn't currently include a medicine with exactly these ingredients and form. A Kendra pharmacist may be able to suggest an alternative that your doctor can approve.
            </p>
            <div className="mt-5 text-on-surface/70">Brand MRP: <span className="font-semibold text-on-surface">{formatINR(branded.mrp)}</span>{branded.pack_size && ` · ${branded.pack_size}`}</div>
            <button onClick={() => navigate('/fulfillment')} className="btn-secondary mt-6 py-2.5 px-5 text-sm inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> Find a Kendra</button>
          </section>
        ) : (
          <section className="bg-surface-lowest rounded-2xl ghost-border clinical-shadow p-5 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <MatchBadge tier={generic.match_tier} />
              {!comparable && <div className="text-sm text-on-surface/70">Price not directly comparable</div>}
              {showSaving && (
                <div className="bg-success-soft text-success font-bold px-3 py-1.5 rounded-lg">
                  Save {formatINR(savings.absolute)} ({Math.round(savings.percentage)}%)
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <td />
                    <th scope="col" className="pb-2 text-left text-sm font-semibold text-on-surface/70">Brand</th>
                    <th scope="col" className="pb-2 text-left text-sm font-semibold text-primary">Jan Aushadhi generic</th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Medicine" brand={branded.name} generic={<span className="font-semibold text-primary">{generic.name}</span>} />
                  <Row label="Price (MRP)" brand={comparable ? <span className="line-through decoration-2">{formatINR(branded.mrp)}</span> : formatINR(branded.mrp)} generic={formatINR(generic.mrp)} emphasize />
                  <Row label="Pack" brand={branded.pack_size} generic={generic.unit_size} />
                  <Row label="Made by" brand={branded.manufacturer} generic="Supplied through PMBI" />
                </tbody>
              </table>
            </div>

            {showSaving && (
              <p className="text-sm text-on-surface/70 mt-3 flex items-start gap-1.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                {savings.basis === 'per_unit'
                  ? `Saving is worked out for the same quantity as one ${branded.pack_size || 'branded pack'}.`
                  : 'Saving compares pack prices; pack sizes may differ.'}
              </p>
            )}

            {comparable && <MonthlyCost branded={branded} generic={generic} />}

            {generic.match_tier !== 'EXACT_MATCH' && (
              <div className={`mt-5 flex gap-3 items-start p-4 rounded-xl border ${generic.match_tier === 'CLOSE_MATCH' ? 'bg-[#e8f0fe] border-[#aecbfa]/70' : 'bg-[#fef7e0] border-[#f9ab00]/60'}`}>
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${generic.match_tier === 'CLOSE_MATCH' ? 'text-[#1a56b0]' : 'text-[#8a4b00]'}`} />
                <MatchNotes tier={generic.match_tier} notes={generic.match_notes} className="text-sm" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button onClick={handleAddToCart} className="btn-primary py-3.5 px-6 text-base font-semibold inline-flex items-center justify-center gap-2 sm:flex-1">
                <Plus className="w-5 h-5" /> Add to cart
              </button>
              <button onClick={() => navigate('/fulfillment')} className="btn-secondary py-3.5 px-5 text-base font-semibold inline-flex items-center justify-center gap-2">
                <MapPin className="w-5 h-5" /> Find a Kendra
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary py-3.5 px-5 text-base font-semibold inline-flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" /> Share on WhatsApp
              </a>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {generic?.indications && <InfoCard title="Used for">{generic.indications}</InfoCard>}
          {generic?.side_effects && <InfoCard title="Side effects & precautions">{generic.side_effects}</InfoCard>}
          {generic?.storage_info && <InfoCard title="Storage">{generic.storage_info}</InfoCard>}
          {generic?.group_name && <InfoCard title="Medicine group">{generic.group_name}</InfoCard>}
          <InfoCard title="Before you switch">
            Check that the strength and form match your prescription, and keep taking your medicine exactly as prescribed. Ask your doctor or the Kendra pharmacist if you are unsure.
          </InfoCard>
          {generic && (
            <InfoCard title="Quality">
              <span className="flex items-start gap-2"><ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                Jan Aushadhi medicines come from WHO-GMP certified suppliers and each batch is tested at NABL-accredited labs.
              </span>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  );
}
