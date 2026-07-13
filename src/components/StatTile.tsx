import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const TINTS = {
  green: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  neutral: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
} as const

interface StatTileProps {
  label: string
  value: string
  sublabel?: string
  tone?: 'default' | 'positive' | 'negative'
  icon?: LucideIcon
  tint?: keyof typeof TINTS
}

export function StatTile({ label, value, sublabel, tone = 'default', icon: Icon, tint = 'neutral' }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TINTS[tint])}>
            <Icon size={16} strokeWidth={2.25} />
          </span>
        )}
        <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      </div>
      <div
        className={cn(
          'mt-2 text-2xl font-bold',
          tone === 'positive' && 'text-green-600 dark:text-green-400',
          tone === 'negative' && 'text-red-600 dark:text-red-400',
          tone === 'default' && 'text-neutral-900 dark:text-neutral-100',
        )}
      >
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{sublabel}</div>}
    </div>
  )
}
