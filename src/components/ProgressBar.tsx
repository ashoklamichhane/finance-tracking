import * as Progress from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  pct: number
  className?: string
  tone?: 'accent' | 'sage'
}

const TONE_FILL = {
  accent: 'bg-accent',
  sage: 'bg-sage',
} as const

export function ProgressBar({ pct, className, tone = 'accent' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <Progress.Root
      value={clamped}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-ink/8', className)}
    >
      <Progress.Indicator
        className={cn('h-full transition-transform duration-300 ease-out', TONE_FILL[tone])}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </Progress.Root>
  )
}
