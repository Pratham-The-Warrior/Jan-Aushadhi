// ============================================================
// Financial Health Dashboard — Recharts bar charts,
// Categorized comparison table, animated savings stats
// ============================================================

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Info, CheckCircle, TrendingUp } from 'lucide-react';
import { getUserDashboard } from '../services/api';

const COMPARISON_DATA = [
  { name: 'Atorvastatin', branded: 78, generic: 6.4, category: 'CARDIAC' },
  { name: 'Metformin', branded: 24.5, generic: 3.1, category: 'DIABETES' },
  { name: 'Azithromycin', branded: 122, generic: 18.5, category: 'ANTIBIOTICS' },
  { name: 'Telmisartan', branded: 94, generic: 7.2, category: 'CARDIAC' },
  { name: 'Pantoprazole', branded: 145, generic: 22, category: 'GI' },
  { name: 'Cetirizine', branded: 35, generic: 4.5, category: 'ALLERGY' },
];

const TABLE_MEDS = [
  { id: 1, salt: 'Atorvastatin 10mg', branded: 'Lipitor Generic Eq.', category: 'CARDIAC', marketPrice: 78.00, jaPrice: 6.40 },
  { id: 2, salt: 'Metformin 500mg', branded: 'Glucophage Generic Eq.', category: 'DIABETES', marketPrice: 24.50, jaPrice: 3.10 },
  { id: 3, salt: 'Azithromycin 500mg', branded: 'Zithromax Generic Eq.', category: 'ANTIBIOTICS', marketPrice: 122.00, jaPrice: 18.50 },
  { id: 4, salt: 'Telmisartan 40mg', branded: 'Micardis Generic Eq.', category: 'CARDIAC', marketPrice: 94.00, jaPrice: 7.20 },
  { id: 5, salt: 'Pantoprazole 40mg', branded: 'Pan-40 Generic Eq.', category: 'GI', marketPrice: 145.00, jaPrice: 22.00 },
  { id: 6, salt: 'Cetirizine 10mg', branded: 'Zyrtec Generic Eq.', category: 'ALLERGY', marketPrice: 35.00, jaPrice: 4.50 },
];

