// ============================================================
// Checkout Page — Requirement Authorization
// Refactored: uses AttestationModal, OrderSuccess components
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ShieldCheck, Clock, Zap, Trash2, MessageCircle, Lock } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { createRequirement, getWhatsAppLink } from '../services/api';
import AttestationModal from '../components/checkout/AttestationModal';
import OrderSuccess from '../components/checkout/OrderSuccess';

export default function Checkout() {
  const navigate = useNavigate();

  // Store selectors (granular subscriptions)
  const items = useCartStore((s) => s.items);
  const selectedStore = useCartStore((s) => s.selectedStore);
  const legalAttestation = useCartStore((s) => s.legalAttestation);
  const setAttestation = useCartStore((s) => s.setAttestation);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);

  const user = useAuthStore((s) => s.user);

  // Calculated values
  const subtotal = items.reduce((sum, i) => sum + i.mrp * i.quantity, 0);
  const totalBrandedValue = items.reduce((sum, i) => sum + (i.branded_mrp || 0) * i.quantity, 0);
  const totalSavings = totalBrandedValue - subtotal;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

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
    if (!user) {
      navigate('/auth', { state: { from: '/checkout' } });
      return;
    }
    if (!legalAttestation) {
      setShowAttestationModal(true);
      return;
    }
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

  // ---- Main Checkout View ----
  return (
    <div className="flex-1 w-full bg-surface pb-24 md:pb-24">
      <AttestationModal
        isOpen={showAttestationModal}
        attested={legalAttestation}
        onAttest={setAttestation}
        onClose={() => setShowAttestationModal(false)}
        onConfirm={() => setShowAttestationModal(false)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface mb-3 tracking-tight">Requirement Authorization</h1>
          <p className="text-on-surface/60 text-lg">Route your medical requirements to the nearest Kendra for fulfillment.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Column */}
          <div className="flex-1 space-y-10">
            {/* WhatsApp Fulfillment Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-md p-6 flex items-center gap-5 ghost-border animate-slideUp">
              <div className="w-12 h-12 bg-primary/10 rounded-md text-primary flex items-center justify-center shrink-0 border border-primary/20"><MessageCircle className="w-6 h-6" /></div>
              <div>
                <h3 className="font-display font-bold text-primary mb-1 text-lg">Direct WhatsApp Fulfillment</h3>
                <p className="text-sm text-on-surface/70 leading-relaxed">Your order will be shared with the pharmacist via WhatsApp for prescription verification and payment.</p>
              </div>
            </div>

            {/* 01 Store Selection */}
            <div>
              <div className="flex items-center gap-4 mb-6"><div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-sm">01</div><h2 className="font-display text-2xl font-bold text-on-surface">Target Kendra</h2></div>
              <div className="bg-surface-lowest rounded-lg border border-outline-variant flex flex-col md:flex-row overflow-hidden clinical-shadow">
                <div className="w-full md:w-5/12 bg-surface-low relative flex items-center justify-center p-12">
                  <MapPin className="w-16 h-16 text-primary/20" />
                  <div className="absolute bottom-4 left-4 right-4 bg-primary text-white text-[9px] font-bold px-3 py-1.5 rounded uppercase tracking-widest text-center shadow-lg">Verified Location</div>
                </div>
                <div className="w-full md:w-7/12 p-8 bg-surface-lowest flex flex-col justify-center">
                  {!selectedStore ? (
                    <div className="text-center">
                      <p className="text-sm text-on-surface/60 mb-4">No store selected</p>
                      <button onClick={() => navigate('/fulfillment')} className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">Select a Store →</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div><div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">PMBJK Store</div><div className="font-display font-bold text-on-surface text-xl">{selectedStore.name}</div></div>
                      <div><div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Address</div><div className="font-medium text-on-surface/70 text-sm leading-relaxed">{selectedStore.address}</div></div>
                      <button onClick={() => navigate('/fulfillment')} className="text-primary font-bold text-[10px] uppercase tracking-widest hover:underline">Change Store</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 02 Logistics */}
            <div>
              <div className="flex items-center gap-4 mb-6"><div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-sm">02</div><h2 className="font-display text-2xl font-bold text-on-surface">Fulfillment Timing</h2></div>
              <div className="flex flex-col sm:flex-row gap-5">
                {[
                  { key: 'express', icon: <Zap />, label: 'Standard', time: 'Today, within 24h', fee: 40 },
                  { key: 'scheduled', icon: <Clock />, label: 'Next Day', time: 'Tomorrow morning', fee: 20 },
                ].map((opt) => (
                  <div key={opt.key} onClick={() => setDeliveryMode(opt.key)} className={`flex-1 rounded-lg p-6 pt-8 cursor-pointer transition-all relative ${deliveryMode === opt.key ? 'bg-primary/5 border-2 border-primary clinical-shadow' : 'bg-surface-lowest border border-outline-variant'}`}>
                    <div className={`w-8 h-8 mb-4 ${deliveryMode === opt.key ? 'text-primary' : 'text-on-surface/40'}`}>{opt.icon}</div>
                    <h3 className="font-display font-bold mb-2 text-lg text-on-surface">{opt.label}</h3>
                    <p className="text-sm text-on-surface/60 mb-4">{opt.time}</p>
                    <div className="text-xs font-bold text-primary uppercase tracking-widest">Fee: ₹{opt.fee}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 03 Payment */}
            <div>
              <div className="flex items-center gap-4 mb-6"><div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-sm">03</div><h2 className="font-display text-2xl font-bold text-on-surface">Payment Protocol</h2></div>
              <div className="bg-surface-lowest border border-outline-variant rounded-lg p-8 clinical-shadow">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-16 h-16 bg-surface-low border border-outline-variant rounded flex items-center justify-center text-4xl">₹</div>
                  <div>
                    <h4 className="font-display font-bold text-on-surface text-lg">Finalize via WhatsApp</h4>
                    <p className="text-sm text-on-surface/60 font-medium leading-relaxed">Payments are settled directly with the Jan Aushadhi Kendra operator using UPI or Cash on Delivery after prescription validation.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {['UPI QR', 'Cash on Delivery', 'Secure Settlement'].map((t) => (
                    <span key={t} className="text-[10px] font-bold uppercase tracking-widest bg-surface-low px-4 py-2 rounded-sm border border-outline-variant/50 text-on-surface/70">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Attestation Status */}
            <div className={`p-6 rounded-md border flex items-center gap-4 transition-all ${legalAttestation ? 'bg-primary/5 border-primary/20' : 'bg-amber-50 border-amber-200'}`}>
              <ShieldCheck className={`w-6 h-6 ${legalAttestation ? 'text-primary' : 'text-amber-600'}`} />
              <div className="flex-1">
                <p className={`text-sm font-bold uppercase tracking-widest ${legalAttestation ? 'text-primary' : 'text-amber-900'}`}>{legalAttestation ? 'Prescription Attested' : 'Prescription Missing'}</p>
              </div>
              {!legalAttestation && <button onClick={() => setShowAttestationModal(true)} className="text-amber-700 font-bold text-xs underline uppercase tracking-widest">Sign Now</button>}
            </div>
          </div>

          {/* Side Panel: Order Summary */}
          <div className="w-full lg:w-[420px] shrink-0">
            <div className="bg-surface-lowest rounded-lg border border-outline-variant clinical-shadow p-8 sticky top-24">
              <div className="flex justify-between items-end mb-8 pb-4 border-b border-outline-variant">
                <h2 className="font-display text-xl font-bold text-on-surface">Order Summary</h2>
                <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">{itemCount} Units</div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <svg className="w-12 h-12 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></svg>
                  <p className="text-sm font-bold uppercase tracking-widest">Empty Basket</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[300px] overflow-y-auto pr-2 no-scrollbar mb-8">
                    {items.map((item) => (
                      <div key={item.drug_code} className="flex gap-4 mb-6 border-b border-outline-variant/30 pb-6 last:border-0 last:mb-0">
                        <div className="w-14 h-14 bg-surface-low border border-outline-variant/50 flex items-center justify-center shrink-0 rounded font-display font-medium text-xs text-on-surface/40 uppercase">PMBJP</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-on-surface text-sm truncate mb-1">{item.name}</div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-on-surface/40 mb-3">{item.unit_size} • Qty: {item.quantity}</div>
                          <div className="flex items-center gap-4">
                            <button onClick={() => updateQuantity(item.drug_code, item.quantity - 1)} className="text-[10px] font-bold text-primary uppercase hover:underline">Decrease</button>
                            <button onClick={() => updateQuantity(item.drug_code, item.quantity + 1)} className="text-[10px] font-bold text-primary uppercase hover:underline">Increase</button>
                            <button onClick={() => removeItem(item.drug_code)} className="ml-auto text-red-500/50 hover:text-red-500 transition-colors" aria-label={`Remove ${item.name}`}><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="text-on-surface font-bold text-sm shrink-0">₹{(item.mrp * item.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 text-sm pt-4 border-t border-outline-variant mb-8">
                    <div className="flex justify-between font-medium text-on-surface/60"><span>Generic Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between font-medium text-on-surface/60"><span>Fulfillment Fee</span><span>₹{logisticsFee.toFixed(2)}</span></div>
                    <div className="flex justify-between text-primary font-bold"><span>Govt. Subsidy</span><span>-₹{subsidy.toFixed(2)}</span></div>
                    <div className="flex justify-between items-end pt-4 border-t border-outline-variant">
                      <span className="font-display font-bold text-on-surface text-lg">Net Payable</span>
                      <span className="font-display text-4xl font-bold text-primary tracking-tighter">₹{totalPayable.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/10 rounded p-4 mb-8 text-center animate-pulse">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Saving ₹{totalSavings.toFixed(2)} vs Market Brand</span>
                  </div>
                </>
              )}

              <button
                disabled={!selectedStore || items.length === 0 || processing}
                onClick={handleCheckout}
                className="w-full btn-primary py-5 rounded-md disabled:opacity-30 disabled:grayscale transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20"
              >
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em]">
                  {processing ? 'Connecting...' : 'Generate WhatsApp Order'} <MessageCircle className="w-4 h-4" />
                </div>
                {!processing && <span className="text-[8px] opacity-70 uppercase tracking-widest font-bold">Secure Ticket Generation</span>}
              </button>

              <div className="flex justify-center gap-10 mt-8 opacity-40">
                <div className="flex flex-col items-center gap-2"><Lock className="w-4 h-4" /><div className="text-[8px] font-bold uppercase tracking-widest">SSL Encrypted</div></div>
                <div className="flex flex-col items-center gap-2"><ShieldCheck className="w-4 h-4" /><div className="text-[8px] font-bold uppercase tracking-widest">ISO 27001</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
