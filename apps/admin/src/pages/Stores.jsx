// ============================================================
// Admin Console — Store Management (Kendra Registry)
// View stores, toggle suspension states, assign seller operators.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Store, Search, RefreshCw, ChevronLeft, ChevronRight, Eye, ShieldAlert,
  UserPlus, CheckCircle, AlertTriangle, X, ShieldCheck, MapPin, Phone
} from 'lucide-react';
import { getStores, getStore, updateStoreStatus, assignSellerToStore } from '../services/admin.api';

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  
  // Modals
  const [selectedStore, setSelectedStore] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // stores store code
  const [operatorName, setOperatorName] = useState('');
  const [operatorPhone, setOperatorPhone] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [operatorPassword, setOperatorPassword] = useState('');
  const [toast, setToast] = useState(null);

  const loadStores = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await getStores({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        state: stateFilter || undefined,
        page,
        limit: 25
      });
      setStores(data.stores || []);
      setTotalCount(data.count || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Load stores error:', err);
      showToast('danger', 'Failed to fetch stores directory');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, stateFilter, page]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleStatus = async (code, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionLoading(code + nextStatus);
    try {
      await updateStoreStatus(code, nextStatus);
      showToast('success', `Kendra ${code} marked as ${nextStatus}`);
      
      // Update local state
      setStores(prev => prev.map(s => s.pmbjk_code === code ? { ...s, status: nextStatus } : s));
      if (selectedStore?.pmbjk_code === code) {
        setSelectedStore(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      console.error('Toggle store status error:', err);
      showToast('danger', err.message || 'Failed to update store status');
    } finally {
      setActionLoading('');
    }
  };

  const handleOpenDetail = async (code) => {
    setDetailLoading(true);
    try {
      const data = await getStore(code);
      setSelectedStore(data);
    } catch (err) {
      console.error('Fetch store detail error:', err);
      showToast('danger', 'Failed to retrieve store profile');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAssignSeller = async (e) => {
    e.preventDefault();
    if (!operatorName || operatorName.trim().length < 2) {
      showToast('danger', 'Enter a valid Operator Name');
      return;
    }
    if (!operatorPhone || operatorPhone.trim().length < 10) {
      showToast('danger', 'Enter a valid 10-digit Phone Number');
      return;
    }
    if (!operatorPassword || operatorPassword.length < 6) {
      showToast('danger', 'Password must be at least 6 characters');
      return;
    }

    setActionLoading('assign');
    try {
      await assignSellerToStore(assignModal, {
        name: operatorName.trim(),
        phone: operatorPhone.trim(),
        email: operatorEmail.trim() || undefined,
        password: operatorPassword
      });
      showToast('success', `Operator credentials successfully provisioned for store ${assignModal}`);
      setAssignModal(null);
      setOperatorName('');
      setOperatorPhone('');
      setOperatorEmail('');
      setOperatorPassword('');
      loadStores(false);
    } catch (err) {
      console.error('Assign seller error:', err);
      showToast('danger', err.message || 'Failed to link operator');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
          padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: toast.type === 'success' ? '1px solid var(--color-brand-500)' : '1px solid var(--color-danger-500)',
          color: toast.type === 'success' ? 'var(--color-brand-400)' : 'var(--color-danger-500)',
          animation: 'fadeIn 0.2s ease forwards'
        }}>
          {toast.type === 'success' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Kendra Registry</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Overview of all PMBJK Kendra stores. Update activation states and link user accounts.
          </p>
        </div>
        <button onClick={() => loadStores(true)} className="btn-secondary" aria-label="Refresh Registry">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', padding: '1rem' }} className="max-md:!grid-cols-1">
        
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by store name or PMBJK code..."
            className="input"
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status */}
        <select 
          className="input"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ background: 'var(--color-surface-700)', cursor: 'pointer' }}
        >
          <option value="">All Activation States</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CLOSED">Permanently Closed</option>
        </select>

        {/* State */}
        <input
          type="text"
          placeholder="Filter by State (e.g. Maharashtra)"
          className="input"
          value={stateFilter}
          onChange={e => { setStateFilter(e.target.value); setPage(1); }}
        />

      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--color-surface-600)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : stores.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--color-text-muted)' }}>
            <Store size={44} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>No Kendras matching criteria</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PMBJK Code</th>
                  <th>Store Name</th>
                  <th>District / State</th>
                  <th>Linked Operator</th>
                  <th>Status</th>
                  <th>License Verification</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.pmbjk_code}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem' }}>{s.pmbjk_code}</td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.phone || 'No phone linked'}</p>
                      </div>
                    </td>
                    <td>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{s.district}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.state}</p>
                    </td>
                    <td>
                      {s.seller_uid ? (
                        <div>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>{s.seller_name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{s.seller_uid.slice(0, 10)}...</p>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No seller linked</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'ACTIVE' ? 'badge-ready' : 'badge-cancelled'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      {s.verified_at ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-brand-400)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={12} /> Verified
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} /> Unverified
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleOpenDetail(s.pmbjk_code)} className="btn-icon" title="View Kendra Profile" aria-label="View details">
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => setAssignModal(s.pmbjk_code)} 
                          className="btn-icon" 
                          style={{ color: '#3b82f6' }}
                          title="Assign Operator Account"
                          aria-label="Assign operator"
                        >
                          <UserPlus size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s.pmbjk_code, s.status)}
                          className={`btn-icon ${s.status === 'ACTIVE' ? 'text-amber-500' : 'text-emerald-500'}`}
                          title={s.status === 'ACTIVE' ? 'Suspend Store' : 'Activate Store'}
                          disabled={actionLoading === s.pmbjk_code + 'ACTIVE' || actionLoading === s.pmbjk_code + 'SUSPENDED'}
                          aria-label={s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        >
                          {s.status === 'ACTIVE' ? <ShieldAlert size={14} /> : <CheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
            padding: '1rem', borderTop: '1px solid var(--color-border)',
          }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-icon" disabled={page <= 1}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="btn-icon" disabled={page >= totalPages}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Assign Seller Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleAssignSeller} style={{ maxWidth: '480px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={22} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Provision Kendra Operator</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Store Code: {assignModal}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              
              {/* Operator Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Operator Name *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  value={operatorName}
                  onChange={e => setOperatorName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              {/* Operator Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Operator Phone *
                </label>
                <input
                  type="tel"
                  className="input"
                  required
                  value={operatorPhone}
                  onChange={e => setOperatorPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>

              {/* Operator Email (Optional) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Operator Email (Optional)
                </label>
                <input
                  type="email"
                  className="input"
                  value={operatorEmail}
                  onChange={e => setOperatorEmail(e.target.value)}
                  placeholder={`e.g. name@domain.com (defaults to ${assignModal.toLowerCase()}@seller.janaushadhi.local)`}
                />
              </div>

              {/* Account Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Account Password *
                </label>
                <input
                  type="password"
                  className="input"
                  required
                  minLength={6}
                  value={operatorPassword}
                  onChange={e => setOperatorPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1.25rem' }}>
                This creates or updates the credentials in the authentication system. The operator will be linked as <span style={{ fontWeight: 600, color: 'white' }}>STORE_OWNER</span> and log in using their **Store Code / Seller ID** and this password.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAssignModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" style={{ background: '#3b82f6' }} disabled={actionLoading === 'assign'}>
                {actionLoading === 'assign' ? 'Provisioning...' : 'Provision Operator'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Store Detail Slide-Over */}
      {selectedStore && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedStore(null)} />
          <div className="slide-over animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Kendra Registry File</h2>
              <button onClick={() => setSelectedStore(null)} className="btn-icon"><X size={18} /></button>
            </div>

            {/* Profile Info */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedStore.name}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>Code: {selectedStore.pmbjk_code}</p>
              
              <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <MapPin size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: '0.8125rem' }}>{selectedStore.address}, {selectedStore.district}, {selectedStore.state} - {selectedStore.pincode}</span>
                </div>
                {selectedStore.phone && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Phone size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem' }}>{selectedStore.phone}</span>
                  </div>
                )}
                {selectedStore.upi_vpa && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <CheckCircle size={14} style={{ color: 'var(--color-brand-400)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>UPI: {selectedStore.upi_vpa}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seller Info */}
            <div className="card">
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>LINKED OPERATOR</h4>
              {selectedStore.seller_uid ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedStore.seller_name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Email: {selectedStore.seller_email || 'No email linked'}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Phone: {selectedStore.seller_phone || 'N/A'}</p>
                  <p style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 4 }}>UID: {selectedStore.seller_uid}</p>
                </div>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No administrator assigned to this Kendra yet.</p>
              )}
            </div>

            {/* Performance Stats */}
            <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-surface-700)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Fulfillment count</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginTop: 4 }}>{selectedStore.stats?.total_orders || 0}</p>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-surface-700)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Store GMV</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-brand-400)', marginTop: 4 }}>₹{selectedStore.stats?.total_revenue?.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
