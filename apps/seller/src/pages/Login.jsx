// ============================================================
// Seller Central — Credential Login Page (Flipkart-Style)
// Logs in via Store Code / Seller ID + Password.
// Maps internally to virtual operator email namespace.
// ============================================================

import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Store, ArrowRight, Lock, User } from 'lucide-react';

export default function Login() {
  const [storeCode, setStoreCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const formattedCode = storeCode.trim();
    if (!formattedCode || formattedCode.length < 4) {
      setError('Enter a valid Store Code / Seller ID');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    // Translate Store Code to Virtual Email namespace
    const virtualEmail = `${formattedCode.toLowerCase()}@seller.janaushadhi.local`;

    try {
      await signInWithEmailAndPassword(auth, virtualEmail, password);
      // Auth state listener in authStore will handle the redirection
    } catch (err) {
      console.error('Seller login failure:', err);
      setError('Invalid Store Code or Password. Please check credentials or contact administrator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-surface-900)', padding: '2rem',
    }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          }}>
            <Store size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Seller Central
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Jan Aushadhi Kendra Management Portal
          </p>
        </div>

        {/* Credentials Form Card */}
        <div className="card" style={{ padding: '2.25rem', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Store Code / Seller ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Store Code / Seller ID
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. PMBJK00012"
                  className="input"
                  style={{ paddingLeft: '2.5rem', textTransform: 'uppercase' }}
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Account Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <p style={{
                color: 'var(--color-danger-500)', fontSize: '0.8125rem', fontWeight: 500,
                lineHeight: '1.25rem', margin: 0, padding: '0.5rem 0.75rem',
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '8px'
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%', padding: '0.75rem 1rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem'
              }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : <>Access Portal <ArrowRight size={16} /></>}
            </button>

          </form>
        </div>

        <p style={{
          textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)',
          marginTop: '1.75rem', lineHeight: 1.6,
        }}>
          Operator accounts are provisioned exclusively by central platform administrators.<br />
          For support or account credentials, please contact the PMBJK Support Desk.
        </p>

      </div>
    </div>
  );
}
