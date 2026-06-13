/**
 * SVG icon set for the 19 standard TCM herb categories.
 * Each icon picks a metaphor that maps to the category's clinical action.
 */

interface IconProps { size?: number; className?: string; }

const ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  "Qi Tonifying": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <circle cx={12} cy={12} r={9} fill="#fef3c7" stroke="#d97706" strokeWidth={1.5} />
      <text x={12} y={16} textAnchor="middle" fontSize="10" fontWeight={700} fill="#92400e">氣</text>
    </svg>
  ),
  "Blood Tonifying": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M12 3 C 6 9, 6 14, 12 21 C 18 14, 18 9, 12 3 Z" fill="#fecaca" stroke="#dc2626" strokeWidth={1.5} />
    </svg>
  ),
  "Yin Tonifying": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <circle cx={12} cy={12} r={9} fill="#1e1b4b" />
      <path d="M12 3 A 9 9 0 0 1 12 21 A 4.5 4.5 0 0 1 12 12 A 4.5 4.5 0 0 0 12 3 Z" fill="#fff" />
      <circle cx={12} cy={7.5} r={1.2} fill="#1e1b4b" />
    </svg>
  ),
  "Yang Tonifying": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <circle cx={12} cy={12} r={9} fill="#fbbf24" />
      <path d="M12 3 A 9 9 0 0 0 12 21 A 4.5 4.5 0 0 0 12 12 A 4.5 4.5 0 0 1 12 3 Z" fill="#fff" />
      <circle cx={12} cy={16.5} r={1.2} fill="#fbbf24" />
    </svg>
  ),
  "Heat Clearing": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M12 3 L14 9 L20 10 L15 14 L17 21 L12 17 L7 21 L9 14 L4 10 L10 9 Z" fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} />
      <circle cx={12} cy={13} r={2} fill="#3b82f6" />
    </svg>
  ),
  "Exterior Releasing": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M3 7 Q 8 4, 12 7 T 21 7" stroke="#06b6d4" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M3 12 Q 8 9, 12 12 T 21 12" stroke="#06b6d4" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M3 17 Q 8 14, 12 17 T 21 17" stroke="#06b6d4" strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  ),
  "Interior Warming": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M12 3 C 9 8, 6 11, 6 15 a 6 6 0 1 0 12 0 c 0 -4 -3 -7 -6 -12 Z" fill="#fed7aa" stroke="#ea580c" strokeWidth={1.5} />
      <path d="M12 12 C 11 14, 10 15, 10 16.5 a 2 2 0 1 0 4 0 c 0 -1.5 -1 -2.5 -2 -4.5 Z" fill="#dc2626" />
    </svg>
  ),
  "Phlegm Resolving": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M5 14 a 4 4 0 0 1 4 -4 a 5 5 0 0 1 9 1 a 3 3 0 0 1 -1 6 H 7 a 4 4 0 0 1 -2 -3 Z" fill="#e0e7ff" stroke="#6366f1" strokeWidth={1.5} />
    </svg>
  ),
  "Blood Activating": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <circle cx={12} cy={12} r={9} fill="#fee2e2" stroke="#b91c1c" strokeWidth={1.5} />
      <path d="M7 12 Q 10 8, 12 12 T 17 12" stroke="#b91c1c" strokeWidth={2} fill="none" />
    </svg>
  ),
  "Wind-Dampness Expelling": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M3 12 Q 8 9, 13 12 T 21 12" stroke="#16a34a" strokeWidth={2} fill="none" strokeLinecap="round" />
      <circle cx={6} cy={17} r={1.5} fill="#0ea5e9" />
      <circle cx={11} cy={18} r={1.5} fill="#0ea5e9" />
      <circle cx={16} cy={17} r={1.5} fill="#0ea5e9" />
    </svg>
  ),
  "Dampness Draining": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M12 3 C 8 8, 6 11, 6 14 a 6 6 0 1 0 12 0 c 0 -3 -2 -6 -6 -11 Z" fill="#dbeafe" stroke="#0284c7" strokeWidth={1.5} />
    </svg>
  ),
  "Wind Extinguishing": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M4 8 L20 8 M4 12 L18 12 M4 16 L16 16" stroke="#94a3b8" strokeWidth={2} fill="none" strokeLinecap="round" />
      <circle cx={5} cy={8} r={1.5} fill="#0f172a" />
      <circle cx={5} cy={12} r={1.5} fill="#0f172a" />
      <circle cx={5} cy={16} r={1.5} fill="#0f172a" />
    </svg>
  ),
  "Spirit Calming": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <circle cx={9} cy={10} r={4.5} fill="#f3e8ff" stroke="#9333ea" strokeWidth={1.5} />
      <circle cx={15} cy={14} r={3} fill="#fff" stroke="#9333ea" strokeWidth={1.5} />
    </svg>
  ),
  "Astringent": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <circle cx={12} cy={12} r={9} fill="none" stroke="#0f766e" strokeWidth={1.5} />
      <circle cx={12} cy={12} r={6} fill="none" stroke="#0f766e" strokeWidth={1.5} />
      <circle cx={12} cy={12} r={3} fill="#0f766e" />
    </svg>
  ),
  "Aromatic Reviving": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M12 3 a 9 9 0 0 1 0 18 a 9 9 0 0 1 0 -18 Z" fill="#fef9c3" stroke="#ca8a04" strokeWidth={1.5} />
      <path d="M12 7 L12 17 M7 12 L17 12 M9 9 L15 15 M15 9 L9 15" stroke="#ca8a04" strokeWidth={1.5} />
    </svg>
  ),
  "Aromatic Dampness Dissolving": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M3 18 Q 8 15, 12 18 T 21 18" stroke="#f59e0b" strokeWidth={2} fill="none" strokeLinecap="round" />
      <circle cx={8} cy={9} r={2} fill="#f59e0b" />
      <circle cx={12} cy={6} r={2} fill="#f59e0b" />
      <circle cx={16} cy={9} r={2} fill="#f59e0b" />
    </svg>
  ),
  "Qi Regulating": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <circle cx={12} cy={12} r={8} fill="none" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="3 2" />
      <path d="M12 6 L14 12 L12 18 L10 12 Z" fill="#7c3aed" />
    </svg>
  ),
  "Purgatives": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M12 4 L12 18 M8 14 L12 18 L16 14" stroke="#7e22ce" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "Food Stagnation Resolving": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <ellipse cx={12} cy={14} rx={7} ry={5} fill="#fef3c7" stroke="#d97706" strokeWidth={1.5} />
      <path d="M9 10 L9 6 M12 9 L12 5 M15 10 L15 6" stroke="#16a34a" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  ),
  "Patent Medicine": ({ size = 24, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <rect x={4} y={6} width={16} height={12} rx={2} fill="#dbeafe" stroke="#1d4ed8" strokeWidth={1.5} />
      <path d="M9 12 L15 12 M12 9 L12 15" stroke="#1d4ed8" strokeWidth={2} strokeLinecap="round" />
    </svg>
  ),
};

const FALLBACK = ({ size = 24, className }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
    <circle cx={12} cy={12} r={9} fill="#f1f5f9" stroke="#64748b" strokeWidth={1.5} />
    <text x={12} y={16} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight={700}>?</text>
  </svg>
);

export function HerbCategoryIcon({ category, size = 24, className }: { category: string; size?: number; className?: string }) {
  const Icon = ICONS[category] ?? FALLBACK;
  return <Icon size={size} className={className} />;
}
