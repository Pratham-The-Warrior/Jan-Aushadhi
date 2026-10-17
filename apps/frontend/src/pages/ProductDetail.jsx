// ============================================================
// Product Clinical Detail Page
// Deep-dive specs: Indications, Administration, Warnings,
// Pharmacokinetics, PMBJP quality assurances (WHO-GMP, NABL)
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Pill, Beaker, ThermometerSun, Clock, ArrowLeft, Plus, Heart, Info, ClipboardList } from 'lucide-react';
import { getDiscovery } from '../services/api';
import useCartStore from '../store/cartStore';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore(s => s.addItem);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getDiscovery(id);
        if (res) setData(res);
        else setError('Product not found in our database.');
      } catch (err) {
        console.error(err);
        setError('Failed to fetch product data. The medical catalog service might be unreachable.');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center py-40 bg-surface">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
      <div className="text-on-surface/50 font-bold text-xs uppercase tracking-widest">Retrieving Clinical Data...</div>
    </div>
  );

  if (error || !data) return (
    <div className="flex-1 flex flex-col items-center justify-center py-40 bg-surface px-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="font-display font-bold text-on-surface mb-2">Catalog Sync Error</h2>
      <p className="text-on-surface/60 max-w-md mx-auto mb-8">{error || 'Unable to load product specs.'}</p>
      <button onClick={() => navigate(-1)} className="btn-secondary px-8 py-3 uppercase tracking-widest text-xs font-bold">Return to Search</button>
    </div>
  );

  const { branded, savings } = data;
  // The discovery API returns `generic_name` and a top-level `match_tier`;
  // normalise so the page and cart work with one shape.
  const generic = data.generic
    ? { ...data.generic, name: data.generic.generic_name ?? data.generic.name, match_tier: data.match_tier }
    : null;
  const isExact = generic?.match_tier === 'EXACT_MATCH';
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'clinical', label: 'Clinical Details' },
    { key: 'warnings', label: 'Safety' },
  ];

  const handleAddToCart = () => {
    if (!generic) return;
    addItem({
      drug_code: generic.drug_code,
      name: generic.name,
      mrp: generic.mrp,
      branded_name: branded.name,
      branded_mrp: branded.mrp,
      unit_size: generic.unit_size,
      group_name: generic.group_name
    });
  };

  return (
    <div className="flex-1 w-full bg-surface pb-24 md:pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Back button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-on-surface/60 hover:text-primary mb-8 font-semibold transition-colors uppercase tracking-widest text-[10px]">
          <ArrowLeft className="w-4 h-4" /> Back to Discover
        </button>

        {/* Header Card */}
        <div className="bg-surface-lowest rounded-lg ghost-border clinical-shadow overflow-hidden mb-12 animate-slideUp">
          <div className="flex flex-col md:flex-row">
            {/* Left - Branded (The Reference) */}
            <div className="w-full md:w-5/12 p-8 bg-surface-low border-r border-outline-variant/30">
              <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-4 flex items-center gap-2"><Beaker className="w-3.5 h-3.5" /> Branded Reference</div>
              <h1 className="font-display text-3xl font-bold text-on-surface mb-2">{branded.name}</h1>
              <div className="text-sm text-on-surface/60 mb-8 font-medium">{branded.manufacturer}</div>
              <div className="bg-surface-lowest ghost-border p-6 rounded-md mb-8 shadow-inner">
                <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-2">Market Price</div>
                <div className="font-display text-4xl font-bold text-on-surface">₹{(branded.mrp || 0).toFixed(2)}</div>
                <div className="text-[10px] text-on-surface/50 mt-2 uppercase tracking-widest font-bold">Standard Pack Price</div>
              </div>
              <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-4 flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Formulation</div>
              <div className="space-y-3">
                {branded.composition1 && <div className="bg-surface-lowest border border-outline-variant/50 px-4 py-3 rounded text-sm font-semibold text-on-surface/80">{branded.composition1}</div>}
                {branded.composition2 && <div className="bg-surface-lowest border border-outline-variant/50 px-4 py-3 rounded text-sm font-semibold text-on-surface/80">{branded.composition2}</div>}
              </div>
            </div>

            {/* Right - Generic (The Solution) */}
            {!generic ? (
            <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
              <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-3">JanAushadhi Equivalent</div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-on-surface mb-4 leading-tight">No Jan Aushadhi equivalent listed yet</h2>
              <p className="text-on-surface/70 leading-relaxed mb-8 max-w-lg">
                We couldn't find a PMBJP generic with the same active ingredients and dosage form. Ask the pharmacist at your
                nearest Kendra — the product basket is updated regularly.
              </p>
              <button onClick={() => navigate('/fulfillment')} className="btn-secondary w-fit px-8 py-3 uppercase tracking-widest text-xs font-bold">Find a Kendra</button>
            </div>
            ) : (
            <div className="w-full md:w-7/12 p-8 md:p-10 relative">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-[10px] font-bold tracking-widest text-primary uppercase">JanAushadhi Equivalent</div>
                    {isExact ? (
                      <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">✓ Exact Strength Match</div>
                    ) : (
                      <div className="bg-[#fef7e0] border border-[#f9ab00] text-[#b06000] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">⚠ Different Strength</div>
                    )}
                  </div>
                  <h2 className="font-display text-2xl md:text-4xl font-bold text-primary mb-2 leading-tight">{generic.name}</h2>
                  <div className="text-sm text-on-surface/60 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="bg-surface-low px-2 py-0.5 rounded">PMBJP: {generic?.drug_code}</span>
                    <span className="opacity-30">•</span>
                    <span>{generic?.group_name}</span>
                  </div>
                </div>
                {savings?.percentage > 0 && (
                  <div className="bg-primary text-white px-6 py-4 rounded-md text-center shrink-0 shadow-lg shadow-primary/20">
                    <div className="font-display text-3xl font-bold tracking-tight">{savings.percentage}%</div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mt-1 text-white/90">COST SAVING</div>
                  </div>
                )}
              </div>

              {!isExact && (
                <div className="flex gap-3 items-start bg-[#fef7e0] border border-[#f9ab00]/60 text-[#7a4300] p-4 rounded-md mb-6 text-sm leading-relaxed">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>
                    This generic has the same active ingredients as {branded.name} but at a <strong>different strength</strong>.
                    It is not a direct substitute — confirm the dose with your doctor or pharmacist before switching.
                  </span>
                </div>
              )}

              <div className="bg-primary/5 border-l-4 border-primary p-8 rounded-r-md mb-10">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-primary/70 uppercase mb-2">Pradhan Mantri Bhartiya Janaushadhi Pariyojana Price</div>
                    <div className="font-display text-6xl font-bold text-primary tracking-tight">₹{(generic?.mrp || 0).toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-1">You Save</div>
                    <div className="font-display text-3xl font-bold text-primary">₹{(savings?.absolute || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-primary/60 font-semibold mt-1 max-w-[12rem]">
                      {savings?.basis === 'per_unit'
                        ? `for the same quantity as one ${branded.pack_size || 'branded pack'}`
                        : 'comparing pack prices (pack sizes may differ)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 mb-10">
                {['WHO-GMP Suppliers', 'NABL Batch Tested'].map(badge => (
                  <div key={badge} className="flex items-center gap-2 bg-surface-low border border-outline-variant/50 px-4 py-2 rounded text-[10px] font-bold text-on-surface/60 tracking-widest uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> {badge}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 btn-primary py-5 flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/10"
                >
                  <Plus className="w-5 h-5" /> Add to Prescription Order
                </button>
                <button className="p-4 bg-surface-lowest border border-outline-variant rounded-md hover:bg-surface-low transition-colors text-on-surface/30 hover:text-red-500">
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-10 border-b border-outline-variant overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-10 py-5 text-[11px] font-bold transition-all whitespace-nowrap uppercase tracking-widest relative ${
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-on-surface/50 hover:text-on-surface/80'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary animate-widthGrow" />}
            </button>
          ))}
        </div>

        {/* Tab Content — only data we actually hold; no generic filler presented as clinical fact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {activeTab === 'overview' && (
            <>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-8 flex items-center gap-3"><ClipboardList className="w-5 h-5 text-primary" /> Active Ingredients</h3>
                <div className="space-y-4">
                  {[branded.composition1, branded.composition2].filter(Boolean).map((c) => (
                    <div key={c} className="pb-4 border-b border-outline-variant/30 last:border-0">
                      <div className="text-sm font-bold text-on-surface">{c}</div>
                      <div className="text-[10px] text-on-surface/50 font-bold uppercase tracking-widest mt-1">Salt (strength)</div>
                    </div>
                  ))}
                  {!branded.composition1 && !branded.composition2 && (
                    <p className="text-sm text-on-surface/60">Composition not listed for this product.</p>
                  )}
                </div>
              </div>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-8 flex items-center gap-3"><ThermometerSun className="w-5 h-5 text-primary" /> Pack Details</h3>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <Spec label="Dosage Form" value={branded.form && branded.form !== 'Other' ? branded.form : 'See pack'} />
                  <Spec label="Branded Pack" value={branded.pack_size || 'N/A'} />
                  <Spec label="Generic Pack" value={generic?.unit_size || 'N/A'} />
                  <Spec label="Storage" value={generic?.storage_info || 'As printed on pack'} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'clinical' && (
            <>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-6">Medical Indications</h3>
                <div className="p-6 bg-primary/5 rounded border border-primary/10">
                  <p className="text-sm text-on-surface/80 leading-relaxed font-medium">
                    {generic?.indications || 'Indications for this product are not yet in our catalogue. Use only as directed by your doctor.'}
                  </p>
                </div>
              </div>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-6">Categorization</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-surface-low rounded ghost-border">
                    <div className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase mb-1">Therapeutic Group (PMBJP)</div>
                    <div className="font-bold text-primary">{generic?.group_name || 'Not classified'}</div>
                  </div>
                  <div className="p-4 bg-surface-low rounded ghost-border">
                    <div className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase mb-1">Manufacturer (Branded)</div>
                    <div className="font-bold text-on-surface">{branded.manufacturer || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'warnings' && (
            <div className="col-span-full">
              <div className="bg-red-50 border border-red-200 rounded-lg p-10 clinical-shadow mb-8">
                <h3 className="font-display font-bold text-red-900 text-lg mb-6 flex items-center gap-3"><AlertTriangle className="w-6 h-6" /> Safe Usage</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-red-700/60 uppercase mb-4">Side Effects &amp; Precautions</div>
                    <p className="text-sm text-red-900/80 leading-relaxed font-medium">
                      {generic?.side_effects || 'Product-specific side effects are not yet in our catalogue. Read the leaflet in the pack and ask your pharmacist.'}
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-red-700/60 uppercase mb-4">Before Switching</div>
                    <div className="bg-white/50 p-4 rounded border border-red-100 flex items-start gap-4">
                      <Clock className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium text-red-900/80 leading-relaxed">
                        Check that the strength and dosage form match your prescription, and keep taking your medicine exactly as prescribed.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-4 text-blue-900/60 text-[10px] font-bold uppercase tracking-widest justify-center">
                <ShieldCheck className="w-4 h-4" /> This information is for reference only. Always consult a licensed medical professional.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <div className="p-4 bg-surface-low rounded flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40">{label}</span>
      <span className="font-bold text-on-surface">{value}</span>
    </div>
  );
}
