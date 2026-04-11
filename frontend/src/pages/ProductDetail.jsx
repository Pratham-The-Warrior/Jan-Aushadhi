// ============================================================
// Product Clinical Detail Page
// Deep-dive specs: Indications, Administration, Warnings,
// Pharmacokinetics, Trust Badges (WHO-GMP, NABL, ISO 9001)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Pill, Beaker, ThermometerSun, Clock, ArrowLeft, Plus, Heart } from 'lucide-react';
import { getDiscovery } from '../services/api';
import useCartStore from '../store/cartStore';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore(s => s.addItem);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function load() {
      try {
        const res = await getDiscovery(id);
        setData(res);
      } catch {
        // Fallback mock
        setData({
          branded: { id: 1, name: 'Augmentin 625 Duo', mrp: 223.42, manufacturer: 'GSK Pharmaceuticals', pack_size: 'strip of 10 tablets', composition1: 'Amoxycillin (500mg)', composition2: 'Clavulanic Acid (125mg)' },
          generic: { drug_code: '01342', name: 'Amoxycillin & Potassium Clavulanate Tablets', mrp: 56.10, unit_size: "10's", group_name: 'Anti-Infective' },
          savings: { absolute: 167.32, percentage: 74.9 },
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="flex-1 flex items-center justify-center py-20 text-on-surface/50 font-medium">Loading clinical data...</div>;
  if (!data) return <div className="flex-1 flex items-center justify-center py-20 text-on-surface/50 font-medium">Product not found</div>;

  const { branded, generic, savings } = data;
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'clinical', label: 'Clinical Details' },
    { key: 'pharmacokinetics', label: 'Pharmacokinetics' },
    { key: 'warnings', label: 'Warnings' },
  ];

  return (
    <div className="flex-1 w-full bg-surface pb-24 md:pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Back button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-on-surface/60 hover:text-primary mb-8 font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Search Results
        </button>

        {/* Header Card */}
        <div className="bg-surface-lowest rounded-lg ghost-border clinical-shadow overflow-hidden mb-12">
          <div className="flex flex-col md:flex-row">
            {/* Left - Branded */}
            <div className="w-full md:w-5/12 p-8 bg-surface-low border-r border-outline-variant">
              <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-4">Branded Reference</div>
              <h1 className="font-display text-3xl font-bold text-on-surface mb-2">{branded.name}</h1>
              <div className="text-sm text-on-surface/60 mb-8 font-medium">{branded.manufacturer}</div>
              <div className="bg-surface-lowest ghost-border p-6 rounded-md mb-8">
                <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-2">Market MRP</div>
                <div className="font-display text-4xl font-bold text-on-surface">₹{(branded.mrp || 0).toFixed(2)}</div>
                <div className="text-xs text-on-surface/50 mt-1 uppercase tracking-wider font-bold">{branded.pack_size || 'Per strip'}</div>
              </div>
              <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-3">Composition</div>
              <div className="space-y-3">
                {branded.composition1 && <div className="bg-surface-lowest border border-outline-variant px-4 py-3 rounded-sm text-sm font-semibold text-on-surface/80">{branded.composition1}</div>}
                {branded.composition2 && <div className="bg-surface-lowest border border-outline-variant px-4 py-3 rounded-sm text-sm font-semibold text-on-surface/80">{branded.composition2}</div>}
              </div>
            </div>

            {/* Right - Generic */}
            <div className="w-full md:w-7/12 p-8 md:p-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-[10px] font-bold tracking-widest text-primary uppercase">JanAushadhi Generic</div>
                    <div className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">✓ VERIFIED</div>
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-primary mb-2">{generic?.name || 'No match found'}</h2>
                  <div className="text-sm text-on-surface/60 font-medium">Code: {generic?.drug_code} • {generic?.group_name}</div>
                </div>
                {savings && (
                  <div className="bg-primary text-white px-5 py-4 rounded-md text-center shrink-0">
                    <div className="font-display text-3xl font-bold tracking-tight">{savings.percentage}%</div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mt-1 text-white/80">SAVED</div>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/20 p-6 rounded-md mb-8">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-2">PMBJP Price</div>
                    <div className="font-display text-5xl font-bold text-primary tracking-tight">₹{(generic?.mrp || 0).toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary/70 mb-1">You save</div>
                    <div className="font-display text-2xl font-bold text-primary">₹{(savings?.absolute || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 bg-surface-low border border-outline-variant px-4 py-2.5 rounded-sm text-xs font-bold text-on-surface/70 tracking-wide uppercase">
                  <ShieldCheck className="w-4 h-4 text-primary" /> WHO-GMP
                </div>
                <div className="flex items-center gap-2 bg-surface-low border border-outline-variant px-4 py-2.5 rounded-sm text-xs font-bold text-on-surface/70 tracking-wide uppercase">
                  <Beaker className="w-4 h-4 text-primary" /> NABL Tested
                </div>
                <div className="flex items-center gap-2 bg-surface-low border border-outline-variant px-4 py-2.5 rounded-sm text-xs font-bold text-on-surface/70 tracking-wide uppercase">
                  <ShieldCheck className="w-4 h-4 text-primary" /> ISO 9001
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { if (generic) addItem({ drug_code: generic.drug_code, name: generic.name, mrp: generic.mrp, branded_name: branded.name, branded_mrp: branded.mrp, unit_size: generic.unit_size, group_name: generic.group_name }); }}
                  className="flex-1 btn-primary py-4 flex items-center justify-center gap-2 text-base"
                >
                  <Plus className="w-5 h-5" /> Add to Prescription Cart
                </button>
                <button className="px-5 bg-surface-lowest border border-outline-variant rounded-md hover:bg-surface-low transition-colors text-on-surface/50 hover:text-red-500">
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-outline-variant overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-8 py-4 text-sm font-bold transition-colors whitespace-nowrap uppercase tracking-wider ${
                activeTab === tab.key
                  ? 'text-primary border-b-[3px] border-primary'
                  : 'text-on-surface/50 hover:text-on-surface/80 border-b-[3px] border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {activeTab === 'overview' && (
            <>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-6 flex items-center gap-2"><Pill className="w-5 h-5 text-primary" /> Active Ingredients</h3>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[10px] font-bold tracking-widest text-on-surface/50 uppercase border-b border-outline-variant"><th className="pb-3">Ingredient</th><th className="pb-3">Strength</th><th className="pb-3">Role</th></tr></thead>
                  <tbody>
                    <tr className="border-b border-outline-variant/30"><td className="py-4 font-semibold text-on-surface">Amoxycillin</td><td className="font-medium text-on-surface/80">500 mg</td><td className="text-on-surface/60 font-medium">Antibiotic</td></tr>
                    <tr><td className="py-4 font-semibold text-on-surface">Potassium Clavulanate</td><td className="font-medium text-on-surface/80">125 mg</td><td className="text-on-surface/60 font-medium">Beta-lactamase inhibitor</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-6 flex items-center gap-2"><ThermometerSun className="w-5 h-5 text-primary" /> Storage & Form</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-3 border-b border-outline-variant/30"><span className="text-on-surface/60 font-semibold uppercase tracking-wider text-[10px]">Form</span><span className="font-semibold text-on-surface">Tablet</span></div>
                  <div className="flex justify-between py-3 border-b border-outline-variant/30"><span className="text-on-surface/60 font-semibold uppercase tracking-wider text-[10px]">Storage</span><span className="font-semibold text-on-surface">Below 25°C, dry place</span></div>
                  <div className="flex justify-between py-3 border-b border-outline-variant/30"><span className="text-on-surface/60 font-semibold uppercase tracking-wider text-[10px]">Shelf Life</span><span className="font-semibold text-on-surface">24 months</span></div>
                  <div className="flex justify-between py-3"><span className="text-on-surface/60 font-semibold uppercase tracking-wider text-[10px]">Pack Size</span><span className="font-semibold text-on-surface">{generic?.unit_size || "10's"}</span></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'clinical' && (
            <>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-6">Indications</h3>
                <ul className="space-y-4 text-sm text-on-surface/80 font-medium">
                  <li className="flex gap-3 items-start"><span className="text-primary font-bold mt-1">•</span>Upper and lower respiratory tract infections</li>
                  <li className="flex gap-3 items-start"><span className="text-primary font-bold mt-1">•</span>Urinary tract infections</li>
                  <li className="flex gap-3 items-start"><span className="text-primary font-bold mt-1">•</span>Skin and soft tissue infections</li>
                  <li className="flex gap-3 items-start"><span className="text-primary font-bold mt-1">•</span>Dental infections and abscesses</li>
                  <li className="flex gap-3 items-start"><span className="text-primary font-bold mt-1">•</span>Bone and joint infections</li>
                </ul>
              </div>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-6">Administration</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-3 border-b border-outline-variant/30"><span className="text-on-surface/60 font-semibold uppercase tracking-wider text-[10px]">Route</span><span className="font-semibold text-on-surface">Oral</span></div>
                  <div className="flex justify-between py-3 border-b border-outline-variant/30"><span className="text-on-surface/60 font-semibold uppercase tracking-wider text-[10px]">Frequency</span><span className="font-semibold text-on-surface">Twice daily</span></div>
                  <div className="flex justify-between py-3 border-b border-outline-variant/30"><span className="text-on-surface/60 font-semibold uppercase tracking-wider text-[10px]">Duration</span><span className="font-semibold text-on-surface">5-7 days (as prescribed)</span></div>
                  <div className="flex justify-between py-3"><span className="text-on-surface/60 font-semibold uppercase tracking-wider text-[10px]">With Food</span><span className="font-semibold text-on-surface">Yes, at start of meal</span></div>
                </div>
              </div>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 col-span-full clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-6">Category</h3>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-4 py-2 rounded-sm border border-primary/20 uppercase tracking-widest">{generic?.group_name || 'Anti-Infective'}</span>
              </div>
            </>
          )}

          {activeTab === 'pharmacokinetics' && (
            <>
              <div className="bg-surface-lowest rounded-lg ghost-border p-8 col-span-full clinical-shadow">
                <h3 className="font-display font-bold text-on-surface text-lg mb-8">Pharmacokinetic Profile</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-6 bg-surface border border-outline-variant rounded-lg">
                    <div className="font-display text-3xl font-bold text-primary mb-2">1-2h</div>
                    <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">T-max</div>
                  </div>
                  <div className="text-center p-6 bg-surface border border-outline-variant rounded-lg">
                    <div className="font-display text-3xl font-bold text-primary mb-2">60-70%</div>
                    <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">Bioavailability</div>
                  </div>
                  <div className="text-center p-6 bg-surface border border-outline-variant rounded-lg">
                    <div className="font-display text-3xl font-bold text-primary mb-2">1h</div>
                    <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">Half-Life</div>
                  </div>
                  <div className="text-center p-6 bg-surface border border-outline-variant rounded-lg">
                    <div className="font-display text-3xl font-bold text-primary mb-2">Renal</div>
                    <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">Excretion</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'warnings' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 col-span-full">
                <h3 className="font-display font-bold text-red-800 text-lg mb-6 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Critical Warnings & Contraindications</h3>
                <ul className="space-y-4 text-sm text-red-800 font-medium">
                  <li className="flex gap-3 items-start"><span className="font-bold text-red-600 mt-1">⚠</span>Do not use if allergic to penicillin or cephalosporin antibiotics</li>
                  <li className="flex gap-3 items-start"><span className="font-bold text-red-600 mt-1">⚠</span>Patients with severe hepatic impairment should avoid this medication</li>
                  <li className="flex gap-3 items-start"><span className="font-bold text-red-600 mt-1">⚠</span>May cause diarrhea — consult doctor if severe</li>
                  <li className="flex gap-3 items-start"><span className="font-bold text-red-600 mt-1">⚠</span>History of cholestatic jaundice with prior amoxicillin use is a contraindication</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-8">
                <h3 className="font-display font-bold text-amber-900 text-lg mb-5">Drug Interactions</h3>
                <ul className="space-y-3 text-sm text-amber-800 font-medium">
                  <li className="flex gap-2 items-start"><span className="font-bold text-amber-600 mt-0.5">•</span> Warfarin (increased bleeding risk)</li>
                  <li className="flex gap-2 items-start"><span className="font-bold text-amber-600 mt-0.5">•</span> Methotrexate (increased toxicity)</li>
                  <li className="flex gap-2 items-start"><span className="font-bold text-amber-600 mt-0.5">•</span> Oral contraceptives (reduced efficacy)</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                <h3 className="font-display font-bold text-blue-900 text-lg mb-5">Side Effects</h3>
                <ul className="space-y-3 text-sm text-blue-800 font-medium">
                  <li className="flex gap-2 items-start"><span className="font-bold text-blue-600 mt-0.5">•</span> Nausea, vomiting, diarrhea (common)</li>
                  <li className="flex gap-2 items-start"><span className="font-bold text-blue-600 mt-0.5">•</span> Skin rash (uncommon)</li>
                  <li className="flex gap-2 items-start"><span className="font-bold text-blue-600 mt-0.5">•</span> Candidiasis (rare)</li>
                  <li className="flex gap-2 items-start"><span className="font-bold text-blue-600 mt-0.5">•</span> Anaphylaxis (very rare)</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
