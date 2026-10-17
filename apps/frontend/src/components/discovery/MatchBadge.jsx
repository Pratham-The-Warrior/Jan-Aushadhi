// ============================================================
// MatchBadge — how a PMBJP generic relates to the branded medicine
// Tiers come from the backend matcher (medicine_matches.tier)
// ============================================================

const TIERS = {
  EXACT_MATCH: {
    label: '✓ Exact Match',
    className: 'bg-[#e6f4ea] border-[#a8dab5] text-[#137333]',
    help: 'Same active ingredients, strength, dosage form and release.',
  },
  CLOSE_MATCH: {
    label: '≈ Same Dose, Different Form',
    className: 'bg-[#e8f0fe] border-[#aecbfa] text-[#1a56b0]',
    help: 'Same ingredients and strength, but a different form (e.g. tablet vs capsule). Usually interchangeable — confirm with your pharmacist.',
  },
  SALT_EQUIVALENT: {
    label: '⚠ Not a Direct Substitute',
    className: 'bg-[#fef7e0] border-[#f9ab00] text-[#b06000]',
    help: 'Same active ingredients, but the strength or release type differs. Ask your doctor before switching.',
  },
};

function matchInfo(tier) {
  return TIERS[tier] || null;
}

export default function MatchBadge({ tier }) {
  const info = matchInfo(tier);
  if (!info) return null;
  return (
    <div title={info.help} className={`border text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${info.className}`}>
      {info.label}
    </div>
  );
}

/** Reasons from the matcher, shown under non-exact matches. */
export function MatchNotes({ tier, notes, className = '' }) {
  const info = matchInfo(tier);
  if (!info || tier === 'EXACT_MATCH') return null;
  const color = tier === 'CLOSE_MATCH' ? 'text-[#1a56b0]' : 'text-[#b06000]';
  return (
    <div className={`text-xs font-medium leading-relaxed ${color} ${className}`}>
      <p>{info.help}</p>
      {notes?.length > 0 && (
        <ul className="mt-1 list-disc pl-4 opacity-90">
          {notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
