import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Database, Lock, ArrowRight, Smartphone, Key, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const syncWithServer = useCartStore(s => s.syncWithServer);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaRef = useRef(null);

  const from = location.state?.from || '/discovery';

  useEffect(() => {
    // Clean up recaptcha on mount/unmount
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
    return recaptchaRef.current;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const appVerifier = setupRecaptcha();
      // Ensure phone number has country code for India if not present
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (err) {
      console.error(err);
      setError('Failed to send OTP. Please check the number and try again.');
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmationResult.confirm(otp);

      // Post-auth sync
      await syncWithServer();

      // Resume action
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError('Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface">
      <div id="recaptcha-container"></div>

      {/* Left Panel */}
      <div className="w-full md:w-[45%] bg-primary p-12 lg:p-20 text-white flex flex-col justify-between">
        <div>
          <div className="font-display font-bold text-3xl tracking-tight mb-2">JanAushadhi</div>
          <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-24">Medical Systems Excellence</div>

          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-[1.1] mb-8">
            Precision in care, starts with access.
          </h1>

          <p className="text-lg text-white/80 mb-16 max-w-md leading-[1.6]">
            Join our clinical network to access high-quality pharmaceutical records, store locations, and advanced healthcare support protocols.
          </p>

          <div className="space-y-10">
            <div className="flex gap-5">
              <ShieldCheck className="w-6 h-6 text-white shrink-0 mt-1" />
              <div>
                <h3 className="font-display font-bold text-xl mb-1.5">Secure Architecture</h3>
                <p className="text-white/70 text-sm leading-[1.6]">Military-grade encryption for all patient and provider data.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <Database className="w-6 h-6 text-white shrink-0 mt-1" />
              <div>
                <h3 className="font-display font-bold text-xl mb-1.5">Real-time Inventory</h3>
                <p className="text-white/70 text-sm leading-[1.6]">Direct integration with national medicine repositories.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-20">
          © 2024 JanAushadhi Medical Systems. Precision in Care.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-[55%] flex items-center justify-center p-8 lg:p-20 relative bg-surface-lowest">
        <div className="w-full max-w-md">
          <div className="mb-12 text-center md:text-left">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-on-surface mb-3 tracking-tight">
              {step === 'phone' ? 'Verify Identity' : 'Secure OTP Login'}
            </h2>
            <p className="text-on-surface/60 text-base leading-[1.6]">
              {step === 'phone'
                ? 'Enter your phone number to receive a secure verification code.'
                : `We've sent a 6-digit code to your device ending in ${phoneNumber.slice(-4)}.`}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-700 p-4 rounded-md flex items-start gap-3 animate-slideUp">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-on-surface/50 uppercase tracking-widest mb-2.5">Mobile Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface/40" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-surface-low border border-transparent rounded-md focus:bg-surface-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-on-surface/40 font-medium text-on-surface ghost-border"
                    placeholder="+91 99999 00000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 mt-6 flex items-center justify-center gap-2 text-base transition-all shadow-md"
              >
                {loading ? 'Sending Code...' : 'Send Verification OTP'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-on-surface/50 uppercase tracking-widest mb-2.5">6-Digit Code</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface/40" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-surface-low border border-transparent rounded-md focus:bg-surface-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-on-surface/40 font-medium text-on-surface tracking-[0.5em] text-center ghost-border"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 mt-6 flex items-center justify-center gap-2 text-base transition-all shadow-md"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-center text-sm font-bold text-primary hover:underline mt-4"
              >
                Change Phone Number
              </button>
            </form>
          )}

          <div className="mt-20 flex items-center justify-center gap-8 border-t border-outline-variant pt-8">
            <div className="flex items-center gap-2 text-on-surface/40 text-[10px] font-bold tracking-widest uppercase">
              <Lock className="w-4 h-4" /> 256-BIT SSL
            </div>
            <div className="w-px h-6 bg-outline-variant" />
            <div className="flex items-center gap-2 text-on-surface/40 text-[10px] font-bold tracking-widest uppercase">
              <ShieldCheck className="w-4 h-4" /> CLINICAL GRADE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
