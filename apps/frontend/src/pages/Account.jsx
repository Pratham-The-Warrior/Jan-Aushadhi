// ============================================================
// Account Page — the patient's profile in one place
// Tabs: Overview · My medicines · Orders · Savings · Settings
// (replaces the separate /wellness and /dashboard pages)
// ============================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Pill, Package, PiggyBank, Settings as SettingsIcon, LayoutGrid, Plus, LogOut, ChevronRight, Search } from 'lucide-react';
import { getUserDashboard, getRequirements, getDashboardMonthly, cancelRequirement } from '../services/api';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { toast } from '../store/toastStore';
import OrderCard from '../components/account/OrderCard';
import SavingsChart from '../components/account/SavingsChart';
import { formatINR, formatPhone, formatRupees, orderStatus, parseOrderItems } from '../utils/format';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'medicines', label: 'My medicines', icon: Pill },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'savings', label: 'Savings', icon: PiggyBank },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`bg-surface-lowest rounded-2xl ghost-border p-5 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="font-display text-lg font-bold text-on-surface">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="bg-surface-lowest rounded-xl ghost-border p-4">
      <div className="text-sm text-on-surface/60">{label}</div>
      <div className="font-display text-2xl md:text-3xl font-bold text-on-surface mt-1">{value}</div>
      {hint && <div className="text-xs text-on-surface/45 mt-1">{hint}</div>}
    </div>
  );
}

function EmptyNote({ title, body, action }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="font-semibold text-on-surface/80">{title}</p>
      <p className="text-sm text-on-surface/55 mt-1">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function MedicineRow({ med, onAdd }) {
  const saving = med.branded_mrp > med.mrp ? med.branded_mrp - med.mrp : 0;
  return (
    <li className="py-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Pill className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-on-surface leading-snug">{med.name}</div>
        <div className="text-sm text-on-surface/55 mt-0.5">
          {formatINR(med.mrp)}{med.unit_size ? ` per ${med.unit_size}` : ''}
          {saving > 0 && <span className="text-success font-medium"> · saves {formatINR(saving)}</span>}
        </div>
      </div>
      <button onClick={() => onAdd(med)} className="btn-secondary py-1.5 px-3 text-sm font-semibold inline-flex items-center gap-1 shrink-0" aria-label={`Add ${med.name} to cart`}>
        <Plus className="w-4 h-4" /> Add
      </button>
    </li>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview';
  const setTab = (key) => setParams(key === 'overview' ? {} : { tab: key }, { replace: true });

  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [dash, setDash] = useState(null);
  const [orders, setOrders] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getUserDashboard(), getRequirements(), getDashboardMonthly()]).then(([d, r, m]) => {
      if (cancelled) return;
      if (d.status === 'fulfilled') setDash(d.value);
      if (r.status === 'fulfilled') setOrders(r.value?.requirements || []);
      if (m.status === 'fulfilled') setMonthly(m.value?.history || []);
      setLoadError([d, r, m].every((x) => x.status === 'rejected'));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const stats = dash?.stats || { average_savings_percent: 0, annual_savings_projection: 0, lifetime_savings: 0, total_orders: 0 };
  const medicines = dash?.active_prescriptions || [];
  const activeOrders = orders.filter((o) => {
    const step = orderStatus(o.status).step;
    return step !== null && step < 3;
  });

  const displayName = user?.displayName || 'Your account';
  const initials = (user?.displayName || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '🙂';

  const addMedicine = (med) => {
    addItem({
      drug_code: med.code || med.drug_code, name: med.name, mrp: med.mrp, branded_mrp: med.branded_mrp,
      branded_name: med.branded_name, unit_size: med.unit_size, group_name: med.group_name,
    });
    toast.success(`Added ${med.name} to cart`);
  };

  const reorder = (order) => {
    parseOrderItems(order).forEach((item) => addItem({
      drug_code: item.code || item.drug_code, name: item.name, mrp: item.mrp, branded_mrp: item.branded_mrp,
      unit_size: item.unit_size, group_name: item.group_name,
    }));
    navigate('/checkout');
  };

  const cancel = async (order) => {
    if (!window.confirm(`Cancel order #${order.id}?`)) return;
    try {
      await cancelRequirement(order.id, 'Cancelled by customer from account page');
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: 'CANCELLED_BY_CUSTOMER' } : o)));
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.message || 'Could not cancel this order');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/home', { replace: true });
  };

  return (
    <div className="flex-1 w-full bg-surface pb-24">
      {/* Header */}
      <div className="bg-surface-lowest border-b border-outline-variant">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-display text-xl md:text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface truncate">{displayName}</h1>
              <p className="text-sm text-on-surface/60 truncate">
                {[formatPhone(user?.phoneNumber), user?.email].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 mt-6 -mb-px overflow-x-auto no-scrollbar" role="tablist" aria-label="Account sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-3 md:px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface/60 hover:text-on-surface'
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-surface-low animate-pulse" />)}
          </div>
        ) : loadError ? (
          <Panel>
            <EmptyNote
              title="We couldn't load your account"
              body="Please check your connection and try again."
              action={<button onClick={() => window.location.reload()} className="btn-secondary py-2 px-4 text-sm">Try again</button>}
            />
          </Panel>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Total saved" value={formatRupees(stats.lifetime_savings)} hint="vs buying the brands" />
                  <Stat label="Average saving" value={`${Math.round(stats.average_savings_percent || 0)}%`} hint="per order" />
                  <Stat label="Orders" value={stats.total_orders || 0} />
                  <Stat label="Saving this year" value={formatRupees(stats.annual_savings_projection)} hint="estimate at your current pace" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <Panel
                    title={activeOrders.length ? 'Active orders' : 'Recent orders'}
                    action={orders.length > 0 && <button onClick={() => setTab('orders')} className="text-sm font-semibold text-primary inline-flex items-center gap-0.5 hover:underline">All orders <ChevronRight className="w-4 h-4" /></button>}
                    className="lg:col-span-3"
                  >
                    {orders.length === 0 ? (
                      <EmptyNote
                        title="No orders yet"
                        body="Search for your medicine, add the Jan Aushadhi generic to your cart and pick it up from a Kendra."
                        action={<Link to="/discovery" className="btn-primary py-2.5 px-5 text-sm inline-flex items-center gap-2"><Search className="w-4 h-4" /> Find medicines</Link>}
                      />
                    ) : (
                      <div className="space-y-3">
                        {(activeOrders.length ? activeOrders : orders).slice(0, 2).map((o) => (
                          <OrderCard key={o.id} order={o} onReorder={reorder} onCancel={cancel} />
                        ))}
                      </div>
                    )}
                  </Panel>

                  <Panel
                    title="My medicines"
                    action={medicines.length > 0 && <button onClick={() => setTab('medicines')} className="text-sm font-semibold text-primary inline-flex items-center gap-0.5 hover:underline">See all <ChevronRight className="w-4 h-4" /></button>}
                    className="lg:col-span-2"
                  >
                    {medicines.length === 0 ? (
                      <EmptyNote title="Nothing here yet" body="Medicines from your orders appear here for quick reordering." />
                    ) : (
                      <ul className="divide-y divide-outline-variant/50">
                        {medicines.slice(0, 4).map((m) => <MedicineRow key={m.code || m.drug_code || m.name} med={m} onAdd={addMedicine} />)}
                      </ul>
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {tab === 'medicines' && (
              <Panel
                title="My medicines"
                action={medicines.length > 1 && (
                  <button onClick={() => { medicines.forEach(addMedicine); navigate('/checkout'); }} className="btn-primary py-2 px-4 text-sm font-semibold">
                    Order all again
                  </button>
                )}
              >
                {medicines.length === 0 ? (
                  <EmptyNote title="Nothing here yet" body="Medicines from your orders appear here so you can reorder them in one tap." />
                ) : (
                  <ul className="divide-y divide-outline-variant/50">
                    {medicines.map((m) => <MedicineRow key={m.code || m.drug_code || m.name} med={m} onAdd={addMedicine} />)}
                  </ul>
                )}
              </Panel>
            )}

            {tab === 'orders' && (
              orders.length === 0 ? (
                <Panel><EmptyNote title="No orders yet" body="Your orders and their status will appear here." /></Panel>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  {orders.map((o) => <OrderCard key={o.id} order={o} onReorder={reorder} onCancel={cancel} />)}
                </div>
              )
            )}

            {tab === 'savings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Total saved" value={formatRupees(stats.lifetime_savings)} />
                  <Stat label="Average saving" value={`${Math.round(stats.average_savings_percent || 0)}%`} />
                  <Stat label="Saving this year" value={formatRupees(stats.annual_savings_projection)} hint="estimate" />
                  <Stat label="Orders" value={stats.total_orders || 0} />
                </div>
                <Panel title="Month by month">
                  <SavingsChart data={monthly} />
                </Panel>
                {medicines.length > 0 && (
                  <Panel title="Savings by medicine">
                    <div className="overflow-x-auto -mx-5 md:mx-0">
                      <table className="w-full text-sm min-w-[520px]">
                        <thead>
                          <tr className="text-left text-on-surface/55 border-b border-outline-variant">
                            <th className="font-medium py-2 px-5 md:px-0">Medicine</th>
                            <th className="font-medium py-2 text-right">Brand price</th>
                            <th className="font-medium py-2 text-right">Jan Aushadhi</th>
                            <th className="font-medium py-2 text-right px-5 md:px-0">You save</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/50">
                          {medicines.map((m) => {
                            const saving = Math.max(0, (m.branded_mrp || 0) - (m.mrp || 0));
                            return (
                              <tr key={m.code || m.drug_code || m.name}>
                                <td className="py-3 px-5 md:px-0 font-medium text-on-surface">{m.name}</td>
                                <td className="py-3 text-right text-on-surface/60">{m.branded_mrp ? formatINR(m.branded_mrp) : '—'}</td>
                                <td className="py-3 text-right font-semibold">{formatINR(m.mrp)}</td>
                                <td className="py-3 text-right px-5 md:px-0 font-semibold text-success">
                                  {saving > 0 ? `${formatINR(saving)} (${Math.round((saving / m.branded_mrp) * 100)}%)` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                )}
              </div>
            )}

            {tab === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                <Panel title="Profile">
                  <dl className="divide-y divide-outline-variant/50 text-sm">
                    {[
                      ['Name', user?.displayName || 'Not set'],
                      ['Mobile', formatPhone(user?.phoneNumber) || 'Not linked'],
                      ['Email', user?.email || 'Not linked'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-3">
                        <dt className="text-on-surface/60">{k}</dt>
                        <dd className="font-medium text-on-surface text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
                <Panel title="Help & legal">
                  <ul className="divide-y divide-outline-variant/50 text-sm">
                    {[['About this service', '/info/about'], ['Privacy', '/info/privacy'], ['Terms of use', '/info/terms']].map(([label, to]) => (
                      <li key={to}>
                        <Link to={to} className="flex items-center justify-between py-3 font-medium text-on-surface hover:text-primary">
                          {label} <ChevronRight className="w-4 h-4 text-on-surface/40" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <button onClick={handleLogout} className="w-full sm:w-auto py-3 px-5 rounded-xl border border-red-200 text-red-700 font-semibold hover:bg-red-50 inline-flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
