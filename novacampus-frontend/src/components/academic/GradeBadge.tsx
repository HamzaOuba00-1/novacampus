// ============================================================
// src/components/academic/GradeBadge.tsx
// Badge coloré pour une note /20 selon seuils de réussite
// ============================================================

import clsx from 'clsx'
import { PASSING_GRADE } from '@/types/grades'

interface Props {
  value: number
  size?: 'sm' | 'md' | 'lg'
}

export default function GradeBadge({ value, size = 'md' }: Props) {
  const isGood    = value >= PASSING_GRADE + 4   // ≥ 14
  const isPassing = value >= PASSING_GRADE       // ≥ 10
  const isFailing = value < PASSING_GRADE

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-lg px-3 py-1.5',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-bold tabular-nums',
        sizeClasses[size],
        isGood && 'bg-nc-success/15 text-nc-success',
        isPassing && !isGood && 'bg-nc-cyan/15 text-[#006d87]',
        isFailing && 'bg-red-100 text-red-600'
      )}
    >
      {value.toFixed(2)}
      <span className="text-[0.7em] opacity-60 ml-0.5">/20</span>
    </span>
  )
}
