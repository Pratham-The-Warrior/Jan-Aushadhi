// ============================================================
// Admin Console — Platform Settings
// Infrastructure health monitoring and global server config overview.
// ============================================================

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Server, Database, ShieldCheck, AlertCircle,
  RefreshCw, CheckCircle2, Cpu, Globe, KeyRound, Radio
} from 'lucide-react';
import { getSystemHealth } from '../services/admin.api';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadHealth(true);
  }, []);

  async function loadHealth(showLoader = false) {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Load system health error:', err);
      showToast('danger', 'Failed to connect to backend health check API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const getServiceStatusIcon = (statusStr) => {
    if (!statusStr) return <AlertCircle size={16} className="text-rose-500" />;
    
    const lower = statusStr.toLowerCase();
    if (lower.includes('active') || lower.includes('ok') || lower.includes('postgre') || lower.includes('meili') || lower.includes('redis')) {
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    }
    if (lower.includes('mock') || lower.includes('inactive')) {
      return <AlertCircle size={16} className="text-amber-500" />;
    }
    return <AlertCircle size={16} className="text-rose-500" />;
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
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Platform Settings</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            System configuration panel, CORS parameters, rate limits, and live infrastructure adapter telemetry.
          </p>
        </div>
        <button onClick={() => loadHealth(false)} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Probing adapters...' : 'Probe Infrastructure'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '1.5rem' }} className="max-lg:!grid-cols-1">
        
        {/* Left Column: System Status Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Server size={22} style={{ color: 'var(--color-brand-400)' }} />
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Infrastructure Telemetry</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Real-time database and service check statuses</p>
              </div>
            </div>

            <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Relational DB */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-700)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Database size={16} style={{ color: 'var(--color-brand-400)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Relational Database</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{health?.services?.database || 'N/A'}</span>
                  {getServiceStatusIcon(health?.services?.database)}
                </div>
              </div>

              {/* Cache */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-700)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Cpu size={16} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Distributed Caching</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{health?.services?.cache || 'N/A'}</span>
                  {getServiceStatusIcon(health?.services?.cache)}
                </div>
              </div>

              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-700)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Globe size={16} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Meilisearch Engine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{health?.services?.search || 'N/A'}</span>
                  {getServiceStatusIcon(health?.services?.search)}
                </div>
              </div>

              {/* Authentication */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-700)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <KeyRound size={16} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Firebase IAM</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{health?.services?.auth || 'N/A'}</span>
                  {getServiceStatusIcon(health?.services?.auth)}
                </div>
              </div>

              {/* Notifications */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-700)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Radio size={16} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Twilio WhatsApp Bridge</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{health?.services?.notifications || 'N/A'}</span>
                  {getServiceStatusIcon(health?.services?.notifications)}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Server metadata and rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Host Metadata</h3>
            
            <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Backend Version:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{health?.version || 'N/A'}</span>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Architecture Layout:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{health?.architecture || 'N/A'}</span>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Software Stack:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{health?.stack || 'N/A'}</span>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Environment:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-brand-400)' }}>{health?.environment?.toUpperCase() || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>CORS & Security Configurations</h3>
            
            <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              The API server is restricted by Fastify cors rules. Valid origins:
            </p>
            <div style={{ background: 'var(--color-surface-700)', padding: '0.75rem', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.75rem', color: 'white' }}>
              <p>http://localhost:5173</p>
              <p style={{ marginTop: 2 }}>http://localhost:5174</p>
              <p style={{ marginTop: 2 }}>http://localhost:3000</p>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
              Rate Limiting is configured at <span style={{ fontWeight: 600, color: 'white' }}>100 requests per minute</span> per IP address (backed by Redis cache counters) to prevent brute force scraping attacks.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
