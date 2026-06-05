// ============================================================
// Admin Console — Credential Login Page (Flipkart-Style)
// Logs in via Admin Email + Password.
// Bypasses phone OTP and other customer auth elements.
// ============================================================

import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ShieldAlert, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Enter a valid administrative email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Auth state listener will handle authorization role checks and routing
    } catch (err) {
      console.error('Admin login failure:', err);
      setError('Authentication failed. Please verify email and password.');
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
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)', // Admin brand glow
          }}>
            <Lock size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Admin Console
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Super Admin & Operations Platform
          </p>
        </div>

        {/* Credentials Form Card */}
        <div className="card" style={{ padding: '2.25rem', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Admin Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Administrator Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@janaushadhi.gov.in"
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Authenticating...' : <>Secure Login <ArrowRight size={16} /></>}
            </button>

          </form>
        </div>

        <p style={{
          textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)',
          marginTop: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
        }}>
          <ShieldAlert size={12} /> Restricted Area. Unauthorized access attempts are audited.
        </p>

      </div>
    </div>
  );
}
