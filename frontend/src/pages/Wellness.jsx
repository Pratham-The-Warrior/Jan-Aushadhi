// ============================================================
// Wellness Dashboard — Modern Health Account (Bento Box)
// High-density grid architecture for all health metrics
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Calendar, Pill, History, ShieldCheck, LogOut,
  TrendingUp, Heart, Activity, Sparkles, Phone, Mail, Search,
  RefreshCw, ArrowRight, Zap, Droplet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserDashboard, getRequirements } from '../services/api';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

export default function Wellness() {
  const navigate = useNavigate();
  const addItem = useCartStore(s => s.addItem);
  const user = useAuthStore(s => s.user);
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

  const initials = user?.displayName?.substring(0, 2).toUpperCase() 
    || user?.phoneNumber?.slice(-2) 
    || 'JA';

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const fadeUpItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex-1 w-full bg-surface min-h-screen pb-32">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* Bento Grid Container */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min"
        >

          {/* ═══════════════════════════════════════════════════ */}
          {/* HORIZONTAL PROFILE BANNER (Spans 12 cols)           */}
          {/* ═══════════════════════════════════════════════════ */}
          <motion.div variants={fadeUpItem} className="md:col-span-12 bg-gradient-to-r from-primary via-primary-dim to-[#003d3d] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500">
            {/* Background patterns */}
            <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle_at_50%_120%,_white_40%,_transparent_80%)]" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-6 w-full">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-4xl font-extrabold font-display border border-white/20 shadow-lg">
                  {initials}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-success rounded-full p-1 border-2 border-primary-dim">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2 truncate">
                  {user?.displayName || 'JanAushadhi User'}
                </h1>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-white/70 text-sm font-medium">
                  {user?.phoneNumber && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-white/50" /> {user.phoneNumber}
                    </div>
                  )}
                  {user?.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-white/50" /> {user.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 w-full md:w-auto">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center sm:text-right w-full sm:w-auto">
                  <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">Total Lifetime Savings</div>
                  <div className="font-display text-3xl md:text-4xl font-extrabold tracking-tighter text-white">
                    ₹{(stats.lifetime_savings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* STATS BENTO (Spans 12 cols, 4 inline cards)         */}
          {/* ═══════════════════════════════════════════════════ */}
          <motion.div variants={fadeUpItem} className="md:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatBento 
              icon={<TrendingUp className="w-6 h-6 text-primary" />}
              label="Savings Rate"
              value={`${Math.round(stats.average_savings_percent)}%`}
              sub="Avg vs Branded"
              color="primary"
            />
            <StatBento 
              icon={<Package className="w-6 h-6 text-accent" />}
              label="Orders"
              value={stats.total_orders}
              sub="Lifetime Orders"
              color="accent"
            />
            <StatBento 
              icon={<Activity className="w-6 h-6 text-success" />}
              label="Active Meds"
              value={activeMeds.length}
              sub="Monitored"
              color="success"
            />
            <StatBento 
              icon={<Heart className="w-6 h-6 text-warning" />}
              label="Annual Proj."
              value={`₹${((stats.annual_savings_projection || 0) / 1000).toFixed(1)}k`}
              sub="Est. Savings"
              color="warning"
            />
          </motion.div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* ACTIVE MEDICATIONS BENTO                            */}
          {/* ═══════════════════════════════════════════════════ */}
          <motion.div variants={fadeUpItem} className="md:col-span-12 lg:col-span-7 bg-surface-lowest rounded-3xl ghost-border p-6 md:p-8 flex flex-col h-[500px] shadow-sm hover:shadow-lg transition-shadow duration-300">
            <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-on-surface flex items-center gap-3">
                  <Pill className="w-6 h-6 text-primary" /> My Medicines
                </h2>
                <p className="text-sm text-on-surface/50 font-medium mt-1">Easily reorder your chronic medications</p>
              </div>
              <button onClick={() => navigate('/discovery')} className="text-primary hover:text-primary-dim p-2 rounded-full hover:bg-primary/5 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface/50">Fetching Meds...</div>
              </div>
            ) : activeMeds.length === 0 ? (
              <EmptyBento icon={<Droplet />} title="No Active Meds" subtitle="Start tracking medicines by ordering" />
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-4">
                {activeMeds.map((med, idx) => (
                  <motion.div variants={fadeUpItem} whileHover={{ scale: 1.01 }} key={idx} className="bg-surface-low rounded-2xl p-5 flex items-center gap-4 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                      <Pill className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{med.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-on-surface/50 uppercase tracking-widest font-bold">
                        <span>{med.code || med.drug_code}</span>
                        <span className="w-1 h-1 bg-on-surface/20 rounded-full" />
                        <span>{med.unit_size || 'Std Pack'}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2 shrink-0">
                      <div className="font-display font-bold text-on-surface">₹{(med.mrp || 0).toFixed(2)}</div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          addItem({ drug_code: med.code || med.drug_code, name: med.name, mrp: med.mrp, branded_mrp: med.branded_mrp, unit_size: med.unit_size, group_name: 'Chronic' });
                          navigate('/checkout');
                        }}
                        className="bg-white border border-outline-variant text-on-surface hover:bg-primary hover:text-white hover:border-primary px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3" /> Reorder
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* RECENT ORDERS BENTO                                 */}
          {/* ═══════════════════════════════════════════════════ */}
          <motion.div variants={fadeUpItem} className="md:col-span-12 lg:col-span-5 bg-surface-lowest rounded-3xl ghost-border p-6 md:p-8 flex flex-col h-[500px] shadow-sm hover:shadow-lg transition-shadow duration-300">
            <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-on-surface flex items-center gap-3">
                  <History className="w-6 h-6 text-accent" /> Order History
                </h2>
                <p className="text-sm text-on-surface/50 font-medium mt-1">Past fulfillment tickets</p>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface/50">Fetching History...</div>
              </div>
            ) : orders.length === 0 ? (
              <EmptyBento icon={<Package />} title="No History" subtitle="Your completed orders will appear here" />
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-4">
                {orders.map(order => {
                  const itemCount = (() => {
                    try { return Array.isArray(JSON.parse(order.items)) ? JSON.parse(order.items).length : 0; } catch { return 0; }
                  })();
                  const isConfirmed = order.status === 'CONFIRMED';

                  return (
                    <motion.div variants={fadeUpItem} whileHover={{ scale: 1.01 }} key={order.id} className="border border-outline-variant/50 rounded-2xl p-5 hover:border-accent/30 transition-colors group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-sm text-on-surface mb-1">Ticket #{order.id}</div>
                          <div className="text-[10px] text-on-surface/40 uppercase font-bold tracking-widest flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
                          isConfirmed ? 'bg-success-soft text-success' : 'bg-surface-low text-on-surface/60'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs font-semibold text-on-surface/70">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'} • ₹{parseFloat(order.total_generic_value).toFixed(2)}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleQuickReorder(order)}
                          className="text-accent hover:text-accent-hover text-xs font-bold flex items-center gap-1 hover:underline"
                        >
                          Reorder <ArrowRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* REFILL ALERTS BENTO (Spans 12 cols)                 */}
          {/* ═══════════════════════════════════════════════════ */}
          <motion.div variants={fadeUpItem} className="md:col-span-12 bg-success-soft/30 border border-success/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-success-soft/50 transition-colors duration-300">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center shrink-0">
                <Zap className="w-7 h-7 text-success" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-success-dark mb-1">Smart Refill Monitoring Active</h3>
                <p className="text-sm font-medium text-success/80">
                  Tracking {activeMeds.length} active medications. You'll receive automated WhatsApp alerts when it's time to reorder.
                </p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-success text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-success/90 transition-colors shrink-0 shadow-sm shadow-success/20">
              Setup Auto-Refill
            </motion.button>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}

// ── Reusable: Small Stat Bento ──────────────────────────────────
function StatBento({ icon, label, value, sub, color }) {
  const colorMap = {
    primary: 'bg-primary-light border-primary/20',
    success: 'bg-success-soft border-success/20',
    accent:  'bg-accent-soft border-accent/20',
    warning: 'bg-warning-soft border-warning/20',
  };
  const bgClass = colorMap[color] || colorMap.primary;

  return (
    <div className={`rounded-3xl p-6 border flex flex-col justify-between h-[180px] hover:scale-[1.02] transition-transform duration-300 ${bgClass}`}>
      <div className="w-12 h-12 bg-white/50 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40 mb-1">{label}</div>
        <div className="font-display text-3xl font-extrabold tracking-tighter text-on-surface">{value}</div>
        <div className="text-[10px] font-bold text-on-surface/30 uppercase mt-1">{sub}</div>
      </div>
    </div>
  );
}

// ── Reusable: Empty Bento State ────────────────────────────────
function EmptyBento({ icon, title, subtitle }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
      <div className="w-16 h-16 bg-surface-low rounded-2xl flex items-center justify-center mb-4 text-on-surface">
        {icon}
      </div>
      <h4 className="font-bold text-lg">{title}</h4>
      <p className="text-xs mt-1">{subtitle}</p>
    </div>
  );
}
