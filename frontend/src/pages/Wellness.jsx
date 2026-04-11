// ============================================================
// Wellness Dashboard — Profile, Refill Alerts, Order History
// Powers the "Health Account" with Quick Reorder
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, AlertCircle, RefreshCw, Package, Droplet, Star, Calendar, ChevronRight } from 'lucide-react';
import { getUserDashboard, getRequirements } from '../services/api';
import useCartStore from '../store/cartStore';

const MOCK_PRESCRIPTIONS = [
  { drug_code: '01342', name: 'Atorvastatin Calcium 10mg', dosage: '1 tablet daily', startDate: '2024-09-01', daysSupply: 30, refillsLeft: 5, status: 'routine' },
  { drug_code: '02551', name: 'Metformin HCL 500mg', dosage: '2 tablets daily', startDate: '2024-08-15', daysSupply: 60, refillsLeft: 2, status: 'critical' },
  { drug_code: '00456', name: 'Telmisartan 40mg', dosage: '1 tablet morning', startDate: '2024-10-01', daysSupply: 30, refillsLeft: 8, status: 'routine' },
];

const MOCK_ORDERS = [
  { id: 'TKT-1712345', date: '2024-11-20', items: 3, total: 258.50, status: 'CONFIRMED', store: 'Vasant Kunj Kendra' },
  { id: 'TKT-1712300', date: '2024-11-05', items: 2, total: 142.00, status: 'CONFIRMED', store: 'Saket Health Kendra' },
  { id: 'TKT-1712200', date: '2024-10-18', items: 4, total: 320.00, status: 'SENT', store: 'Powai Kendra' },
];

