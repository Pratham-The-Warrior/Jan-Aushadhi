import { ShieldAlert, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function AccessDenied() {
  const { logout, roleError } = useAuthStore();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: '1.5rem', padding: '2rem', textAlign: 'center',
      background: 'var(--color-surface-900)',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ShieldAlert size={40} style={{ color: 'var(--color-danger-500)' }} />
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Access Denied</h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400, lineHeight: 1.6, fontSize: '0.9375rem' }}>
        {roleError || 'Your account is not registered as a Super Administrator. This console is restricted.'}
      </p>
      <button onClick={logout} className="btn-secondary" style={{ marginTop: '0.5rem' }}>
        <LogOut size={16} /> Try Another Account
      </button>
    </div>
  );
}
