import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: string
  sublabel?: string
  tone?: 'default' | 'positive' | 'negative'
}

export function StatTile({ label, value, sublabel, tone = 'default' }: StatTileProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      <div
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
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
