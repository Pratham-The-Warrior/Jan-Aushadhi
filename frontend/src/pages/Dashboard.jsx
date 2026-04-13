// ============================================================
// Financial Health Dashboard — Recharts bar charts,
// Categorized comparison table, animated savings stats
// ============================================================

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Info, CheckCircle, TrendingUp, ShieldCheck, PieChart, Activity } from 'lucide-react';
import { getUserDashboard, getDashboardMonthly } from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-surface-lowest clinical-shadow ghost-border rounded-lg p-4 text-sm z-50">
      <div className="font-display font-semibold text-on-surface mb-2">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex justify-between gap-6 pb-1">
          <span className="text-on-surface/80 font-medium" style={{ color: entry.name === 'Savings' ? 'var(--color-primary)' : '' }}>{entry.name}</span>
          <span className="font-bold text-on-surface">₹{entry.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    average_savings_percent: 0, 
    annual_savings_projection: 0, 
    lifetime_savings: 0, 
    total_orders: 0 
  });
  const [chartData, setChartData] = useState([]);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dash, monthly] = await Promise.all([
          getUserDashboard(),
          getDashboardMonthly()
        ]);
        
        if (dash?.stats) setStats(dash.stats);
        if (dash?.active_prescriptions) setActivePrescriptions(dash.active_prescriptions);
        if (monthly?.history) setChartData(monthly.history);
      } catch (err) {
        console.error('Failed to load dashboard analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center py-40 bg-surface">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
      <div className="text-on-surface/50 font-bold text-xs uppercase tracking-widest">Aggregating Financial Metrics...</div>
    </div>
  );

  return (
    <div className="flex-1 w-full bg-surface pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Header */}
        <div className="mb-12 animate-slideUp">
          <div className="inline-flex items-center gap-2 text-primary text-xs font-bold mb-4 tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5" /> PBI-Standard Verified
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-on-surface mb-4">
            Your Healthcare <span className="text-primary block mt-2">Financial Account</span>
          </h1>
          <p className="text-on-surface/70 max-w-2xl text-lg leading-[1.6]">
            Transparent tracking of your pharmaceutical savings and clinical requirement history. Real-time data from PMBJP Kendra logs.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16 animate-slideUp">
          <div className="bg-surface-lowest p-8 rounded-lg ghost-border clinical-shadow group hover:border-primary/30 transition-all">
            <div className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase mb-4">Average Savings</div>
            <div className="font-display text-5xl font-bold text-primary tracking-tight">{Math.round(stats.average_savings_percent)}%</div>
            <div className="text-xs font-bold text-on-surface/60 flex items-center gap-1.5 mt-3 uppercase tracking-wider">
               <TrendingUp className="w-4 h-4 text-primary" /> Per Ticket
            </div>
          </div>
          <div className="bg-surface-lowest p-8 rounded-lg ghost-border clinical-shadow group hover:border-primary/30 transition-all">
            <div className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase mb-4">Annual Savings Est.</div>
            <div className="font-display text-5xl font-bold text-on-surface tracking-tight">₹{stats.annual_savings_projection.toLocaleString('en-IN')}</div>
            <div className="text-xs font-bold text-on-surface/60 mt-3 uppercase tracking-wider">Projected Growth</div>
          </div>
          <div className="bg-surface-lowest p-8 rounded-lg ghost-border clinical-shadow group hover:border-primary/30 transition-all">
            <div className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase mb-4">Lifetime Impact</div>
            <div className="font-display text-5xl font-bold text-primary tracking-tight">₹{(stats.lifetime_savings || 0).toLocaleString('en-IN')}</div>
            <div className="text-xs font-bold text-on-surface/60 mt-3 uppercase tracking-wider">Net Retained Wealth</div>
          </div>
          <div className="bg-surface-lowest p-8 rounded-lg ghost-border clinical-shadow group hover:border-primary/30 transition-all">
            <div className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase mb-4">Orders Fulfilled</div>
            <div className="font-display text-5xl font-bold text-on-surface tracking-tight">{stats.total_orders}</div>
            <div className="text-xs font-bold text-on-surface/60 mt-3 uppercase tracking-wider">Kendra Pickups</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="mb-20 animate-slideUp">
          <div className="bg-surface-lowest rounded-lg ghost-border p-8 md:p-10 clinical-shadow">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-on-surface mb-1 flex items-center gap-3">
                   <Activity className="w-6 h-6 text-primary" /> Monthly Savings Performance
                </h3>
                <p className="text-sm text-on-surface/60">Comparison of monthly generic spend vs. calculated savings</p>
              </div>
              <div className="flex items-center gap-4 bg-surface-low px-4 py-2 rounded ghost-border">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-primary rounded-full" /><span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Savings</span></div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-surface-lowest border border-outline-variant rounded-full" /><span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Spend</span></div>
              </div>
            </div>
            
            {chartData.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 'bold', fill: 'currentColor', opacity: 0.4 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 'bold', fill: 'currentColor', opacity: 0.4 }} tickFormatter={v => `₹${v}`} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-primary)', opacity: 0.03 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '30px' }} />
                    <Bar dataKey="spend" name="Generic Spend" fill="var(--color-surface-low)" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="savings" name="Actual Savings" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center opacity-30 bg-surface-low rounded border border-dashed border-outline-variant">
                 <PieChart className="w-12 h-12 mb-4" />
                 <p className="text-sm font-bold uppercase tracking-widest">Insufficient data for chart</p>
                 <p className="text-[10px] font-medium mt-2">Charts will appear after your first confirmed requirement.</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Prescription Monitoring */}
        <div className="mb-24 animate-slideUp">
          <div className="flex flex-col md:flex-row justify-between md:items-end mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-on-surface">Active Medical Basket</h2>
              <p className="text-on-surface/60 mt-2">Pharmaceutical equivalents from your recent confirmed requirements.</p>
            </div>
          </div>

          <div className="bg-surface-lowest rounded-lg ghost-border overflow-hidden clinical-shadow">
            <div className="grid grid-cols-1 md:grid-cols-6 text-[10px] font-bold uppercase tracking-widest text-on-surface/40 bg-surface-low p-6 border-b border-outline-variant">
              <div className="md:col-span-2">Medicine / Salt Name</div>
              <div className="text-center hidden md:block">Category</div>
              <div className="text-center hidden md:block">Branded Price</div>
              <div className="text-center hidden md:block">Janaushadhi</div>
              <div className="text-right">Your Savings</div>
            </div>
            <div className="divide-y divide-outline-variant">
              {activePrescriptions.length === 0 ? (
                <div className="p-12 text-center text-on-surface/40 font-medium">No active medical requirements found in health records.</div>
              ) : (
                activePrescriptions.map((med, idx) => {
                  const savedVal = (med.branded_mrp || 0) - (med.mrp || 0);
                  const savedPct = med.branded_mrp ? ((savedVal / med.branded_mrp) * 100).toFixed(1) : 'N/A';
                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-6 items-center p-6 bg-surface-lowest hover:bg-surface-low transition-colors group">
                      <div className="md:col-span-2">
                        <div className="font-display font-medium text-on-surface text-base group-hover:text-primary transition-colors">{med.name}</div>
                        <div className="text-[11px] text-on-surface/50 mt-1 italic">{med.code || med.drug_code} Generic Equivalent</div>
                      </div>
                      <div className="text-center hidden md:block">
                        <span className="bg-[#b3e5fc] text-[#0277bd] text-[9px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">{med.group_name || 'GENERAL'}</span>
                      </div>
                      <div className="text-center font-medium text-on-surface/60 hidden md:block">₹{(med.branded_mrp || 0).toFixed(2)}</div>
                      <div className="text-center font-bold text-on-surface hidden md:block">₹{(med.mrp || 0).toFixed(2)}</div>
                      <div className="text-right mt-4 md:mt-0">
                        <div className="font-display text-lg font-bold text-[#137333]">₹{savedVal.toFixed(2)}</div>
                        <div className="text-[10px] text-on-surface/50 mt-1">{savedPct}% Saved</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Global Impact CTA */}
        <div className="flex flex-col md:flex-row bg-surface-lowest rounded-lg ghost-border overflow-hidden clinical-shadow animate-slideUp">
          <div className="w-full md:w-7/12 p-12 lg:p-20 flex flex-col justify-center">
            <h2 className="font-display text-4xl font-bold text-on-surface leading-[1.1] mb-8">Clinical Integrity. <span className="text-primary block mt-1">Direct Savings.</span></h2>
            <p className="text-on-surface/70 mb-12 max-w-lg leading-[1.8] text-lg">
              Generic medicines are chemically identical to brands but priced for public welfare. PMBJP ensures standardized quality across all 10,000+ Kendras.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
              <div className="flex gap-4 items-start">
                 <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0 border border-primary/20"><CheckCircle className="w-5 h-5 text-primary" /></div>
                 <div>
                    <h4 className="font-bold text-on-surface text-sm uppercase tracking-wide">Bio-Equivalent</h4>
                    <p className="text-xs text-on-surface/50 mt-1">Molecularly matching performance.</p>
                 </div>
              </div>
              <div className="flex gap-4 items-start">
                 <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0 border border-primary/20"><ShieldCheck className="w-5 h-5 text-primary" /></div>
                 <div>
                    <h4 className="font-bold text-on-surface text-sm uppercase tracking-wide">NABL Verified</h4>
                    <p className="text-xs text-on-surface/50 mt-1">Batch-wise laboratory testing.</p>
                 </div>
              </div>
            </div>
            <button onClick={() => window.location.href = '/discovery'} className="btn-primary py-4 px-10 w-fit text-sm font-bold uppercase tracking-widest">Resume Medicine Search</button>
          </div>
          <div className="w-full md:w-5/12 bg-primary p-12 lg:p-20 flex flex-col justify-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
               <ShieldCheck className="w-64 h-64" />
            </div>
            <h3 className="font-display text-3xl font-bold mb-6">Social Impact</h3>
            <p className="text-white/80 text-lg leading-relaxed mb-12">By choosing generics, you are contributing to a more sustainable healthcare ecosystem in India.</p>
            <div className="font-display text-7xl font-bold tracking-tighter">₹{(stats.lifetime_savings || 0).toLocaleString('en-IN')}</div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase mt-4">Lifetime Contribution to Self-Wealth</div>
          </div>
        </div>
      </div>
    </div>
  );
}
