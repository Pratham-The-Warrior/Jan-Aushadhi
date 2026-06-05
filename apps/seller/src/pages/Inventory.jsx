// ============================================================
// Seller Central — Inventory Manager
// Searchable generic medicines directory with stock status toggles,
// pagination, and bulk update capabilities.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, Package, Settings
} from 'lucide-react';
import { getInventory, updateInventoryItem, bulkUpdateInventory } from '../services/seller.api';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadInventory = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await getInventory({
        search: searchQuery || undefined,
        page,
        limit: 25
      });
      setItems(data.items || []);
      setTotalCount(data.count || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Load inventory error:', err);
      showToast('danger', err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInventory();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadInventory]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const handleToggleStock = async (drugCode, currentStock) => {
    setTogglingId(drugCode);
    const newStock = !currentStock;
    try {
      await updateInventoryItem(drugCode, newStock);
      
      // Update local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.drug_code === drugCode ? { ...item, in_stock: newStock, last_updated: new Date().toISOString() } : item
        )
      );
      showToast('success', `${newStock ? 'Marked in stock' : 'Marked out of stock'}`);
    } catch (err) {
      console.error('Toggle stock error:', err);
      showToast('danger', err.message || 'Failed to update stock');
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk Actions
  const handleSelectItem = (drugCode) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(drugCode)) {
        next.delete(drugCode);
      } else {
        next.add(drugCode);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.drug_code)));
    }
  };

  const handleBulkStatusChange = async (inStock) => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);
    const updates = Array.from(selectedItems).map(drugCode => ({
      drug_code: drugCode,
      in_stock: inStock
    }));

    try {
      await bulkUpdateInventory(updates);
      showToast('success', `Successfully updated ${updates.length} items`);
      setSelectedItems(new Set());
      setBulkMode(false);
      await loadInventory(false);
    } catch (err) {
      console.error('Bulk update error:', err);
      showToast('danger', err.message || 'Failed to perform bulk update');
    } finally {
      setBulkActionLoading(false);
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
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Inventory Manager</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Toggle medicine stock status. Out of stock products won't be orderable from your store.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedItems(new Set());
            }} 
            className="btn-secondary"
            style={{ borderColor: bulkMode ? 'var(--color-brand-500)' : 'var(--color-border)' }}
          >
            <Settings size={16} />
            {bulkMode ? 'Cancel Bulk' : 'Bulk Edit'}
          </button>
          <button onClick={() => loadInventory(true)} className="btn-secondary" aria-label="Refresh list">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter and Bulk controls */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search generic name..."
              className="input"
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
            <span style={{ fontWeight: 600 }}>Total Records:</span>
            <span>{totalCount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {bulkMode && (
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
            padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed var(--color-brand-700)', borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                checked={selectedItems.size === items.length && items.length > 0}
                onChange={handleSelectAllVisible}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-brand-500)' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                {selectedItems.size} items selected from this page
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => handleBulkStatusChange(true)} 
                className="btn-primary" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
                disabled={selectedItems.size === 0 || bulkActionLoading}
              >
                Mark In Stock
              </button>
              <button 
                onClick={() => handleBulkStatusChange(false)} 
                className="btn-danger" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
                disabled={selectedItems.size === 0 || bulkActionLoading}
              >
                Mark Out Of Stock
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--color-surface-600)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--color-text-muted)' }}>
            <Package size={44} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>No medicines found</p>
            <p style={{ fontSize: '0.8125rem', marginTop: 4 }}>Try clearing the search query or load again.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {bulkMode && <th style={{ width: 40 }}></th>}
                  <th>Code</th>
                  <th>Generic Name</th>
                  <th>Group</th>
                  <th>MRP</th>
                  <th>Unit Size</th>
                  <th style={{ width: 120 }}>Availability</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.drug_code}>
                    {bulkMode && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.drug_code)}
                          onChange={() => handleSelectItem(item.drug_code)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-brand-500)' }}
                        />
                      </td>
                    )}
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{item.drug_code}</td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>{item.generic_name}</p>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', background: 'var(--color-surface-700)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                        {item.group_name || 'General'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-brand-400)' }}>
                      ₹{item.mrp.toFixed(2)}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{item.unit_size || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={item.in_stock}
                          disabled={togglingId === item.drug_code || bulkMode}
                          onChange={() => handleToggleStock(item.drug_code, item.in_stock)}
                          className="toggle-switch"
                          style={{ opacity: togglingId === item.drug_code ? 0.5 : 1 }}
                        />
                        {togglingId === item.drug_code ? (
                          <div style={{ width: 12, height: 12, border: '2px solid var(--color-surface-400)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: item.in_stock ? 'var(--color-brand-400)' : 'var(--color-danger-500)' }}>
                            {item.in_stock ? 'In Stock' : 'OOS'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {item.last_updated ? new Date(item.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
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

    </div>
  );
}
