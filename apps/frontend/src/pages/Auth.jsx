import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Database, Lock, ArrowRight, Smartphone, Key, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import useCartStore from '../store/cartStore';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // This sync hook is key: once the user logs in, we need to merge their local cart (if any)
  // with whatever they have saved on the server database.
  const syncWithServer = useCartStore(s => s.syncWithServer);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // Transitions from 'phone' (collect number) to 'otp' (verify code)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  // Ref to hold the RecaptchaVerifier instance. Essential for cleanups to avoid memory leaks or duplicate DOM nodes.
  const recaptchaRef = useRef(null);

  // If the user was redirected here while trying to access a secure page (like Checkout),
  // we capture that in location.state and navigate them back there after successful login.
  const from = location.state?.from || '/discovery';

  useEffect(() => {
    // FIREBASE GOTCHA: Recaptcha creates global elements in the DOM. If we unmount this page
    // and remount it without clearing the Recaptcha instance, Firebase will throw errors
    // complaining about a duplicate or non-existent recaptcha-container.
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
      }
    };
  }, []);

  // Lazy-initialization of the reCAPTCHA verification container.
  // Using an 'invisible' captcha provides a frictionless flow without making the user click tiles.
  const setupRecaptcha = () => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved; Firebase automatically handles the next action.
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
      
      // UX Choice: Indian numbers (+91) are the primary target. If the user omits the '+' prefix,
      // we auto-apply '+91' so standard local entries work out-of-the-box. Firebase Auth requires
      // the phone number to be in E.164 format.
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp'); // Advance the form wizard to the OTP verification field
    } catch (err) {
      console.error(err);
      setError('Failed to send OTP. Please check the number and try again.');
      // Reset the recaptcha instance on failure so that the user can retry immediately.
      // Do NOT clear() and nullify the ref, otherwise Firebase complains it's already rendered on next try.
      if (recaptchaRef.current) {
        recaptchaRef.current.render().then((widgetId) => {
          if (window.grecaptcha) {
            window.grecaptcha.reset(widgetId);
          }
        }).catch(() => {});
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
      // Complete the SMS verification handshake with Firebase Auth
      await confirmationResult.confirm(otp);

      // CRITICAL STEP: Now that we are authenticated, we synchronize their local session cart with
      // their server-side database cart, resolving conflicts by keeping the maximum quantities.
      await syncWithServer();

      // Send the user back to where they started their flow
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError('Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      await syncWithServer();
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError('Google Sign-In failed. Please try again.');
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

          <div className="mt-8 flex items-center justify-center">
            <div className="w-full h-px bg-outline-variant"></div>
            <span className="px-4 text-xs font-bold text-on-surface/40 uppercase tracking-widest bg-surface-lowest">OR</span>
            <div className="w-full h-px bg-outline-variant"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="w-full bg-white border border-outline-variant text-black py-4 mt-8 flex items-center justify-center gap-3 rounded-md text-base transition-all shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Continue with Google
          </button>

          <div className="mt-12 flex items-center justify-center gap-8 border-t border-outline-variant pt-8">
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
