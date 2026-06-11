// ============================================================
// Admin Console — User Management
// Search user accounts, assign roles, suspend/reactivate profiles,
// and view customer spending/savings statistics.
// (v2 — Polished table, skeletons, details panels, transitions)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, RefreshCw, ChevronLeft, ChevronRight, Eye, ShieldAlert,
  UserCheck, Ban, ShieldCheck, X, ShoppingBag, PiggyBank, CreditCard
} from 'lucide-react';
import { getUsers, getUser, updateUserRole, suspendUser } from '../services/admin.api';

// Skeleton Components
function SkeletonUserRow() {
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div className="skeleton skeleton-line" style={{ width: 130, height: 14 }} />
          <div className="skeleton skeleton-line" style={{ width: 90, height: 11 }} />
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div className="skeleton skeleton-line" style={{ width: 140, height: 14 }} />
          <div className="skeleton skeleton-line" style={{ width: 80, height: 11 }} />
        </div>
      </td>
      <td>
        <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 999 }} />
      </td>
      <td>
        <div className="skeleton skeleton-line" style={{ width: 100, height: 14 }} />
      </td>
      <td>
        <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 999 }} />
      </td>
      <td>
        <div className="skeleton skeleton-line" style={{ width: 90, height: 14 }} />
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 10 }} />
        </div>
      </td>
    </tr>
  );
}

