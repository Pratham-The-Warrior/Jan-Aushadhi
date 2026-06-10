// ============================================================
// Seller Central — Store Profile Editor
// Manages store contact details, operating hours, and shows
// read-only licensing and location metadata.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { 
  Store, Phone, MapPin, Clock, ShieldCheck, AlertCircle, Save,
  CheckCircle2, AlertTriangle, Copy
} from 'lucide-react';
import { getProfile, updateProfile } from '../services/seller.api';
import useAuthStore from '../store/authStore';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function StoreProfile() {
  const { refreshProfile } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  
  // Operating hours state: { [day]: { isOpen: boolean, openTime: string, closeTime: string } }
  const [hoursState, setHoursState] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      setPhone(data.phone || '');
      setUpiVpa(data.upi_vpa || '');
      
      // Parse operating_hours JSON
      const rawHours = data.operating_hours || {};
      const parsedHours = {};
      
      DAYS_OF_WEEK.forEach(day => {
        const val = rawHours[day];
        if (val && val !== 'Closed') {
          const parts = val.split(' - ');
          parsedHours[day] = {
            isOpen: true,
            openTime: parts[0] || '09:00 AM',
            closeTime: parts[1] || '09:00 PM'
          };
        } else {
          parsedHours[day] = {
            isOpen: false,
            openTime: '09:00 AM',
            closeTime: '09:00 PM'
          };
        }
      });
      setHoursState(parsedHours);
    } catch (err) {
      console.error('Load profile error:', err);
      showToast('danger', err.message || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  const handleHourToggle = (day) => {
    setHoursState(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen
      }
    }));
  };

  const handleTimeChange = (day, field, value) => {
    setHoursState(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Premium feature: Copy Monday hours to all other days
  const handleCopyMondayHours = () => {
    const mondayHours = hoursState['Monday'];
    if (!mondayHours) return;
    
    const copiedHours = {};
    DAYS_OF_WEEK.forEach(day => {
      copiedHours[day] = { ...mondayHours };
    });
    setHoursState(copiedHours);
    showToast('success', "Copied Monday's hours to all days");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Format hours back to Record<string, string>
    const formattedHours = {};
    DAYS_OF_WEEK.forEach(day => {
      const state = hoursState[day];
      if (state.isOpen) {
        formattedHours[day] = `${state.openTime} - ${state.closeTime}`;
      } else {
        formattedHours[day] = 'Closed';
      }
    });

    try {
      await updateProfile({
        phone: phone || null,
        operating_hours: formattedHours,
        upi_vpa: upiVpa || null
      });
      
      // Update global context profile
      await refreshProfile();
      showToast('success', 'Profile updated successfully!');
    } catch (err) {
      console.error('Update profile error:', err);
      showToast('danger', err.message || 'Failed to update store profile');
    } finally {
      setSaving(false);
    }
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

      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Store Profile</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Manage your Kendra's contact information and active operating schedule.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }} className="max-lg:grid-cols-1!">
        
        {/* Left Column: Store Details (Read-only mostly) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Store Info Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Store size={22} style={{ color: 'var(--color-brand-400)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{profile?.name}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>Code: {profile?.pmbjk_code}</p>
              </div>
            </div>

            <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <MapPin size={16} style={{ color: 'var(--color-text-secondary)', flexShrink: 0, marginTop: 3 }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>LOCATION ADDRESS</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{profile?.address}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', marginTop: 2 }}>
                    {profile?.district}, {profile?.state} - <span style={{ fontWeight: 600 }}>{profile?.pincode}</span>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-brand-400)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>VERIFICATION STATUS</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-brand-400)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    Verified Kendra
                    {profile?.verified_at && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                        ({new Date(profile.verified_at).toLocaleDateString('en-IN')})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <AlertTriangle size={16} style={{ color: profile?.status === 'ACTIVE' ? 'var(--color-brand-400)' : 'var(--color-danger-500)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>STORE STATUS</p>
                  <span className={`badge ${profile?.status === 'ACTIVE' ? 'badge-ready' : 'badge-cancelled'}`} style={{ marginTop: 4 }}>
                    {profile?.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--color-brand-400)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>REGISTERED UPI VPA</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', marginTop: 2, fontFamily: 'monospace' }}>
                    {profile?.upi_vpa || 'Not Registered'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column: Profile Editor Form */}
        <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Edit Store Details</h3>

          {/* Phone Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} /> Contact Phone Number
            </label>
            <input
              type="tel"
              className="input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              required
            />
          </div>

          {/* UPI VPA Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} style={{ color: 'var(--color-brand-400)' }} /> UPI VPA (For Direct P2P Payments)
            </label>
            <input
              type="text"
              className="input"
              value={upiVpa}
              onChange={e => setUpiVpa(e.target.value)}
              placeholder="e.g. storename@upi or pmbjk00012@sbi"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Used to generate dynamic QR codes during checkout. Leave empty to disable UPI.
            </p>
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />

          {/* Operating Hours Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} style={{ color: 'var(--color-brand-400)' }} />
              <label style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Operating Hours</label>
            </div>
            <button 
              type="button" 
              onClick={handleCopyMondayHours} 
              className="btn-secondary" 
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', gap: 4 }}
            >
              <Copy size={12} /> Apply Monday to All
            </button>
          </div>

          {/* Days List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {DAYS_OF_WEEK.map(day => {
              const state = hoursState[day] || { isOpen: false, openTime: '09:00 AM', closeTime: '09:00 PM' };
              return (
                <div 
                  key={day} 
                  style={{ 
                    display: 'grid', gridTemplateColumns: '1.2fr 1fr 2.5fr', gap: '1rem', alignItems: 'center',
                    padding: '0.75rem 1rem', background: 'var(--color-surface-700)', borderRadius: '10px',
                    border: '1px solid var(--color-border)'
                  }}
                  className="max-sm:grid-cols-1! max-sm:gap-2!"
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{day}</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={state.isOpen}
                      onChange={() => handleHourToggle(day)}
                      className="toggle-switch"
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: state.isOpen ? 'var(--color-brand-400)' : 'var(--color-text-muted)' }}>
                      {state.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  {state.isOpen ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="input"
                        style={{ padding: '0.375rem 0.5rem', textAlign: 'center', fontSize: '0.8125rem' }}
                        value={state.openTime}
                        onChange={e => handleTimeChange(day, 'openTime', e.target.value)}
                        placeholder="09:00 AM"
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>to</span>
                      <input
                        type="text"
                        className="input"
                        style={{ padding: '0.375rem 0.5rem', textAlign: 'center', fontSize: '0.8125rem' }}
                        value={state.closeTime}
                        onChange={e => handleTimeChange(day, 'closeTime', e.target.value)}
                        placeholder="09:00 PM"
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                      Store closed on {day}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit */}
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving changes...' : 'Save Store Profile'}
          </button>

        </form>

      </div>
    </div>
  );
}
