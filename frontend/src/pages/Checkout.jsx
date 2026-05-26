// ============================================================
// Checkout Page — Requirement Authorization
// Redesigned with modern UI primitives and workflow fixes
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ShieldCheck, Clock, Zap, Trash2, MessageCircle, Lock, Package, ArrowRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import useCartStore, {
  selectSubtotal,
  selectSavings,
  selectItemCount,
} from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { createRequirement, getWhatsAppLink } from '../services/api';
import AttestationModal from '../components/checkout/AttestationModal';
import OrderSuccess from '../components/checkout/OrderSuccess';

export default function Checkout() {
  const navigate = useNavigate();

  // Store selectors
  const items = useCartStore((s) => s.items);
  const selectedStore = useCartStore((s) => s.selectedStore);
  const legalAttestation = useCartStore((s) => s.legalAttestation);
  const setAttestation = useCartStore((s) => s.setAttestation);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);

  const user = useAuthStore((s) => s.user);

  // Calculated values
  const subtotal = useCartStore(selectSubtotal);
  const totalSavings = useCartStore(selectSavings);
  const itemCount = useCartStore(selectItemCount);

  // Local state
  const [deliveryMode, setDeliveryMode] = useState('express');
  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [showAttestationModal, setShowAttestationModal] = useState(false);

  const logisticsFee = deliveryMode === 'express' ? 40 : 20;
  const subsidy = Math.min(subtotal * 0.05, 50);
  const totalPayable = subtotal + logisticsFee - subsidy;

  // ---- Checkout Handler ----
  const handleCheckout = async () => {
    // 1. Auth Gate
    if (!user) {
      navigate('/auth', { state: { from: '/checkout' } });
      return;
    }
    // 2. Attestation Gate
    if (!legalAttestation) {
      setShowAttestationModal(true);
      return;
    }
    // 3. Validation
    if (!selectedStore) {
      alert('Please select a Jan Aushadhi Kendra for fulfillment first.');
      navigate('/fulfillment');
      return;
    }
    if (items.length === 0) {
      alert('Your cart is empty.');
      navigate('/discovery');
      return;
    }

    setProcessing(true);
    try {
      const result = await createRequirement({
        pmbjk_code: selectedStore.pmbjk_code,
        drug_codes: items.map((i) => ({
          code: i.drug_code, quantity: i.quantity, name: i.name,
          mrp: i.mrp, branded_mrp: i.branded_mrp,
        })),
        legal_attestation: true,
        delivery_address: 'Verification pending via WhatsApp',
        payment_mode: 'COD',
      });

      try {
        const { whatsappUrl } = await getWhatsAppLink(result.ticketId);
        if (whatsappUrl) window.open(whatsappUrl, '_blank');
      } catch {
        console.warn('WhatsApp link generation failed, but order was created.');
      }

      setOrderResult(result);
      clearCart();
    } catch (err) {
      console.error(err);
      alert('Checkout failed. Please ensure the backend services are running.');
    }
    setProcessing(false);
  };

  // ---- Order Success View ----
  if (orderResult) {
    return <OrderSuccess order={orderResult} store={selectedStore} />;
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const fadeUpItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  // ---- Main Checkout View ----
  return (
    <div className="flex-1 w-full bg-surface pb-24 md:pb-32">
      <AttestationModal
        isOpen={showAttestationModal}
        attested={legalAttestation}
        onAttest={setAttestation}
        onClose={() => setShowAttestationModal(false)}
        onConfirm={() => setShowAttestationModal(false)}
      />

      {/* Header */}
      <div className="bg-surface-lowest border-b border-outline-variant py-10 md:py-16 mb-8 md:mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl animate-fadeIn">
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-on-surface mb-4 tracking-tight">Secure Checkout</h1>
            <p className="text-on-surface/60 text-lg leading-relaxed">Review your cart and select a Jan Aushadhi Kendra to fulfill your order.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Main Column */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex-1 space-y-8 md:space-y-10">
            
            {/* WhatsApp Fulfillment Banner */}
            <motion.div variants={fadeUpItem} className="bg-primary-light/50 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 group hover:bg-primary-light/80 transition-colors">
              <div className="w-14 h-14 bg-white rounded-xl text-primary flex items-center justify-center shrink-0 border border-primary/10 shadow-sm group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-display font-bold text-primary mb-1 text-lg">Direct WhatsApp Fulfillment</h3>
                <p className="text-sm text-on-surface/70 leading-relaxed font-medium">Your order will be securely routed to the pharmacist via WhatsApp for prescription verification and final payment settlement.</p>
              </div>
            </motion.div>

            {/* 01 Store Selection */}
            <motion.div variants={fadeUpItem}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">1</div>
                <h2 className="font-display text-2xl font-bold text-on-surface">Target Kendra</h2>
              </div>
              <div className="bg-surface-lowest rounded-2xl ghost-border flex flex-col md:flex-row overflow-hidden hover:shadow-lg transition-shadow">
                <div className="w-full md:w-5/12 bg-surface-low relative flex items-center justify-center p-12">
                  <MapPin className="w-16 h-16 text-primary/20" />
                  <div className="absolute bottom-4 left-4 right-4 bg-white text-primary text-[9px] font-bold px-3 py-2 rounded-lg uppercase tracking-widest text-center shadow-sm border border-primary/10">Verified Location</div>
                </div>
                <div className="w-full md:w-7/12 p-8 lg:p-10 bg-surface-lowest flex flex-col justify-center">
                  {!selectedStore ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-on-surface/60 mb-6 font-medium">No Kendra selected for fulfillment.</p>
                      <button onClick={() => navigate('/fulfillment')} className="btn-secondary py-3 px-6 text-xs w-full">Select a Store</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase mb-1.5">PMBJK Code</div>
                        <div className="font-display font-bold text-primary text-xl truncate">{selectedStore.name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase mb-1.5">Address</div>
                        <div className="font-medium text-on-surface/80 text-sm leading-relaxed">{selectedStore.address}</div>
                      </div>
                      <button onClick={() => navigate('/fulfillment')} className="text-primary font-bold text-xs uppercase tracking-widest hover:underline inline-flex items-center gap-1">Change Store <ArrowRight className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* 02 Logistics */}
            <motion.div variants={fadeUpItem}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">2</div>
                <h2 className="font-display text-2xl font-bold text-on-surface">Fulfillment Timing</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-5">
                {[
                  { key: 'express', icon: <Zap />, label: 'Standard Express', time: 'Today, within 24h', fee: 40 },
                  { key: 'scheduled', icon: <Clock />, label: 'Scheduled', time: 'Tomorrow morning', fee: 20 },
                ].map((opt) => (
                  <div 
                    key={opt.key} 
                    onClick={() => setDeliveryMode(opt.key)} 
                    className={`flex-1 rounded-2xl p-6 md:p-8 cursor-pointer transition-all border-2 relative overflow-hidden group ${
                      deliveryMode === opt.key 
                        ? 'bg-primary-light/30 border-primary shadow-md' 
                        : 'bg-surface-lowest border-transparent ghost-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${
                      deliveryMode === opt.key ? 'bg-primary text-white' : 'bg-surface-low text-on-surface/40 group-hover:text-primary'
                    }`}>
                      {opt.icon}
                    </div>
                    <h3 className="font-display font-bold mb-2 text-lg text-on-surface">{opt.label}</h3>
                    <p className="text-sm text-on-surface/60 mb-6 font-medium">{opt.time}</p>
                    <div className="text-xs font-extrabold text-primary uppercase tracking-wider">Fee: ₹{opt.fee}</div>
                    
                    {/* Selected Indicator */}
                    <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      deliveryMode === opt.key ? 'border-primary' : 'border-outline-variant/50'
                    }`}>
                      {deliveryMode === opt.key && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 03 Payment */}
            <motion.div variants={fadeUpItem}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">3</div>
                <h2 className="font-display text-2xl font-bold text-on-surface">Payment Protocol</h2>
              </div>
              <div className="bg-surface-lowest ghost-border rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start sm:items-center gap-6 mb-8">
                  <div className="w-14 h-14 bg-surface-low rounded-xl flex items-center justify-center text-2xl font-display font-bold text-on-surface/50 shrink-0">₹</div>
                  <div>
                    <h4 className="font-display font-bold text-on-surface text-lg mb-1">Finalize via WhatsApp</h4>
                    <p className="text-sm text-on-surface/60 font-medium leading-relaxed max-w-lg">Payments are settled directly with the Jan Aushadhi Kendra operator using UPI or Cash on Delivery after prescription validation.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {['UPI QR', 'Cash on Delivery', 'Secure Settlement'].map((t) => (
                    <span key={t} className="text-[10px] font-bold uppercase tracking-widest bg-surface-low px-4 py-2 rounded-lg text-on-surface/70">{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Attestation Status */}
            <motion.div variants={fadeUpItem} className={`p-6 md:p-8 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center gap-5 transition-all ${
              legalAttestation ? 'bg-success-soft/50 border-success/30' : 'bg-warning-soft/50 border-warning/30'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                legalAttestation ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${legalAttestation ? 'text-success' : 'text-warning'}`}>
                  {legalAttestation ? 'Prescription Attested' : 'Prescription Missing'}
                </p>
                <p className="text-sm font-medium text-on-surface/60">
                  {legalAttestation 
                    ? "You've confirmed possession of a valid physical prescription." 
                    : "Legal compliance requires attestation before checkout."}
                </p>
              </div>
              {!legalAttestation && (
                <button 
                  onClick={() => setShowAttestationModal(true)} 
                  className="bg-warning text-white font-bold text-xs px-5 py-3 rounded-lg uppercase tracking-wider hover:bg-warning/90 transition-colors whitespace-nowrap shadow-sm shadow-warning/20"
                >
                  Sign Attestation
                </button>
              )}
            </motion.div>
          </motion.div>

          {/* Side Panel: Order Summary */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="bg-surface-lowest rounded-3xl ghost-border clinical-shadow-lg p-6 md:p-8 sticky top-28 animate-slideUp">
              
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-outline-variant">
                <h2 className="font-display text-xl font-bold text-on-surface">Order Summary</h2>
                <div className="bg-surface-low text-on-surface/60 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-widest">
                  {itemCount} Units
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-surface-low rounded-2xl flex items-center justify-center mx-auto mb-6 text-on-surface/20">
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">Empty Basket</h3>
                  <p className="text-sm text-on-surface/50 mb-6 font-medium">Add some generic medicines to get started.</p>
                  <button onClick={() => navigate('/discovery')} className="btn-secondary py-3 px-6 w-full text-xs">
                    Search Medicines
                  </button>
                </div>
              ) : (
                <>
                  <div className="max-h-[360px] overflow-y-auto pr-2 no-scrollbar mb-8 -mr-2">
                    {items.map((item) => (
                      <div key={item.drug_code} className="flex gap-4 mb-6 pb-6 border-b border-outline-variant/30 last:border-0 last:mb-0 group">
                        <div className="w-12 h-12 bg-primary-light/50 border border-primary/10 flex items-center justify-center shrink-0 rounded-xl font-display font-bold text-[10px] text-primary uppercase">
                          PMBJP
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-on-surface text-sm truncate mb-1">{item.name}</div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-on-surface/40 mb-2">
                            {item.unit_size} • ₹{item.mrp} each
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-surface-low rounded-lg p-0.5">
                              <button onClick={() => updateQuantity(item.drug_code, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-on-surface/60 hover:text-primary transition-colors font-bold">-</button>
                              <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.drug_code, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-on-surface/60 hover:text-primary transition-colors font-bold">+</button>
                            </div>
                            <button onClick={() => removeItem(item.drug_code)} className="ml-auto text-on-surface/30 hover:text-red-500 transition-colors p-1" aria-label={`Remove ${item.name}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-on-surface font-extrabold text-sm shrink-0">
                          ₹{(item.mrp * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-success-soft/50 border border-success/20 rounded-xl p-4 mb-8 text-center">
                    <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Saving ₹{totalSavings.toFixed(2)} vs Market Brand
                    </span>
                  </div>

                  <div className="space-y-4 text-sm font-medium pt-2 mb-8">
                    <div className="flex justify-between text-on-surface/60"><span>Generic Subtotal</span><span className="font-semibold text-on-surface">₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-on-surface/60"><span>Fulfillment Fee</span><span className="font-semibold text-on-surface">₹{logisticsFee.toFixed(2)}</span></div>
                    <div className="flex justify-between text-success"><span>Govt. Subsidy</span><span className="font-bold">-₹{subsidy.toFixed(2)}</span></div>
                    <div className="flex justify-between items-end pt-5 border-t border-outline-variant mt-2">
                      <span className="font-display font-bold text-on-surface text-lg">Net Payable</span>
                      <span className="font-display text-4xl font-extrabold text-primary tracking-tighter leading-none">₹{totalPayable.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Dynamic Action Button based on auth state */}
              {(() => {
                if (!user) {
                  return (
                    <button
                      onClick={handleCheckout}
                      className="w-full btn-primary py-4 rounded-xl transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20 hover:-translate-y-0.5 group"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.05em]">
                        Sign In to Checkout <Lock className="w-4 h-4" />
                      </div>
                    </button>
                  );
                }

                if (items.length === 0) {
                  return (
                    <button
                      disabled
                      className="w-full btn-secondary py-4 rounded-xl opacity-50 cursor-not-allowed transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.05em]">
                        Cart is Empty
                      </div>
                    </button>
                  );
                }

                if (!selectedStore) {
                  return (
                    <button
                      onClick={() => navigate('/fulfillment')}
                      className="w-full btn-primary py-4 rounded-xl transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20 hover:-translate-y-0.5 group"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.05em]">
                        Select Kendra to Continue <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    disabled={processing}
                    onClick={handleCheckout}
                    className="w-full btn-primary py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20 hover:-translate-y-0.5 group"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.05em]">
                      {processing ? 'Processing...' : 'Generate Order'} <MessageCircle className="w-4 h-4 group-hover:animate-subtlePulse" />
                    </div>
                    {!processing && <span className="text-[9px] text-white/70 uppercase tracking-widest font-bold">Via Encrypted WhatsApp</span>}
                  </button>
                );
              })()}

              <div className="flex justify-center gap-8 mt-6 opacity-40">
                <div className="flex items-center gap-1.5"><Lock className="w-3 h-3" /><div className="text-[9px] font-bold uppercase tracking-widest">256-Bit SSL</div></div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /><div className="text-[9px] font-bold uppercase tracking-widest">ISO 27001</div></div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function Sparkles(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
