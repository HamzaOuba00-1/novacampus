// ============================================================
// src/components/ui/NovacampusLogo.tsx
// Logo SVG Novacampus Alliance – vectoriel, adaptatif
// ============================================================

interface Props {
  size?: number
  className?: string
}

export default function NovacampusLogo({ size = 48, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Novacampus Alliance"
    >
      {/* Fond hexagonal */}
      <polygon
        points="24,2 44,13 44,35 24,46 4,35 4,13"
        fill="#3C3489"
      />
      {/* Lettre N stylisée */}
      <path
        d="M13 32V16L22 28V16M26 16V32L35 20V32"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Accent violet clair */}
      <circle cx="24" cy="24" r="2" fill="#AFA9EC" />
    </svg>
  )
}
