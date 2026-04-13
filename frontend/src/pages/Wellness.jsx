// ============================================================
// Wellness Dashboard — Profile, Refill Alerts, Order History
// Powers the "Health Account" with Quick Reorder
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, AlertCircle, RefreshCw, Package, Droplet, Star, Calendar, ChevronRight, Pill, History, ShieldCheck } from 'lucide-react';
import { getUserDashboard, getRequirements } from '../services/api';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

export default function Wellness() {
  const navigate = useNavigate();
  const addItem = useCartStore(s => s.addItem);
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState('prescriptions');
  const [dashData, setDashData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dash, reqs] = await Promise.all([
          getUserDashboard(),
          getRequirements()
        ]);
        setDashData(dash);
        setOrders(reqs?.requirements || []);
      } catch (err) {
        console.error('Wellness sync failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = dashData?.stats || { average_savings_percent: 0, annual_savings_projection: 0, lifetime_savings: 0, total_orders: 0 };
  const activeMeds = dashData?.active_prescriptions || [];

  const handleQuickReorder = (order) => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    items.forEach(item => {
      addItem({
        drug_code: item.code || item.drug_code,
        name: item.name,
        mrp: item.mrp,
        branded_mrp: item.branded_mrp,
        unit_size: item.unit_size || "Standard",
        group_name: item.group_name || "General"
      });
    });
    navigate('/checkout');
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center py-40 bg-surface">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
      <div className="text-on-surface/50 font-bold text-xs uppercase tracking-widest">Verifying Health Records...</div>
    </div>
  );

  return (
    <div className="flex-1 w-full bg-surface pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Profile Header */}
        <div className="bg-surface-lowest rounded-lg ghost-border p-8 md:p-12 mb-12 clinical-shadow animate-slideUp">
          <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
            <div className="w-28 h-28 bg-primary/10 border-4 border-primary/20 rounded-md flex items-center justify-center text-primary text-4xl font-bold shrink-0 font-display">
              {user?.name?.substring(0, 2).toUpperCase() || 'JA'}
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
                <h1 className="font-display text-4xl font-bold text-on-surface">{user?.name || 'Jan Aushadhi User'}</h1>
                <div className="flex gap-2">
                  <span className="bg-primary text-white border border-primary text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-[0.15em] flex items-center gap-2 shadow-sm">
                    <ShieldCheck className="w-4 h-4" /> Verified Citizen
                  </span>
                </div>
              </div>
              <div className="text-sm text-on-surface/50 mb-8 font-bold uppercase tracking-widest flex items-center gap-4">
                <span>{user?.email || 'No email synced'}</span>
                <span className="opacity-20">•</span>
                <span>{user?.phone_number || 'OTP Verified'}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-low border border-outline-variant/50 px-6 py-4 rounded shadow-inner">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-on-surface/40 uppercase mb-2">Health Grade</div>
                  <div className="font-display text-xl font-bold text-on-surface flex items-center gap-2">Clinical Match</div>
                </div>
                <div className="bg-surface-low border border-outline-variant/50 px-6 py-4 rounded shadow-inner">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-on-surface/40 uppercase mb-2">Lifetime Delta</div>
                  <div className="font-display text-xl font-bold text-primary">₹{(stats.lifetime_savings || 0).toFixed(2)}</div>
                </div>
                <div className="bg-surface-low border border-outline-variant/50 px-6 py-4 rounded shadow-inner">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-on-surface/40 uppercase mb-2">Fulfillments</div>
                  <div className="font-display text-xl font-bold text-on-surface">{stats.total_orders} Tickets</div>
                </div>
                <div className="bg-surface-low border border-outline-variant/50 px-6 py-4 rounded shadow-inner">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-on-surface/40 uppercase mb-2">Efficiency</div>
                  <div className="font-display text-xl font-bold text-primary">{Math.round(stats.average_savings_percent)}% Savings</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-10 border-b border-outline-variant overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { key: 'prescriptions', label: 'Active Molecules', icon: <Pill className="w-4 h-4" /> },
            { key: 'orders', label: 'Ticket History', icon: <History className="w-4 h-4" /> },
            { key: 'refills', label: 'Clinical Alerts', icon: <AlertCircle className="w-4 h-4" /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-3 px-10 py-5 text-[11px] font-bold transition-all whitespace-nowrap uppercase tracking-widest relative ${
                tab === t.key 
                  ? 'text-primary' 
                  : 'text-on-surface/40 hover:text-on-surface/80'
              }`}
            >
              {t.icon} {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary animate-widthGrow" />}
            </button>
          ))}
        </div>

        {/* Tab Content: Active Molecules */}
        {tab === 'prescriptions' && (
          <div className="space-y-6 animate-slideUp">
            {activeMeds.length === 0 ? (
              <div className="py-24 text-center bg-surface-lowest rounded-lg ghost-border border-dashed opacity-50">
                <Pill className="w-12 h-12 mx-auto mb-4 text-on-surface/20" />
                <p className="font-bold text-xs uppercase tracking-[0.2em]">No active requirements tracked</p>
              </div>
            ) : (
              activeMeds.map((med, idx) => (
                <div key={idx} className="bg-surface-lowest rounded-lg ghost-border p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 clinical-shadow transition-all hover:border-primary/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="font-display text-2xl font-bold text-on-surface">{med.name}</h3>
                      <span className="bg-primary/5 text-primary text-[9px] font-bold px-3 py-1 rounded-sm uppercase tracking-widest border border-primary/10">Active Treatment</span>
                    </div>
                    <div className="text-sm text-on-surface/40 font-bold uppercase tracking-[0.1em]">
                      Jan Aushadhi Code: {med.code || med.drug_code} • {med.unit_size || 'Standard Pack'}
                    </div>
                  </div>
                  <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="text-right">
                       <div className="text-[10px] font-bold tracking-[0.2em] text-on-surface/40 uppercase mb-1">Standard Net MRP</div>
                       <div className="font-display text-3xl font-bold text-primary">₹{(med.mrp || 0).toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => {
                        addItem({ drug_code: med.code || med.drug_code, name: med.name, mrp: med.mrp, branded_mrp: med.branded_mrp, unit_size: med.unit_size, group_name: 'Chronic' });
                        navigate('/checkout');
                      }}
                      className="btn-primary py-4 px-8 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/10"
                    >
                      <RefreshCw className="w-4 h-4" /> Quick Reorder
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content: Ticket History */}
        {tab === 'orders' && (
          <div className="space-y-6 animate-slideUp">
            {orders.length === 0 ? (
              <div className="py-24 text-center bg-surface-lowest rounded-lg ghost-border border-dashed opacity-50">
                <History className="w-12 h-12 mx-auto mb-4 text-on-surface/20" />
                <p className="font-bold text-xs uppercase tracking-[0.2em]">Transaction logs clear</p>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-surface-lowest rounded-lg ghost-border p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 clinical-shadow transition-all hover:border-primary/10">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <h3 className="font-display text-xl font-bold text-on-surface">{order.id}</h3>
                      <span className={`text-[9px] font-bold px-3 py-1 rounded-sm uppercase tracking-widest border ${
                        order.status === 'CONFIRMED'
                          ? 'bg-primary/5 text-primary border-primary/20'
                          : 'bg-on-surface/5 text-on-surface/50 border-on-surface/10'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-on-surface/40">
                      <span className="flex items-center gap-2 font-body font-medium italic"><Calendar className="w-3.5 h-3.5" /> {new Date(order.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-2 font-body font-medium italic"><Package className="w-3.5 h-3.5" /> {Array.isArray(JSON.parse(order.items)) ? JSON.parse(order.items).length : 0} Pharmaceutical Units</span>
                      <span className="flex items-center gap-2 font-body font-medium italic"><RefreshCw className="w-3.5 h-3.5" /> Code: {order.pmbjk_code}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-[10px] font-bold tracking-[0.2em] text-on-surface/40 uppercase mb-1">Ticket Total</div>
                      <div className="font-display text-3xl font-bold text-on-surface">₹{parseFloat(order.total_generic_value).toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => handleQuickReorder(order)}
                      className="btn-secondary py-4 px-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                    >
                      <RefreshCw className="w-4 h-4" /> Repeat Requirement
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content: Clinical Alerts */}
        {tab === 'refills' && (
          <div className="space-y-6 animate-slideUp">
            {activeMeds.length === 0 ? (
               <div className="py-40 text-center opacity-30">
                  <AlertCircle className="w-16 h-16 mx-auto mb-6" />
                  <p className="font-bold text-xs uppercase tracking-[0.3em]">Institutional health monitoring offline</p>
               </div>
            ) : (
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-12 text-center">
                 <Clock className="w-12 h-12 text-primary mx-auto mb-6" />
                 <h2 className="font-display text-2xl font-bold text-on-surface mb-2">Refill Automation System</h2>
                 <p className="text-sm text-on-surface/60 max-w-md mx-auto leading-relaxed">
                   The platform is currently monitoring {activeMeds.length} active molecules. You will receive WhatsApp notifications for refills based on your calculated days of supply.
                 </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
