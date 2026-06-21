// ============================================================
// AttestationModal — Legal prescription attestation dialog
// Now includes optional prescription image upload for compliance
// ============================================================

import React, { useState, useRef } from 'react';
import { AlertTriangle, ShieldCheck, Upload, X, ImageIcon } from 'lucide-react';

/**
 * @param {object}  props
 * @param {boolean} props.isOpen          - Whether the modal is visible
 * @param {boolean} props.attested        - Current attestation state
 * @param {function} props.onAttest       - Toggle attestation callback
 * @param {function} props.onClose        - Close modal callback
 * @param {function} props.onConfirm      - Confirm and close callback
 */
export default function AttestationModal({ isOpen, attested, onAttest, onClose, onConfirm }) {
  const [prescriptionImage, setPrescriptionImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setPrescriptionImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setPrescriptionImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 bg-on-surface/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attestation-title"
    >
      <div
        className="bg-surface-lowest rounded-2xl clinical-shadow-lg max-w-lg w-full p-8 md:p-10 border border-white/20 animate-scaleIn max-h-[90vh] overflow-y-auto"
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
        <div className="bg-warning-soft/50 border border-warning/20 rounded-xl p-5 mb-6">
          <p className="text-sm text-warning/90 leading-relaxed font-medium">
            As per the <strong className="text-warning">Drugs and Cosmetics Act, 1940</strong>, Schedule H and H1 medicines
            can only be dispensed against a valid prescription. By proceeding, you confirm possession
            of a physical prescription for all items.
          </p>
        </div>

        {/* Prescription Image Upload */}
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40 mb-3 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" /> Attach Prescription (Optional)
          </div>

          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-outline-variant">
              <img
                src={imagePreview}
                alt="Prescription preview"
                className="w-full max-h-48 object-cover"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 w-7 h-7 bg-on-surface/70 text-white rounded-full flex items-center justify-center hover:bg-on-surface transition-colors"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                <p className="text-white text-[11px] font-semibold truncate">{prescriptionImage?.name}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="w-10 h-10 bg-surface-low rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Upload className="w-5 h-5 text-on-surface/40 group-hover:text-primary transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-on-surface/60 group-hover:text-on-surface transition-colors">
                  Tap to upload prescription photo
                </p>
                <p className="text-[10px] text-on-surface/40 mt-0.5">JPG, PNG up to 10MB</p>
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload prescription image"
          />
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
