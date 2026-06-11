// ============================================================
// Admin Console — Credential Login Page  (v2 — Polished)
// Animated gradient background, entrance animations,
// trust badge branding.
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
      padding: '2rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'var(--color-surface-900)',
      }}>
        {/* Gradient orb 1 */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          animation: 'gradientShift 8s ease infinite',
        }} />
        {/* Gradient orb 2 */}
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: '50vw', height: '50vw', maxWidth: 600, maxHeight: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
          animation: 'gradientShift 12s ease infinite reverse',
        }} />
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
      </div>

      <div style={{ maxWidth: 400, width: '100%', position: 'relative', zIndex: 1 }}
        className="animate-scale-in">
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.1)',
          }}>
            <Lock size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="text-gradient">
            Admin Console
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Super Admin & Operations Platform
          </p>
        </div>

        {/* Credentials Form Card */}
        <div className="card" style={{
          padding: '2.25rem',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
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
                lineHeight: '1.25rem', margin: 0, padding: '0.625rem 0.875rem',
                background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.12)',
                borderRadius: '10px', animation: 'fadeIn 0.2s ease forwards',
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
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Authenticating...
                </>
              ) : (
                <>Secure Login <ArrowRight size={16} /></>
              )}
            </button>

          </form>
        </div>

        {/* Trust badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          marginTop: '1.75rem', padding: '0.75rem', borderRadius: 10,
          background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.08)',
        }}>
          <ShieldAlert size={14} style={{ color: 'var(--color-brand-500)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Restricted area. Unauthorized access attempts are audited and logged.
          </p>
        </div>

      </div>
    </div>
  );
}
