// ============================================================
// AttestationModal — Legal prescription attestation dialog
// Extracted from Checkout.jsx
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
      className="fixed inset-0 bg-on-surface/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attestation-title"
    >
      <div
        className="bg-surface-lowest rounded-lg clinical-shadow max-w-lg w-full p-8 md:p-10 border border-outline-variant animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-amber-50 rounded-md border border-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 id="attestation-title" className="font-display text-xl font-bold text-on-surface">
              Legal Attestation Required
            </h3>
            <p className="text-sm text-on-surface/60 mt-1">Regulatory compliance step</p>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-md p-5 mb-8 ghost-border">
          <p className="text-sm text-amber-900 leading-relaxed">
            As per the <strong>Drugs and Cosmetics Act, 1940</strong>, Schedule H and H1 medicines
            can only be dispensed against a valid prescription. By proceeding, you confirm possession
            of a physical prescription for all items.
          </p>
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-4 mb-8">
          <div className="shrink-0 mt-0.5">
            <input
              type="checkbox"
              id="attest-checkbox"
              className="w-5 h-5 accent-primary cursor-pointer"
              checked={attested}
              onChange={(e) => onAttest(e.target.checked)}
            />
          </div>
          <label
            htmlFor="attest-checkbox"
            className="text-sm text-on-surface/80 leading-relaxed cursor-pointer font-medium"
          >
            I hereby attest that I possess a valid paper prescription for the medicines listed. I
            will present this to the Kendra operator via WhatsApp or upon delivery.
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary py-3.5 shadow-none rounded-md uppercase tracking-widest text-[10px] font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => attested && onConfirm()}
            disabled={!attested}
            className="flex-1 btn-primary py-3.5 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest text-[10px] font-bold"
          >
            Confirm & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
