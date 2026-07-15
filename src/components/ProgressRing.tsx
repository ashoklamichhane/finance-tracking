import { cn } from '@/lib/utils'

interface ProgressRingProps {
  pct: number
  strokeClassName: string
  fillClassName: string
  trackClassName?: string
  mode?: 'done' | 'alert'
  size?: number
  className?: string
}

const R = 16
const C = 2 * Math.PI * R

export function ProgressRing({
  pct,
  strokeClassName,
  fillClassName,
  trackClassName = 'stroke-ink/8',
  mode,
  size = 40,
  className,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, pct))
  const dash = (clamped / 100) * C

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={cn('shrink-0', className)}>
      <circle cx="20" cy="20" r={R} fill="none" strokeWidth="4" className={trackClassName} />
      {mode !== 'alert' && (
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 20 20)"
          className={strokeClassName}
        />
      )}
      {mode === 'done' ? (
        <path
          d="M15 20.5l3.4 3.4L26 16"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-sage"
        />
      ) : mode === 'alert' ? (
        <text x="20" y="24.5" textAnchor="middle" fontSize="15" fontWeight="700" className="fill-accent-strong">
          !
        </text>
      ) : (
        <text
          x="20"
          y="24"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="700"
          className={clamped > 0 ? fillClassName : 'fill-ink/40'}
        >
          {Math.round(clamped)}%
        </text>
      )}
    </svg>
  )
}
