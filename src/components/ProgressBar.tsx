import * as Progress from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  pct: number
  className?: string
}

export function ProgressBar({ pct, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <Progress.Root
      value={clamped}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800',
        className,
      )}
    >
      <Progress.Indicator
        className="h-full bg-accent transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </Progress.Root>
  )
}
