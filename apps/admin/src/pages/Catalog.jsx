// ============================================================
// Admin Console — Catalog Management
// Displays drug catalog composition, salt matching rates, and instructions
// on running database updates.
// ============================================================

import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, Layers, CheckCircle2, AlertCircle, FileText,
  Activity, ArrowUpRight, Terminal
} from 'lucide-react';
import { getCatalogStats } from '../services/admin.api';

export default function Catalog() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await getCatalogStats();
      setStats(data);
    } catch (err) {
      console.error('Load catalog stats error:', err);
      showToast('danger', 'Failed to fetch catalog metrics');
    } finally {
      setLoading(false);
    }
  }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-surface-600)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Catalog Metrics</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Monitor master medicine database structure, brand-to-generic salt matches, and catalog distribution stats.
          </p>
        </div>
        <button onClick={loadStats} className="btn-secondary" aria-label="Refresh Stats">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Branded Medicines</span>
            <Database size={18} style={{ color: 'var(--color-brand-400)' }} />
          </div>
          <span className="stat-value">{(stats?.branded_count || 0).toLocaleString('en-IN')}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Commercial offerings</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Generic Medicines</span>
            <Layers size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <span className="stat-value">{(stats?.generic_count || 0).toLocaleString('en-IN')}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Jan Aushadhi catalog</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Active Matches</span>
            <Activity size={18} style={{ color: '#3b82f6' }} />
          </div>
          <span className="stat-value">{(stats?.matched_salts || 0).toLocaleString('en-IN')}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Matched salt formulations</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Branded Salt Hashes</span>
            <FileText size={18} style={{ color: '#f59e0b' }} />
          </div>
          <span className="stat-value">{(stats?.total_branded_salts || 0).toLocaleString('en-IN')}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total unique chemical compounds</span>
        </div>

      </div>

      {/* Match rate visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '1.5rem' }} className="max-lg:!grid-cols-1">
        
        {/* Match progress bar visual */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Salt Formulation Coverage</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Percentage of unique branded chemical salt formulas that are coverable by Jan Aushadhi generic alternatives.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Circular progress display */}
            <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="var(--color-surface-700)" strokeWidth="8" fill="none" />
                <circle 
                  cx="50" cy="50" r="40" stroke="var(--color-brand-500)" strokeWidth="8" fill="none"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * (stats?.match_rate || 0)) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats?.match_rate || 0}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-brand-500)' }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Matched formulations: {stats?.matched_salts}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-surface-700)' }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Unmatched chemical salts: {(stats?.total_branded_salts - stats?.matched_salts) || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database pipeline CLI tools instructions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Terminal size={22} style={{ color: 'var(--color-brand-400)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Data Ingestion Pipeline</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>CLI scripts for catalog synchronization</p>
            </div>
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            To import fresh A-Z branded medicine list datasets or update Kendra geolocation pins, execute the respective background pipelines directly on the server host:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            <div style={{ background: 'var(--color-surface-700)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}># Import medicines csv & build generic search salt mappings</p>
              <p style={{ color: 'white', fontWeight: 600 }}>npm run etl:run</p>
            </div>
            <div style={{ background: 'var(--color-surface-700)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}># Recalculate PostGIS geographic coordinate indexes for Kendras</p>
              <p style={{ color: 'white', fontWeight: 600 }}>npm run etl:stores</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
