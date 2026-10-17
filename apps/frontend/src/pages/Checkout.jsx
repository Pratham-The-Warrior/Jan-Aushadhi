// ============================================================
// Checkout Page — place an order with a Jan Aushadhi Kendra
// Pickup or delivery → prescription confirmation → place order.
// Totals mirror what the backend sends the Kendra: medicine MRPs
// only. Delivery charges (if any) are agreed with the Kendra.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Trash2, MessageCircle, Lock, Package, ArrowRight, Sparkles, Store, Bike, FileCheck2, Check, LocateFixed } from 'lucide-react';
import useCartStore, {
  selectSubtotal,
  selectSavings,
  selectItemCount,
} from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { createRequirement, getWhatsAppLink } from '../services/api';
import OrderSuccess from '../components/checkout/OrderSuccess';
import { toast } from '../store/toastStore';
import { formatINR } from '../utils/format';

function Step({ number, title, done, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${done ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
          {done ? <Check className="w-4 h-4" /> : number}
        </div>
        <h2 className="font-display text-xl md:text-2xl font-bold text-on-surface">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Checkout() {
  const navigate = useNavigate();

  const items = useCartStore((s) => s.items);
  const selectedStore = useCartStore((s) => s.selectedStore);
  const legalAttestation = useCartStore((s) => s.legalAttestation);
  const setAttestation = useCartStore((s) => s.setAttestation);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const user = useAuthStore((s) => s.user);

  const subtotal = useCartStore(selectSubtotal);
  const totalSavings = useCartStore(selectSavings);
  const itemCount = useCartStore(selectItemCount);

  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [fulfillmentType, setFulfillmentType] = useState('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  // Delivery is routed to the nearest Kendra, so we need the patient's real location.
  // Never fall back to a default city: a wrong location sends the order to the wrong store.
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser cannot share location. Please choose Pickup instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.warning('Location permission is needed to find a Kendra near you for delivery.');
      },
      { timeout: 10000 },
    );
  };

  const handleFulfillmentTypeChange = (type) => {
    setFulfillmentType(type);
    if (type === 'DELIVERY' && !deliveryCoords) requestLocation();
  };

  const destinationReady = fulfillmentType === 'PICKUP'
    ? Boolean(selectedStore)
    : Boolean(deliveryAddress.trim() && deliveryCoords);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/auth', { state: { from: '/checkout' } });
      return;
    }
    if (items.length === 0) {
      navigate('/discovery');
      return;
    }
    if (fulfillmentType === 'PICKUP' && !selectedStore) {
      navigate('/fulfillment');
      return;
    }
    if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      toast.warning('Please enter your delivery address.');
      return;
    }
    if (fulfillmentType === 'DELIVERY' && !deliveryCoords) {
      requestLocation();
      return;
    }
    if (!legalAttestation) {
      toast.warning('Please confirm you have a prescription for these medicines.');
      return;
    }

    setProcessing(true);
    try {
      const result = await createRequirement({
        pmbjk_code: fulfillmentType === 'PICKUP' ? selectedStore.pmbjk_code : '',
        drug_codes: items.map((i) => ({
          code: i.drug_code, quantity: i.quantity, name: i.name,
          mrp: i.mrp, branded_mrp: i.branded_mrp,
        })),
        legal_attestation: true,
        delivery_address: fulfillmentType === 'PICKUP' ? 'Self-Pickup at Kendra' : deliveryAddress,
        payment_mode: 'COD',
        fulfillment_type: fulfillmentType,
        delivery_coords: fulfillmentType === 'DELIVERY' ? deliveryCoords : undefined,
      });

      try {
        const { whatsappUrl } = await getWhatsAppLink(result.ticketId);
        if (whatsappUrl) window.open(whatsappUrl, '_blank');
      } catch {
        console.warn('WhatsApp link generation failed, but order was created.');
      }

      setOrderResult(result);
      clearCart();
      toast.success('Order placed! The Kendra will confirm on WhatsApp.');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not place the order. Please try again.');
    }
    setProcessing(false);
  };

  if (orderResult) {
    const successStore = fulfillmentType === 'PICKUP'
      ? selectedStore
      : { name: `Nearest Kendra (${orderResult.pmbjk_code})` };
    return <OrderSuccess order={orderResult} store={successStore} />;
  }

  // Primary button: always tells the patient the next thing to do.
  let cta = { label: 'Place Order', icon: <MessageCircle className="w-4 h-4" />, disabled: processing };
  if (!user) cta = { label: 'Sign in to place order', icon: <Lock className="w-4 h-4" /> };
  else if (items.length === 0) cta = { label: 'Search medicines', icon: <ArrowRight className="w-4 h-4" /> };
  else if (fulfillmentType === 'PICKUP' && !selectedStore) cta = { label: 'Choose a Kendra', icon: <ArrowRight className="w-4 h-4" /> };
  else if (processing) cta = { label: 'Placing order…', icon: null, disabled: true };

  return (
    <div className="flex-1 w-full bg-surface pb-24 md:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-14 pb-6">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Checkout</h1>
        <p className="text-on-surface/60 mt-2">Pick up from a Jan Aushadhi Kendra or get it delivered. You pay the Kendra directly.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* Steps */}
          <div className="flex-1 space-y-10 min-w-0">

            <Step number={1} title="Pickup or delivery" done={destinationReady}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { key: 'PICKUP', icon: Store, label: 'Pick up', hint: 'From a Kendra you choose' },
                  { key: 'DELIVERY', icon: Bike, label: 'Delivery', hint: 'From the nearest Kendra' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleFulfillmentTypeChange(opt.key)}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      fulfillmentType === opt.key ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-lowest hover:border-primary/40'
                    }`}
                  >
                    <opt.icon className={`w-5 h-5 mb-2 ${fulfillmentType === opt.key ? 'text-primary' : 'text-on-surface/50'}`} />
                    <div className="font-display font-bold text-on-surface">{opt.label}</div>
                    <div className="text-sm text-on-surface/60">{opt.hint}</div>
                  </button>
                ))}
              </div>

              {fulfillmentType === 'PICKUP' ? (
                <div className="bg-surface-lowest rounded-xl ghost-border p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  {selectedStore ? (
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-on-surface">{selectedStore.name}</div>
                      <div className="text-sm text-on-surface/60 mt-0.5">{selectedStore.address}</div>
                      <div className="text-sm text-on-surface/50 mt-0.5">{selectedStore.pmbjk_code} · PIN {selectedStore.pincode}</div>
                      <button onClick={() => navigate('/fulfillment')} className="mt-3 text-primary font-semibold text-sm hover:underline inline-flex items-center gap-1">
                        Change Kendra <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="font-semibold text-on-surface">No Kendra chosen yet</div>
                      <div className="text-sm text-on-surface/60 mt-0.5">Find one near you by pincode or location.</div>
                      <button onClick={() => navigate('/fulfillment')} className="btn-secondary mt-3 py-2.5 px-5 text-sm">Choose a Kendra</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-surface-lowest rounded-xl ghost-border p-5 space-y-4">
                  <div>
                    <label htmlFor="delivery-address" className="block text-sm font-semibold text-on-surface/80 mb-2">Delivery address</label>
                    <textarea
                      id="delivery-address"
                      rows={3}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House / flat number, building, street, landmark, pincode"
                      className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-low text-on-surface placeholder-on-surface/40 focus:outline-none focus:border-primary text-sm resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={deliveryCoords ? 'text-success font-medium' : 'text-on-surface/60'}>
                      {deliveryCoords ? '✓ Location shared — we will route to the nearest Kendra' : 'We need your location to find the nearest Kendra.'}
                    </span>
                    {!deliveryCoords && (
                      <button onClick={requestLocation} disabled={locating} className="btn-secondary py-2 px-4 text-sm inline-flex items-center gap-2 shrink-0">
                        <LocateFixed className="w-4 h-4" /> {locating ? 'Locating…' : 'Share location'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-on-surface/50">Delivery charges, if any, are confirmed by the Kendra on WhatsApp before dispatch.</p>
                </div>
              )}
            </Step>

            <Step number={2} title="Prescription" done={legalAttestation}>
              <label className={`flex items-start gap-4 rounded-xl border-2 p-5 cursor-pointer transition-colors ${
                legalAttestation ? 'border-success/40 bg-success-soft/40' : 'border-outline-variant bg-surface-lowest hover:border-primary/40'
              }`}>
                <input
                  type="checkbox"
                  checked={legalAttestation}
                  onChange={(e) => setAttestation(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[var(--color-primary)] shrink-0"
                />
                <span>
                  <span className="flex items-center gap-2 font-semibold text-on-surface"><FileCheck2 className="w-4 h-4 text-primary" /> I have a valid prescription</span>
                  <span className="block text-sm text-on-surface/60 mt-1">
                    Prescription medicines are only dispensed against a doctor's prescription. Please show it to the pharmacist at pickup or delivery.
                  </span>
                </span>
              </label>
            </Step>

            <Step number={3} title="Payment">
              <div className="bg-surface-lowest ghost-border rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-display font-bold shrink-0">₹</div>
                <div>
                  <div className="font-semibold text-on-surface">Pay the Kendra directly</div>
                  <p className="text-sm text-on-surface/60 mt-1">
                    Pay by UPI or cash when you collect your medicines. Nothing is charged online. The pharmacist confirms your order on WhatsApp.
                  </p>
                </div>
              </div>
            </Step>
          </div>

          {/* Order summary */}
          <aside className="w-full lg:w-[400px] shrink-0">
            <div className="bg-surface-lowest rounded-2xl ghost-border clinical-shadow p-6 lg:sticky lg:top-28">
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-outline-variant">
                <h2 className="font-display text-xl font-bold text-on-surface">Your order</h2>
                <span className="text-sm text-on-surface/60">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-surface-low rounded-2xl flex items-center justify-center mx-auto mb-4 text-on-surface/30">
                    <Package className="w-7 h-7" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1">Your cart is empty</h3>
                  <p className="text-sm text-on-surface/60">Search for your medicine to see its Jan Aushadhi price.</p>
                </div>
              ) : (
                <>
                  <ul className="max-h-[360px] overflow-y-auto no-scrollbar mb-5 divide-y divide-outline-variant/40">
                    {items.map((item) => (
                      <li key={item.drug_code} className="py-4 first:pt-0">
                        <div className="flex gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-on-surface text-sm leading-snug">{item.name}</div>
                            <div className="text-xs text-on-surface/50 mt-1">
                              {formatINR(item.mrp)} per {item.unit_size || 'pack'}
                              {item.branded_name ? ` · instead of ${item.branded_name}` : ''}
                            </div>
                          </div>
                          <div className="font-bold text-on-surface text-sm shrink-0">{formatINR(item.mrp * item.quantity)}</div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center bg-surface-low rounded-lg">
                            <button onClick={() => updateQuantity(item.drug_code, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-on-surface/60 hover:text-primary font-bold" aria-label="Decrease quantity">−</button>
                            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.drug_code, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-on-surface/60 hover:text-primary font-bold" aria-label="Increase quantity">+</button>
                          </div>
                          <button onClick={() => removeItem(item.drug_code)} className="ml-auto text-on-surface/40 hover:text-red-600 p-1" aria-label={`Remove ${item.name}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {totalSavings > 0 && (
                    <div className="bg-success-soft/60 border border-success/20 rounded-lg px-4 py-3 mb-5 text-sm font-semibold text-success flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> You save {formatINR(totalSavings)} vs the brands
                    </div>
                  )}

                  <div className="space-y-2 text-sm mb-6">
                    <div className="flex justify-between text-on-surface/70"><span>Medicines (MRP)</span><span className="font-semibold text-on-surface">{formatINR(subtotal)}</span></div>
                    {fulfillmentType === 'DELIVERY' && (
                      <div className="flex justify-between text-on-surface/70"><span>Delivery</span><span>Confirmed by Kendra</span></div>
                    )}
                    <div className="flex justify-between items-end pt-4 mt-2 border-t border-outline-variant">
                      <span className="font-display font-bold text-on-surface text-lg">To pay at Kendra</span>
                      <span className="font-display text-3xl font-bold text-primary leading-none">{formatINR(subtotal)}</span>
                    </div>
                  </div>
                </>
              )}

              <button
                disabled={cta.disabled}
                onClick={handleCheckout}
                className="w-full btn-primary py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base font-bold"
              >
                {cta.label} {cta.icon}
              </button>
              {user && items.length > 0 && destinationReady && !legalAttestation && (
                <p className="text-xs text-center text-on-surface/50 mt-3">Confirm your prescription (step 2) to place the order.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