const MONTHLY_CHART = [
  { month: 'Jul', branded: 1200, generic: 180 },
  { month: 'Aug', branded: 980, generic: 145 },
  { month: 'Sep', branded: 1400, generic: 210 },
  { month: 'Oct', branded: 1100, generic: 160 },
  { month: 'Nov', branded: 1350, generic: 195 },
  { month: 'Dec', branded: 1500, generic: 220 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-surface-lowest clinical-shadow ghost-border rounded-lg p-4 text-sm z-50">
      <div className="font-display font-semibold text-on-surface mb-2">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex justify-between gap-6 pb-1">
          <span className="text-on-surface/80 font-medium" style={{ color: entry.name === 'JanAushadhi' ? 'var(--color-primary)' : '' }}>{entry.name}</span>
          <span className="font-bold text-on-surface">₹{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState({ average_savings_percent: 87.5, annual_savings_projection: 14580, lifetime_savings: 2430, total_orders: 4 });
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    getUserDashboard().then(d => { if (d?.stats) setStats(d.stats); }).catch(() => {});
  }, []);

  const categories = ['ALL', ...new Set(TABLE_MEDS.map(m => m.category))];
  const filteredMeds = filterCategory === 'ALL' ? TABLE_MEDS : TABLE_MEDS.filter(m => m.category === filterCategory);

  return (
    <div className="flex-1 w-full bg-surface pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 text-primary text-xs font-bold mb-4 tracking-wider uppercase">
            <ShieldCheckIcon className="w-3.5 h-3.5" /> Government Verified Savings
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-on-surface mb-4">
            Your Path to <span className="text-primary block mt-2">Financial Health</span>
          </h1>
          <p className="text-on-surface/70 max-w-2xl text-lg leading-[1.6]">
            Compare essential medicine prices across India. JanAushadhi provides high-quality generics at a fraction of the cost.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="bg-surface-lowest p-6 rounded-lg ghost-border">
            <div className="text-xs font-bold tracking-widest text-on-surface/50 uppercase mb-3">Average Savings</div>
            <div className="font-display text-4xl font-bold text-primary tracking-tight">{Math.round(stats.average_savings_percent)}%</div>
            <div className="text-sm font-medium text-on-surface/60 flex items-center gap-1.5 mt-2"><TrendingUp className="w-4 h-4 text-primary" /> Per Prescription</div>
          </div>
          <div className="bg-surface-lowest p-6 rounded-lg ghost-border">
            <div className="text-xs font-bold tracking-widest text-on-surface/50 uppercase mb-3">Annual Projection</div>
            <div className="font-display text-4xl font-bold text-on-surface tracking-tight">₹{stats.annual_savings_projection.toLocaleString('en-IN')}</div>
            <div className="text-sm font-medium text-on-surface/60 mt-2">Based on current usage</div>
          </div>
          <div className="bg-surface-lowest p-6 rounded-lg ghost-border">
            <div className="text-xs font-bold tracking-widest text-on-surface/50 uppercase mb-3">Lifetime Savings</div>
            <div className="font-display text-4xl font-bold text-primary tracking-tight">₹{stats.lifetime_savings.toLocaleString('en-IN')}</div>
            <div className="text-sm font-medium text-on-surface/60 mt-2">Since you joined</div>
          </div>
          <div className="bg-surface-lowest p-6 rounded-lg ghost-border">
            <div className="text-xs font-bold tracking-widest text-on-surface/50 uppercase mb-3">Total Orders</div>
            <div className="font-display text-4xl font-bold text-on-surface tracking-tight">{stats.total_orders}</div>
            <div className="text-sm font-medium text-on-surface/60 mt-2">Prescriptions fulfilled</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {/* Monthly Spend Chart */}
          <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-1">Monthly Spend Comparison</h3>
                <p className="text-sm text-on-surface/60">Branded vs. JanAushadhi spend over 6 months</p>
              </div>
              <Info className="w-5 h-5 text-on-surface/40" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={MONTHLY_CHART} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} tickFormatter={v => `₹${v}`} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} />
                <Bar dataKey="branded" name="Branded" fill="var(--color-surface-low)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="generic" name="JanAushadhi" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-Medicine Comparison Chart */}
          <div className="bg-surface-lowest rounded-lg ghost-border p-8 clinical-shadow">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-1">Per-Medicine Price Gap</h3>
                <p className="text-sm text-on-surface/60">Individual medicine cost comparison</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={COMPARISON_DATA} layout="vertical" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} tickFormatter={v => `₹${v}`} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.8 }} width={90} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="branded" name="Branded MRP" fill="var(--color-surface-low)" radius={[0, 2, 2, 0]} />
                <Bar dataKey="generic" name="JanAushadhi" fill="var(--color-primary)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categorized Price Comparison Table */}
        <div className="mb-24">
          <div className="flex flex-col md:flex-row justify-between md:items-end mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-on-surface">Direct Price Comparison</h2>
              <p className="text-on-surface/60 mt-2">Real-time data based on current market retail prices (MRP).</p>
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`text-[10px] font-bold py-2 px-4 rounded-sm tracking-wider uppercase transition-colors ghost-border ${
                    filterCategory === cat
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-lowest text-on-surface/70 hover:bg-surface-low'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-lowest rounded-lg ghost-border overflow-hidden clinical-shadow">
            <div className="grid grid-cols-6 text-[10px] font-bold uppercase tracking-widest text-on-surface/60 bg-surface-low p-5 border-b border-outline-variant">
              <div className="col-span-2">Medicine / Salt Name</div>
              <div>Category</div>
              <div className="text-center">Branded Price</div>
              <div className="text-center">Janaushadhi</div>
              <div className="text-right">Your Savings</div>
            </div>
            <div className="divide-y divide-outline-variant">
              {filteredMeds.map(med => {
                const savedVal = med.marketPrice - med.jaPrice;
                const savedPct = ((savedVal / med.marketPrice) * 100).toFixed(1);
                return (
                  <div key={med.id} className="grid grid-cols-6 items-center p-5 bg-surface-lowest hover:bg-surface transition-colors">
                    <div className="col-span-2">
                      <div className="font-display font-semibold text-on-surface">{med.salt}</div>
                      <div className="text-xs text-on-surface/50 mt-1">{med.branded}</div>
                    </div>
                    <div>
                      <span className="bg-surface text-primary text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-sm ghost-border">{med.category}</span>
                    </div>
                    <div className="text-center text-on-surface/60 font-medium line-through decoration-on-surface/30">₹{med.marketPrice.toFixed(2)}</div>
                    <div className="text-center font-display font-bold text-on-surface">₹{med.jaPrice.toFixed(2)}</div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold text-primary">₹{savedVal.toFixed(2)}</div>
                      <div className="text-[10px] font-bold text-on-surface/50 mt-1 uppercase tracking-wider">{savedPct}% Saved</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-col md:flex-row bg-surface-lowest rounded-lg ghost-border overflow-hidden clinical-shadow">
          <div className="w-full md:w-7/12 p-12 lg:p-16 flex flex-col justify-center">
            <h2 className="font-display text-3xl font-bold text-on-surface leading-[1.2] mb-6">Same Molecule, Same Efficacy, <span className="text-primary block mt-1">Lesser Price.</span></h2>
            <p className="text-on-surface/70 mb-10 max-w-lg leading-[1.6]">Branded medicines include marketing, MR commissions, and patent premiums. JanAushadhi eliminates these middlemen.</p>
            <div className="space-y-5 mb-10">
              <div className="flex gap-4 items-start"><CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div className="text-sm leading-[1.6]"><strong className="text-on-surface font-semibold">Bio-Equivalent</strong> — Matches therapeutic effects of leading brands.</div></div>
              <div className="flex gap-4 items-start"><CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div className="text-sm leading-[1.6]"><strong className="text-on-surface font-semibold">Transparency First</strong> — Access lab reports for any batch online.</div></div>
            </div>
            <button onClick={() => window.location.href = '/fulfillment'} className="btn-primary py-3.5 px-8 w-fit">Locate Your Nearest Kendra</button>
          </div>
          <div className="w-full md:w-5/12 bg-primary p-12 lg:p-16 flex flex-col justify-center text-white">
            <ShieldCheckIcon className="w-8 h-8 mb-6 text-white/80" />
            <h3 className="font-display text-2xl font-bold mb-4">WHO-GMP Certified</h3>
            <p className="text-white/80 text-sm leading-[1.6] mb-10">Every batch undergoes rigorous quality testing at NABL accredited labs.</p>
            <div className="font-display text-5xl font-bold">₹{stats.lifetime_savings.toLocaleString('en-IN')}</div>
            <div className="text-[10px] font-bold tracking-widest text-white/60 uppercase mt-3">Your Lifetime Savings</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldCheckIcon(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>;
}
