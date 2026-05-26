// ============================================================
// OrderSuccess — Post-checkout confirmation screen
// Redesigned with new UI primitives and semantic colors
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MessageCircle, ArrowRight, PackageCheck } from 'lucide-react';
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
    <div className="flex-1 w-full bg-surface flex flex-col items-center justify-center py-16 md:py-24 px-4 min-h-[80vh]">
      <div className="bg-surface-lowest rounded-3xl clinical-shadow-lg border border-outline-variant p-8 md:p-12 max-w-xl w-full text-center animate-scaleIn relative overflow-hidden">
        
        {/* Success Icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-success-soft rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-success/10 rounded-full flex items-center justify-center border border-success/20">
            <PackageCheck className="w-10 h-10 text-success" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-surface-lowest rounded-full p-1.5">
            <div className="bg-success text-white rounded-full p-1.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-on-surface mb-4 tracking-tight">Requirement Routed!</h2>
        <p className="text-on-surface/60 mb-10 leading-relaxed text-lg">
          Your ticket has been generated and routed to <strong className="text-on-surface">{store?.name || 'the selected Kendra'}</strong>. Please check
          your WhatsApp to finalize fulfillment and delivery details.
        </p>

        {/* Ticket Details */}
        <div className="bg-surface-low/50 rounded-2xl p-6 md:p-8 mb-10 text-left space-y-4 border border-outline-variant/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-wrap justify-between items-center gap-4 relative z-10">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40 mb-1">Secure Ticket ID</div>
              <div className="font-display text-xl font-bold text-on-surface">{order.ticketId}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40 mb-1">Status</div>
              <div className="inline-flex items-center gap-1.5 bg-success-soft text-success text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {order.status}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-6 border-t border-outline-variant/50 relative z-10">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40 mb-1">Fulfillment Channel</div>
              <div className="font-semibold text-sm text-on-surface">Direct Pharmacist WhatsApp</div>
            </div>
            <button
              onClick={handleResendWhatsApp}
              className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 hover:border-[#25D366]/40 transition-all font-bold text-[11px] px-4 py-2.5 rounded-lg uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Re-Send Ticket
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/wellness')}
            className="btn-primary py-4 px-8 w-full text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            Track Order in My Health <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/discovery')}
            className="btn-ghost py-3 px-8 w-full text-[11px] uppercase tracking-widest font-bold"
          >
            Back to Search
          </button>
        </div>
      </div>
    </div>
  );
}