export default function Wellness() {
  const navigate = useNavigate();
  const addItem = useCartStore(s => s.addItem);
  const [tab, setTab] = useState('prescriptions');
  const [dashData, setDashData] = useState(null);

  useEffect(() => {
    getUserDashboard().then(setDashData).catch(() => {});
  }, []);

  const stats = dashData?.stats || { average_savings_percent: 87.5, annual_savings_projection: 14580, lifetime_savings: 2430, total_orders: 4 };

  const getDaysLeft = (startDate, supply) => {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + supply * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const handleQuickReorder = (order) => {
    // Re-add items from the order to cart
    MOCK_PRESCRIPTIONS.forEach(p => {
      addItem({ drug_code: p.drug_code, name: p.name, mrp: 50, branded_mrp: 200, unit_size: "30's", group_name: 'Chronic Care' });
    });
    navigate('/checkout');
  };

  return (
    <div className="flex-1 w-full bg-surface pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Profile Header */}
        <div className="bg-surface-lowest rounded-lg ghost-border p-8 md:p-10 mb-10 clinical-shadow">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="w-24 h-24 bg-primary rounded-md flex items-center justify-center text-white text-3xl font-bold shrink-0 font-display">AS</div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="font-display text-3xl font-bold text-on-surface">Dr. Ananya Sharma</h1>
                <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-3 py-1 rounded-sm uppercase tracking-widest flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" /> Prime Member
                </span>
              </div>
              <div className="text-sm text-on-surface/60 mb-6 font-medium">ananya.sharma@hospital.org • +91 98765 43210</div>
              <div className="flex flex-wrap gap-5">
                <div className="bg-surface border border-outline-variant px-5 py-3 rounded-lg">
                  <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Blood Group</div>
                  <div className="font-display text-xl font-bold text-on-surface"><Droplet className="w-4 h-4 inline text-red-500 mr-1.5" />B+</div>
                </div>
                <div className="bg-surface border border-outline-variant px-5 py-3 rounded-lg">
                  <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Lifetime Savings</div>
                  <div className="font-display text-xl font-bold text-primary">₹{stats.lifetime_savings.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-surface border border-outline-variant px-5 py-3 rounded-lg">
                  <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Total Orders</div>
                  <div className="font-display text-xl font-bold text-on-surface">{stats.total_orders}</div>
                </div>
                <div className="bg-surface border border-outline-variant px-5 py-3 rounded-lg">
                  <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Avg. Savings</div>
                  <div className="font-display text-xl font-bold text-primary">{stats.average_savings_percent}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-outline-variant overflow-x-auto no-scrollbar">
          {[
            { key: 'prescriptions', label: 'Active Prescriptions', icon: <Pill className="w-4 h-4" /> },
            { key: 'orders', label: 'Order History', icon: <Package className="w-4 h-4" /> },
            { key: 'refills', label: 'Refill Alerts', icon: <Clock className="w-4 h-4" /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                tab === t.key ? 'text-primary border-b-[3px] border-primary' : 'text-on-surface/50 hover:text-on-surface/80 border-b-2 border-transparent'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Active Prescriptions */}
        {tab === 'prescriptions' && (
          <div className="space-y-5">
            {MOCK_PRESCRIPTIONS.map(p => {
              const daysLeft = getDaysLeft(p.startDate, p.daysSupply);
              return (
                <div key={p.drug_code} className="bg-surface-lowest rounded-lg ghost-border p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 clinical-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display text-xl font-bold text-on-surface">{p.name}</h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest ${
                        p.status === 'critical'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-sm text-on-surface/60 font-medium">{p.dosage} • {p.refillsLeft} refills remaining</div>
                  </div>
                  <div className="flex flex-wrap md:flex-nowrap items-center gap-8 md:gap-10 w-full md:w-auto">
                    <div className="text-center">
                      <div className={`font-display text-3xl font-bold ${daysLeft <= 5 ? 'text-red-600' : 'text-primary'}`}>{daysLeft}</div>
                      <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mt-0.5">Days Left</div>
                    </div>
                    <button
                      onClick={() => { addItem({ drug_code: p.drug_code, name: p.name, mrp: 50, branded_mrp: 200, unit_size: "30's", group_name: 'Chronic' }); navigate('/checkout'); }}
                      className="btn-primary py-3 px-6 flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                      <RefreshCw className="w-4 h-4" /> Refill Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Order History */}
        {tab === 'orders' && (
          <div className="space-y-5">
            {MOCK_ORDERS.map(order => (
              <div key={order.id} className="bg-surface-lowest rounded-lg ghost-border p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 clinical-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-xl font-bold text-on-surface">{order.id}</h3>
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-widest ${
                      order.status === 'CONFIRMED'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-on-surface/5 text-on-surface border border-on-surface/10'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-sm text-on-surface/60 flex items-center gap-5 font-medium">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {order.date}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{order.items} items</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{order.store}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end mt-4 md:mt-0">
                  <div className="text-right">
                    <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-0.5">Total</div>
                    <div className="font-display text-2xl font-bold text-primary">₹{order.total.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleQuickReorder(order)}
                    className="btn-secondary py-3 px-5 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Quick Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refill Alerts */}
        {tab === 'refills' && (
          <div className="space-y-5">
            {MOCK_PRESCRIPTIONS.map(p => {
              const daysLeft = getDaysLeft(p.startDate, p.daysSupply);
              const urgent = daysLeft <= 5;
              return (
                <div key={p.drug_code} className={`rounded-lg ghost-border p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 clinical-shadow ${
                  urgent ? 'bg-red-50 border-red-200' : 'bg-surface-lowest'
                }`}>
                  <div className={`w-14 h-14 rounded-md flex items-center justify-center shrink-0 ${urgent ? 'bg-red-100' : 'bg-primary/10'}`}>
                    {urgent ? <AlertCircle className="w-7 h-7 text-red-600" /> : <Clock className="w-7 h-7 text-primary" />}
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className={`font-display text-xl font-bold mb-1 ${urgent ? 'text-red-800' : 'text-on-surface'}`}>{p.name}</h3>
                    <div className={`text-sm font-medium ${urgent ? 'text-red-600' : 'text-on-surface/60'}`}>
                      {urgent ? `⚠ Only ${daysLeft} days of supply remaining — refill immediately` : `${daysLeft} days remaining • Next refill in ${daysLeft - 5} days`}
                    </div>
                  </div>
                  <button
                    onClick={() => { addItem({ drug_code: p.drug_code, name: p.name, mrp: 50, branded_mrp: 200, unit_size: "30's", group_name: 'Refill' }); navigate('/checkout'); }}
                    className={`py-3 px-6 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all w-full sm:w-auto ${
                      urgent
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow'
                        : 'btn-primary'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" /> {urgent ? 'Urgent Refill' : 'Schedule Refill'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Pill(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m10.5 1.5 3 3-8.5 8.5a4.95 4.95 0 1 1-3-3l8.5-8.5zM6 11l4.5-4.5" /><circle cx="17.5" cy="6.5" r="4.5" /></svg>;
}
