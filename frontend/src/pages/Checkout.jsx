import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ShieldCheck, CreditCard, Banknote, Clock, Zap, Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { createRequirement } from '../services/api';

export default function Checkout() {
  const navigate = useNavigate();
  const items = useCartStore(s => s.items);
  const selectedStore = useCartStore(s => s.selectedStore);
  const legalAttestation = useCartStore(s => s.legalAttestation);
  const setAttestation = useCartStore(s => s.setAttestation);
  const removeItem = useCartStore(s => s.removeItem);
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const clearCart = useCartStore(s => s.clearCart);
  
  const user = useAuthStore(s => s.user);

  const subtotal = items.reduce((sum, i) => sum + i.mrp * i.quantity, 0);
  const totalBrandedValue = items.reduce((sum, i) => sum + (i.branded_mrp || 0) * i.quantity, 0);
  const totalSavings = totalBrandedValue - subtotal;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const [deliveryMode, setDeliveryMode] = useState('express');
  const [paymentMode, setPaymentMode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [showAttestationModal, setShowAttestationModal] = useState(false);

  const logisticsFee = deliveryMode === 'express' ? 40 : 20;
  const subsidy = Math.min(subtotal * 0.05, 50);
  const totalPayable = subtotal + logisticsFee - subsidy;

  const handleCheckout = async () => {
    if (!user) {
      navigate('/auth', { state: { from: '/checkout' } });
      return;
    }
    if (!legalAttestation) { setShowAttestationModal(true); return; }
    if (!paymentMode) { alert('Please select a payment method.'); return; }
    if (items.length === 0) { alert('Your cart is empty.'); return; }

    setProcessing(true);
    try {
      const result = await createRequirement({
        pmbjk_code: selectedStore?.pmbjk_code || 'unassigned',
        drug_codes: items.map(i => ({ code: i.drug_code, quantity: i.quantity, name: i.name, mrp: i.mrp })),
        legal_attestation: true,
        delivery_address: '122B, Skyline Residency, Powai, Mumbai - 400076',
        payment_mode: paymentMode === 'pod' ? 'COD' : paymentMode.toUpperCase(),
      });
      setOrderResult(result);
    } catch { alert('Checkout failed.'); }
    setProcessing(false);
  };

  // Attestation Modal
  const AttestationModal = () => (
    <div className="fixed inset-0 bg-on-surface/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all" onClick={() => setShowAttestationModal(false)}>
      <div className="bg-surface-lowest rounded-lg clinical-shadow max-w-lg w-full p-8 md:p-10 border border-outline-variant" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-amber-50 rounded-md border border-amber-200 flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
          <div>
            <h3 className="font-display text-xl font-bold text-on-surface">Legal Attestation Required</h3>
            <p className="text-sm text-on-surface/60 mt-1">This is a mandatory regulatory step</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-5 mb-8 ghost-border">
          <p className="text-sm text-amber-900 leading-[1.6]">
            As per the <strong>Drugs and Cosmetics Act, 1940</strong>, Schedule H and H1 medicines can only be dispensed against a valid prescription from a registered medical practitioner. By proceeding, you confirm possession of a physical prescription for all items in this order.
          </p>
        </div>
        <div className="flex items-start gap-4 mb-8">
          <div className="shrink-0 mt-0.5">
            <input type="checkbox" id="attest" className="w-5 h-5 accent-primary cursor-pointer" checked={legalAttestation} onChange={(e) => setAttestation(e.target.checked)} />
          </div>
          <label htmlFor="attest" className="text-sm text-on-surface/80 leading-[1.6] cursor-pointer font-medium">
            I, the undersigned, hereby attest that I possess a valid paper prescription for the medicines listed in this order. I understand that the pharmacist will verify this prescription upon delivery.
          </label>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowAttestationModal(false)} className="flex-1 btn-secondary py-3.5 shadow-none rounded-md">Cancel</button>
          <button onClick={() => { if (legalAttestation) setShowAttestationModal(false); }} disabled={!legalAttestation} className="flex-1 btn-primary py-3.5 disabled:opacity-40 disabled:cursor-not-allowed">Confirm Attestation</button>
        </div>
      </div>
    </div>
  );

  if (orderResult) {
    return (
      <div className="flex-1 w-full bg-surface flex items-center justify-center py-20 pb-32">
        <div className="bg-surface-lowest rounded-lg clinical-shadow border border-outline-variant p-12 max-w-lg text-center w-full mx-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/20"><ShieldCheck className="w-10 h-10 text-primary" /></div>
          <h2 className="font-display text-3xl font-bold text-on-surface mb-3">Order Placed!</h2>
          <p className="text-on-surface/60 mb-8 leading-[1.6]">Your requirement ticket has been securely routed to the selected JanAushadhi Kendra.</p>
          <div className="bg-surface-low rounded-md p-6 mb-10 text-left space-y-3 ghost-border">
            <div className="flex justify-between text-sm"><span className="text-on-surface/60">Ticket ID</span><span className="font-bold text-on-surface">{orderResult.ticketId}</span></div>
            <div className="flex justify-between text-sm"><span className="text-on-surface/60">Status</span><span className="font-bold text-primary uppercase">{orderResult.status}</span></div>
            <div className="flex justify-between text-sm"><span className="text-on-surface/60">Payment</span><span className="font-bold text-on-surface">Cash on Delivery</span></div>
          </div>
          <button onClick={() => { clearCart(); navigate('/home'); }} className="btn-primary py-3.5 w-full text-base">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-surface pb-24 md:pb-24">
      {showAttestationModal && <AttestationModal />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface mb-3 tracking-tight">Secure Checkout</h1>
          <p className="text-on-surface/60 text-lg">Complete your pharmaceutical order with clinical precision.</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-10">
            {/* Pharmacist Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-md p-6 flex items-center gap-5 ghost-border">
              <div className="w-12 h-12 bg-primary/10 rounded-md text-primary flex items-center justify-center shrink-0 border border-primary/20"><ShieldCheck className="w-6 h-6" /></div>
              <div><h3 className="font-display font-bold text-primary mb-1 text-lg">Verified Pharmacist Review</h3><p className="text-sm text-on-surface/70 leading-[1.6]">Every order is cross-checked by licensed practitioners for clinical safety.</p></div>
            </div>

            {/* 01 Delivery */}
            <div>
              <div className="flex items-center gap-4 mb-6"><div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-sm">01</div><h2 className="font-display text-2xl font-bold text-on-surface">Delivery Logistics</h2></div>
              <div className="bg-surface-lowest rounded-lg border border-outline-variant flex flex-col md:flex-row overflow-hidden h-auto md:h-56 clinical-shadow">
                <div className="w-full md:w-5/12 bg-surface-low relative flex items-end">
                  <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 bg-primary rounded-full text-white flex items-center justify-center shadow-lg border-[3px] border-surface-lowest"><MapPin className="w-5 h-5" /></div></div>
                  <div className="w-full bg-surface-lowest relative z-10 m-5 mt-auto p-4 rounded-md shadow-sm border border-outline-variant"><div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Precise Location</div><div className="text-sm font-semibold text-on-surface">122B, Skyline Residency, Powai, Mumbai - 400076</div></div>
                </div>
                <div className="w-full md:w-7/12 p-8 bg-surface-lowest flex flex-col justify-center space-y-6">
                  <div><div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Recipient</div><div className="font-display font-bold text-on-surface text-xl">Dr. Ananya Sharma</div></div>
                  <div><div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase mb-1">Contact</div><div className="font-bold text-on-surface">+91 98765 43210</div></div>
                </div>
              </div>
            </div>

            {/* 02 Schedule */}
            <div>
              <div className="flex items-center gap-4 mb-6"><div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-sm">02</div><h2 className="font-display text-2xl font-bold text-on-surface">Schedule Fulfillment</h2></div>
              <div className="flex flex-col sm:flex-row gap-5">
                <div onClick={() => setDeliveryMode('express')} className={`flex-1 rounded-lg p-6 pt-8 cursor-pointer transition-all relative ${deliveryMode === 'express' ? 'bg-primary/5 border-2 border-primary clinical-shadow' : 'bg-surface-lowest border border-outline-variant hover:border-primary/50'}`}>
                  {deliveryMode === 'express' && <div className="absolute top-3 right-3 bg-primary text-white text-[9px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider">Express</div>}
                  <Zap className={`w-6 h-6 mb-4 ${deliveryMode === 'express' ? 'text-primary' : 'text-on-surface/40'}`} />
                  <h3 className="font-display font-bold mb-2 text-lg text-on-surface">Priority Delivery</h3><p className="text-sm text-on-surface/60 mb-4">Within 4 hours</p>
                  <div className="text-sm font-bold text-primary">Est: Today, 4-8 PM</div>
                </div>
                <div onClick={() => setDeliveryMode('scheduled')} className={`flex-1 rounded-lg p-6 pt-8 cursor-pointer transition-all ${deliveryMode === 'scheduled' ? 'bg-primary/5 border-2 border-primary clinical-shadow' : 'bg-surface-lowest border border-outline-variant hover:border-primary/50'}`}>
                  <Clock className={`w-6 h-6 mb-4 ${deliveryMode === 'scheduled' ? 'text-primary' : 'text-on-surface/40'}`} />
                  <h3 className="font-display font-bold mb-2 text-lg text-on-surface">Scheduled</h3><p className="text-sm text-on-surface/60 mb-4">Select convenient time</p>
                  <div className="text-sm font-bold text-on-surface">Tomorrow, 9 AM</div>
                </div>
              </div>
            </div>

            {/* 03 Payment */}
            <div>
              <div className="flex items-center gap-4 mb-6"><div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-sm">03</div><h2 className="font-display text-2xl font-bold text-on-surface">Payment Processing</h2></div>
              <div className="space-y-4">
                {[
                  { key: 'upi', icon: '₹', title: 'UPI', desc: 'GPay, PhonePe, BHIM' },
                  { key: 'card', icon: <CreditCard className="w-5 h-5" />, title: 'Credit / Debit Card', desc: '256-bit encrypted' },
                  { key: 'pod', icon: <Banknote className="w-5 h-5" />, title: 'Pay on Delivery', desc: 'Cash or QR code' },
                ].map(pm => (
                  <div key={pm.key} onClick={() => setPaymentMode(pm.key)} className={`bg-surface-lowest border rounded-md p-5 flex items-center justify-between cursor-pointer transition-colors ${paymentMode === pm.key ? 'border-primary ring-1 ring-primary shadow-sm' : 'border-outline-variant hover:border-primary/50'}`}>
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-md flex items-center justify-center text-xl font-bold border ${paymentMode === pm.key ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-low text-on-surface/50 border-outline-variant'}`}>{typeof pm.icon === 'string' ? pm.icon : pm.icon}</div>
                      <div><h4 className="font-display font-bold text-on-surface mb-1">{pm.title}</h4><p className="text-sm text-on-surface/60">{pm.desc}</p></div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMode === pm.key ? 'border-primary' : 'border-outline-variant'}`}>
                      {paymentMode === pm.key && <div className="w-3 h-3 bg-primary rounded-full" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attestation Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-md p-6 flex items-start gap-4 cursor-pointer" onClick={() => setShowAttestationModal(true)}>
              <input type="checkbox" checked={legalAttestation} readOnly className="mt-1 w-5 h-5 accent-primary" />
              <p className="text-sm text-amber-900 leading-[1.6]"><strong className="font-display font-bold">Legal Attestation:</strong> I confirm I possess a valid paper prescription. <span className="text-primary font-bold hover:underline">Click to verify →</span></p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-[420px] shrink-0">
            <div className="bg-surface-lowest rounded-lg border border-outline-variant clinical-shadow p-8 sticky top-24">
              <div className="flex justify-between items-end mb-8 pb-4 border-b border-outline-variant">
                <h2 className="font-display text-xl font-bold text-on-surface">Clinical Order Summary</h2>
                <div className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">{itemCount} Items</div>
              </div>
              {items.length === 0 ? (
                <div className="text-center py-12 text-on-surface/50"><p className="mb-4">Your cart is empty</p><button onClick={() => navigate('/discovery')} className="text-primary font-semibold text-sm hover:underline">Find Generics →</button></div>
              ) : (
                <>
                  <div className="space-y-6 mb-8">
                    {items.map(item => (
                      <div key={item.drug_code} className="flex gap-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-md flex items-center justify-center shrink-0 text-xs font-bold uppercase">{item.drug_code.substring(0, 4)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-on-surface text-base truncate mb-1">{item.name}</div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-on-surface/50 mb-3">{item.unit_size} • Generic</div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => updateQuantity(item.drug_code, item.quantity - 1)} className="w-7 h-7 rounded-sm bg-surface-low border border-outline-variant flex items-center justify-center hover:bg-outline-variant text-on-surface"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="text-sm font-bold w-6 text-center text-on-surface">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.drug_code, item.quantity + 1)} className="w-7 h-7 rounded-sm bg-surface-low border border-outline-variant flex items-center justify-center hover:bg-outline-variant text-on-surface"><Plus className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeItem(item.drug_code)} className="ml-auto text-on-surface/40 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="text-on-surface font-bold text-base shrink-0">₹{(item.mrp * item.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 text-sm border-t border-outline-variant pt-6 mb-6">
                    <div className="flex justify-between"><span className="text-on-surface/60">Subtotal</span><span className="font-semibold text-on-surface">₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-on-surface/60">Logistics</span><span className="font-semibold text-on-surface">₹{logisticsFee.toFixed(2)}</span></div>
                    <div className="flex justify-between text-primary"><span className="font-medium">Subsidy</span><span className="font-bold">-₹{subsidy.toFixed(2)}</span></div>
                  </div>
                  <div className="flex justify-between items-end border-t border-outline-variant pt-6 mb-8">
                    <span className="font-display font-bold text-on-surface text-lg">Total Payable</span>
                    <span className="font-display text-4xl font-bold text-primary tracking-tight">₹{totalPayable.toFixed(2)}</span>
                  </div>
                  {totalSavings > 0 && <div className="bg-primary/5 border border-primary/20 rounded-md p-3.5 mb-6 text-center text-xs font-bold text-primary uppercase tracking-wider">You save ₹{totalSavings.toFixed(2)} vs branded!</div>}
                </>
              )}
              <button disabled={!paymentMode || items.length === 0 || processing} onClick={handleCheckout} className="w-full btn-primary py-4 disabled:opacity-40 flex items-center justify-center gap-2 text-base">
                {processing ? 'Processing...' : 'Authorize & Pay'} <LockIcon className="w-4 h-4" />
              </button>
              <div className="flex justify-center gap-8 mt-6">
                <div className="flex flex-col items-center gap-2"><ShieldCheck className="w-4 h-4 text-on-surface/40" /><div className="text-[9px] uppercase tracking-widest font-bold text-on-surface/40">SSL Secured</div></div>
                <div className="flex flex-col items-center gap-2"><ShieldIcon className="w-4 h-4 text-on-surface/40" /><div className="text-[9px] uppercase tracking-widest font-bold text-on-surface/40">Safe Care</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockIcon(p) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>; }
function ShieldIcon(p) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>; }
