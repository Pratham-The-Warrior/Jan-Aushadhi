import { Shield } from 'lucide-react';

export default function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-surface-900)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse-dot 2s ease infinite',
        }}>
          <Shield size={24} color="white" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-primary)', fontSize: '0.9375rem', fontWeight: 600 }}>Admin Console</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Verifying environment...</span>
        </div>
        <div style={{ width: 120, height: 3, background: 'var(--color-surface-700)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: '40%', height: '100%',
            background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400))',
            borderRadius: 4, animation: 'shimmer 1.5s ease-in-out infinite',
            backgroundSize: '200% 100%',
          }} />
        </div>
      </div>
    </div>
  );
}
