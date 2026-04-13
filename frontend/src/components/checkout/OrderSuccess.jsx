// ============================================================
// OrderSuccess — Post-checkout confirmation screen
// Extracted from Checkout.jsx
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MessageCircle, Zap } from 'lucide-react';
import { getWhatsAppLink } from '../../services/api';

/**
 * @param {object} props
 * @param {object} props.order      - Order result { ticketId, status, totalGenericValue, savings }
 * @param {object} [props.store]    - Selected store { name }
 */
export default function OrderSuccess({ order, store }) {
  const navigate = useNavigate();

  const handleResendWhatsApp = async () => {
    try {
      const { whatsappUrl } = await getWhatsAppLink(order.ticketId);
      window.open(whatsappUrl, '_blank');
    } catch {
      alert('Could not fetch WhatsApp link');
    }
  };

  return (
    <div className="flex-1 w-full bg-surface flex items-center justify-center py-20 pb-32">
      <div className="bg-surface-lowest rounded-lg clinical-shadow border border-outline-variant p-12 max-w-lg text-center w-full mx-4 animate-slideUp">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/20">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>

        <h2 className="font-display text-3xl font-bold text-on-surface mb-3">Requirement Sent!</h2>
        <p className="text-on-surface/60 mb-8 leading-relaxed">
          Your ticket has been generated and routed to <strong>{store?.name}</strong>. Please check
          your WhatsApp to finalize delivery details.
        </p>

        {/* Ticket Details */}
        <div className="bg-surface-low rounded-md p-6 mb-10 text-left space-y-3 ghost-border">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
            <span className="text-on-surface/40">Ticket ID</span>
            <span className="text-on-surface">{order.ticketId}</span>
          </div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
            <span className="text-on-surface/40">Status</span>
            <span className="text-primary">{order.status}</span>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/50">
            <span className="text-[10px] text-on-surface/40 uppercase font-bold tracking-widest">
              Fulfillment
            </span>
            <button
              onClick={handleResendWhatsApp}
              className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-all font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-widest flex items-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Re-Send to WhatsApp
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/wellness')}
            className="btn-primary py-4 w-full text-base flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Track Order in Wellness
          </button>
          <p className="text-[10px] text-on-surface/40 uppercase tracking-[0.2em] font-bold">
            Fulfillment via Jan Aushadhi Kendra
          </p>
        </div>
      </div>
    </div>
  );
}