function SkeletonDetail() {
  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton skeleton-line" style={{ width: 160, height: 16 }} />
        <div className="skeleton skeleton-line" style={{ width: 180, height: 12 }} />
        <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />
        <div className="skeleton skeleton-line" style={{ width: 120, height: 14 }} />
        <div className="skeleton skeleton-line" style={{ width: 140, height: 14 }} />
        <div className="skeleton skeleton-line" style={{ width: 100, height: 14 }} />
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton skeleton-line" style={{ width: 120, height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          <div className="skeleton" style={{ height: 50, borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: 50, borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: 50, borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  // Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roleModal, setRoleModal] = useState(null); // stores user object
  const [newRole, setNewRole] = useState('CUSTOMER');
  const [linkedStoreCode, setLinkedStoreCode] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadUsers = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setTimeout(() => setLoading(true), 0);
    }
    try {
      const data = await getUsers({
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        page,
        limit: 25
      });
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Load users error:', err);
      showToast('danger', 'Failed to fetch users registry');
    } finally {
      setTimeout(() => setLoading(false), 0);
    }
  }, [searchQuery, roleFilter, page, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(true);
    }, 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const handleToggleSuspend = async (uid, isCurrentlySuspended) => {
    const shouldSuspend = !isCurrentlySuspended;
    setActionLoading(uid + 'suspend');
    try {
      await suspendUser(uid, shouldSuspend);
      showToast('success', `User successfully ${shouldSuspend ? 'suspended' : 'reactivated'}`);
      
      // Update local state
      setUsers(prev => prev.map(u => u.firebase_uid === uid ? { ...u, is_suspended: shouldSuspend } : u));
      if (selectedUser?.firebase_uid === uid) {
        setSelectedUser(prev => ({ ...prev, is_suspended: shouldSuspend }));
      }
    } catch (err) {
      console.error('Suspend user error:', err);
      showToast('danger', err.message || 'Failed to update user lock state');
    } finally {
      setActionLoading('');
    }
  };

  const handleOpenDetail = async (uid) => {
    setDetailLoading(true);
    setSelectedUser({ firebase_uid: uid }); // instantly slide open, showing skeleton
    try {
      const data = await getUser(uid);
      setSelectedUser(data);
    } catch (err) {
      console.error('Fetch user detail error:', err);
      showToast('danger', 'Failed to retrieve user profile');
      setSelectedUser(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRoleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (newRole === 'STORE_OWNER' && !linkedStoreCode) {
      showToast('danger', 'Linked PMBJK store code is required');
      return;
    }
    setActionLoading('role');
    try {
      await updateUserRole(roleModal.firebase_uid, newRole, newRole === 'STORE_OWNER' ? linkedStoreCode.trim() : null);
      showToast('success', 'User role updated successfully');
      setRoleModal(null);
      setLinkedStoreCode('');
      loadUsers(false);
    } catch (err) {
      console.error('Role update error:', err);
      showToast('danger', err.message || 'Failed to update credentials');
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>User Directory</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Control user access roles, promote store operators, manage suspensions, and check client activity logs.
          </p>
        </div>
        <button onClick={() => loadUsers(true)} className="btn-secondary" aria-label="Refresh Registry" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="card grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 p-4">
        
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search users by name, email or phone..."
            className="input"
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <select 
          className="input"
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ background: 'var(--color-surface-700)', cursor: 'pointer' }}
        >
          <option value="">All Account Roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="STORE_OWNER">Store Owner</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>

      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {users.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--color-text-muted)', gap: '1rem', padding: '2rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
            }}>
              <Users size={32} style={{ color: 'var(--color-brand-500)' }} />
            </div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>No Users Found</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 300 }}>
              We couldn't find any user profiles matching your search filters.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Contact info</th>
                  <th>Role</th>
                  <th>Linked Kendra</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody className={loading ? '' : 'stagger-children'}>
                {loading ? (
                  <>
                    <SkeletonUserRow />
                    <SkeletonUserRow />
                    <SkeletonUserRow />
                    <SkeletonUserRow />
                    <SkeletonUserRow />
                  </>
                ) : (
                  users.map((u) => (
                    <tr key={u.firebase_uid}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.name || 'Anonymous User'}</p>
                          <p style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{u.firebase_uid}</p>
                        </div>
                      </td>
                      <td>
                        <p style={{ fontSize: '0.8125rem' }}>{u.email || '—'}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.phone || '—'}</p>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-cancelled' : u.role === 'STORE_OWNER' ? 'badge-accepted' : 'badge-pending'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {u.linked_pmbjk_code || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>None</span>}
                      </td>
                      <td>
                        <span className={`badge ${u.is_suspended ? 'badge-cancelled' : 'badge-ready'}`}>
                          {u.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleOpenDetail(u.firebase_uid)} className="btn-icon" title="View Account Activity" aria-label="View user profile details">
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => { setRoleModal(u); setNewRole(u.role); setLinkedStoreCode(u.linked_pmbjk_code || ''); }} 
                            className="btn-icon" 
                            style={{ color: 'var(--color-brand-400)' }}
                            title="Assign Credentials/Store"
                            aria-label="Edit role"
                          >
                            <UserCheck size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleSuspend(u.firebase_uid, u.is_suspended)}
                            className={`btn-icon ${u.is_suspended ? 'text-emerald-500' : 'text-rose-500'}`}
                            title={u.is_suspended ? 'Reactivate Account' : 'Suspend Account'}
                            disabled={actionLoading === u.firebase_uid + 'suspend'}
                            aria-label={u.is_suspended ? 'Reactivate' : 'Suspend'}
                          >
                            {u.is_suspended ? <ShieldCheck size={14} /> : <Ban size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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

      {/* Edit Role Modal */}
      {roleModal && (
        <div className="modal-overlay" onClick={() => setRoleModal(null)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleRoleUpdateSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={22} style={{ color: 'var(--color-brand-400)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Update Account Credentials</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>User: {roleModal.name || 'Anonymous'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Account Role</label>
                <select 
                  className="input"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  style={{ background: 'var(--color-surface-700)', cursor: 'pointer' }}
                >
                  <option value="CUSTOMER">Customer (Default)</option>
                  <option value="STORE_OWNER">Store Owner (Kendra Operator)</option>
                  <option value="SUPER_ADMIN">Super Admin (Operations)</option>
                </select>
              </div>

              {newRole === 'STORE_OWNER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Linked Store PMBJK Code *
                  </label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={linkedStoreCode}
                    onChange={e => setLinkedStoreCode(e.target.value)}
                    placeholder="e.g. PMBJK-01048"
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    This binds this user's seller dashboard strictly to the sales and inventory data of this Kendra.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setRoleModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={actionLoading === 'role'}>
                {actionLoading === 'role' ? 'Saving...' : 'Update Role'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Detail Slide-Over */}
      {selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedUser(null)} />
          <div className="slide-over animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Client Account Dossier</h2>
              <button onClick={() => setSelectedUser(null)} className="btn-icon"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <SkeletonDetail />
            ) : (
              <>
                {/* Profile Info */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedUser.name || 'Anonymous User'}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>Firebase UID: {selectedUser.firebase_uid}</p>
                  
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <p><span style={{ color: 'var(--color-text-muted)' }}>Email:</span> {selectedUser.email || 'None'}</p>
                    <p><span style={{ color: 'var(--color-text-muted)' }}>Phone:</span> {selectedUser.phone || 'None'}</p>
                    <p>
                      <span style={{ color: 'var(--color-text-muted)' }}>Role:</span>{' '}
                      <span style={{ fontWeight: 600, color: 'var(--color-brand-400)' }}>{selectedUser.role}</span>
                    </p>
                    {selectedUser.linked_pmbjk_code && (
                      <p>
                        <span style={{ color: 'var(--color-text-muted)' }}>Linked Store:</span>{' '}
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedUser.linked_pmbjk_code}</span>
                      </p>
                    )}
                    <p>
                      <span style={{ color: 'var(--color-text-muted)' }}>Registration:</span>{' '}
                      {new Date(selectedUser.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Activity Summary */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>PLATFORM ACTIVITY STATS</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-surface-700)', borderRadius: '8px' }}>
                      <ShoppingBag size={14} style={{ color: 'var(--color-text-muted)', margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>Orders</span>
                      <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'white', marginTop: 2 }}>{selectedUser.stats?.total_orders || 0}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-surface-700)', borderRadius: '8px' }}>
                      <CreditCard size={14} style={{ color: 'var(--color-text-muted)', margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>Spend</span>
                      <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-brand-400)', marginTop: 2 }}>₹{selectedUser.stats?.total_spend?.toFixed(0)}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-surface-700)', borderRadius: '8px' }}>
                      <PiggyBank size={14} style={{ color: 'var(--color-text-muted)', margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>Savings</span>
                      <p style={{ fontSize: '1.125rem', fontWeight: 800, color: '#8b5cf6', marginTop: 2 }}>₹{selectedUser.stats?.total_savings?.toFixed(0)}</p>
                    </div>
                  </div>
                </div>

                {/* Suspend Action Banner */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderStyle: 'dashed' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>SECURITY CONTROLS</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Suspended accounts cannot submit order tickets, log in, or manage stores.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleToggleSuspend(selectedUser.firebase_uid, selectedUser.is_suspended)}
                    className={selectedUser.is_suspended ? 'btn-primary' : 'btn-danger'}
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={actionLoading === selectedUser.firebase_uid + 'suspend'}
                  >
                    {selectedUser.is_suspended ? 'Reactivate User Account' : 'Suspend User Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

    </div>
  );
}
