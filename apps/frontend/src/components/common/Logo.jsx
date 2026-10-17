// ============================================================
// Logo — JanAushadhi mark (split capsule: brand half + generic
// half, "same medicine") with the wordmark beside it.
// The same mark is public/favicon.svg and the app icons.
// ============================================================

const MARK_COLORS = {
  // tile, brand half, generic half
  color: ['#006A6A', '#9FE3D9', '#FFFFFF'],
  white: ['#FFFFFF', '#4FB3A9', '#006A6A'], // for teal / dark backgrounds
};

export function LogoMark({ size = 32, tone = 'color', className = '' }) {
  const [tile, left, right] = MARK_COLORS[tone] || MARK_COLORS.color;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill={tile} />
      <g transform="rotate(-40 32 32)">
        <path d="M21 20h11v24H21a12 12 0 0 1 0-24z" fill={left} />
        <path d="M32 20h11a12 12 0 0 1 0 24H32z" fill={right} />
        <rect x="31" y="20" width="2.2" height="24" fill={tile} />
      </g>
    </svg>
  );
}

/**
 * @param {object} props
 * @param {number} [props.size=32]   Mark size in px; the wordmark scales with it
 * @param {'color'|'white'} [props.tone='color'] Wordmark colour for light or dark backgrounds
 */
export default function Logo({ size = 32, tone = 'color', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} tone={tone} />
      <span
        className={`font-display font-extrabold tracking-tight leading-none ${tone === 'white' ? 'text-white' : 'text-primary'}`}
        style={{ fontSize: Math.round(size * 0.66) }}
      >
        JanAushadhi
      </span>
    </span>
  );
}
