// ============================================================
// AttestationModal — Legal prescription attestation dialog
// Redesigned with glassmorphism and modern UI
// ============================================================

import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * @param {object}  props
 * @param {boolean} props.isOpen          - Whether the modal is visible
 * @param {boolean} props.attested        - Current attestation state
 * @param {function} props.onAttest       - Toggle attestation callback
 * @param {function} props.onClose        - Close modal callback
 * @param {function} props.onConfirm      - Confirm and close callback
 */
export default function AttestationModal({ isOpen, attested, onAttest, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-on-surface/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attestation-title"
    >
      <div
        className="bg-surface-lowest rounded-2xl clinical-shadow-lg max-w-lg w-full p-8 md:p-10 border border-white/20 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="w-14 h-14 bg-warning-soft rounded-2xl border border-warning/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7 text-warning" />
          </div>
          <div className="mt-1">
            <h3 id="attestation-title" className="font-display text-2xl font-bold text-on-surface">
              Legal Attestation Required
            </h3>
            <p className="text-sm font-medium text-on-surface/50 mt-1 uppercase tracking-wider">Regulatory Compliance Step</p>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="bg-warning-soft/50 border border-warning/20 rounded-xl p-5 mb-8">
          <p className="text-sm text-warning/90 leading-relaxed font-medium">
            As per the <strong className="text-warning">Drugs and Cosmetics Act, 1940</strong>, Schedule H and H1 medicines
            can only be dispensed against a valid prescription. By proceeding, you confirm possession
            of a physical prescription for all items.
          </p>
        </div>

        {/* Checkbox */}
        <div
          className={`flex items-start gap-4 mb-8 p-5 rounded-xl cursor-pointer transition-colors border ${attested ? 'bg-primary-light/50 border-primary/20' : 'bg-surface-low border-transparent hover:bg-surface-low/80'}`}
          onClick={() => onAttest(!attested)}
        >
          <div className="shrink-0 mt-0.5">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${attested ? 'bg-primary text-white' : 'bg-white border-2 border-outline-variant'}`}>
              {attested && <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>
          <p className={`text-sm leading-relaxed font-medium transition-colors ${attested ? 'text-primary' : 'text-on-surface/70'}`}>
            I hereby attest that I possess a valid paper prescription for the medicines listed. I
            will present this to the Kendra operator via WhatsApp or upon delivery.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 btn-ghost py-4 rounded-xl uppercase tracking-widest text-[11px] font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => attested && onConfirm()}
            disabled={!attested}
            className="flex-1 btn-primary py-4 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest text-[11px] font-bold shadow-lg shadow-primary/20"
          >
            Confirm &amp; Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
