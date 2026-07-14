import { useState } from 'react'
import { ASSET_CLASSES, type AssetClass } from '@/db/db'
import type { AllocationSlice } from '@/lib/calc'
import { formatCompactPaise } from '@/lib/money'

// Fixed categorical order — validated for CVD-safe adjacency (dataviz skill palette.md).
// Never cycled/reassigned by rank; a slice keeps its color even if others are filtered.
const SERIES_ORDER: AssetClass[] = [
  'equity_in',
  'mf',
  'debt',
  'gold',
  'equity_intl',
  'emergency',
  'etf',
  'arbitrage',
]
const OTHER_COLOR_LIGHT = '#898781'
const OTHER_COLOR_DARK = '#898781'

const COLORS_LIGHT: Record<string, string> = {
  equity_in: '#2a78d6',
  mf: '#1baf7a',
  debt: '#eda100',
  gold: '#008300',
  equity_intl: '#4a3aa7',
  emergency: '#e34948',
  etf: '#e87ba4',
  arbitrage: '#eb6834',
  other: OTHER_COLOR_LIGHT,
}
const COLORS_DARK: Record<string, string> = {
  equity_in: '#3987e5',
  mf: '#199e70',
  debt: '#c98500',
  gold: '#008300',
  equity_intl: '#9085e9',
  emergency: '#e66767',
  etf: '#d55181',
  arbitrage: '#d95926',
  other: OTHER_COLOR_DARK,
}

function assetClassLabel(ac: AssetClass) {
  return ASSET_CLASSES.find((a) => a.value === ac)?.label ?? ac
}

export interface Slice {
  key: string
  label: string
  valuePaise: number
  pct: number
}

// Past 8 categorical slots the tail folds into "Other" (dataviz skill anti-pattern:
// never generate/cycle a 9th hue). Exported so any page rendering its own bar/legend
// (not just AllocationBar/MiniAllocationBar) still respects the fold and color mapping.
export function toDisplaySlices(allocation: AllocationSlice[]): Slice[] {
  const ordered = [...allocation].sort(
    (a, b) => SERIES_ORDER.indexOf(a.assetClass) - SERIES_ORDER.indexOf(b.assetClass),
  )
  const primary = ordered.slice(0, 8)
  const rest = ordered.slice(8)
  const slices: Slice[] = primary.map((a) => ({
    key: a.assetClass,
    label: assetClassLabel(a.assetClass),
    valuePaise: a.valuePaise,
    pct: a.pct,
  }))
  if (rest.length > 0) {
    slices.push({
      key: 'other',
      label: 'Other',
      valuePaise: rest.reduce((s, a) => s + a.valuePaise, 0),
      pct: rest.reduce((s, a) => s + a.pct, 0),
    })
  }
  return slices
}

// Exported so pages that hand-roll their own bar/legend (e.g. Portfolio's total
// value card) can still resolve the var(--alloc-*) categorical colors.
export const AllocationPaletteVars = (
  <style>{`
    :root {
      --alloc-equity_in: ${COLORS_LIGHT.equity_in};
      --alloc-mf: ${COLORS_LIGHT.mf};
      --alloc-debt: ${COLORS_LIGHT.debt};
      --alloc-gold: ${COLORS_LIGHT.gold};
      --alloc-equity_intl: ${COLORS_LIGHT.equity_intl};
      --alloc-emergency: ${COLORS_LIGHT.emergency};
      --alloc-etf: ${COLORS_LIGHT.etf};
      --alloc-arbitrage: ${COLORS_LIGHT.arbitrage};
      --alloc-other: ${COLORS_LIGHT.other};
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --alloc-equity_in: ${COLORS_DARK.equity_in};
        --alloc-mf: ${COLORS_DARK.mf};
        --alloc-debt: ${COLORS_DARK.debt};
        --alloc-gold: ${COLORS_DARK.gold};
        --alloc-equity_intl: ${COLORS_DARK.equity_intl};
        --alloc-emergency: ${COLORS_DARK.emergency};
        --alloc-etf: ${COLORS_DARK.etf};
        --alloc-arbitrage: ${COLORS_DARK.arbitrage};
        --alloc-other: ${COLORS_DARK.other};
      }
    }
  `}</style>
)

// Bare mode: just the colored bar (no card, header, legend, or hover tooltip) —
// used inline inside nav cards (e.g. the Home portfolio card) that supply their own chrome.
export function MiniAllocationBar({ allocation }: { allocation: AllocationSlice[] }) {
  const slices = toDisplaySlices(allocation)
  if (slices.length === 0) return null
  return (
    <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Portfolio allocation by asset class">
      {slices.map((s) => (
        <div key={s.key} className="h-full" style={{ width: `${s.pct}%`, backgroundColor: `var(--alloc-${s.key})` }} />
      ))}
      {AllocationPaletteVars}
    </div>
  )
}

export function AllocationBar({ allocation }: { allocation: AllocationSlice[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const slices = toDisplaySlices(allocation)

  if (slices.length === 0) {
    return (
      <div className="rounded-[22px] border border-ink/7 bg-surface p-4 text-sm text-ink/40">
        No holdings yet — add one to see your allocation.
      </div>
    )
  }

  return (
    <div className="rounded-[22px] border border-ink/7 bg-surface p-4 shadow-sm shadow-ink/5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
        Portfolio allocation
      </div>

      <div className="flex h-6 w-full overflow-hidden rounded-md" role="img" aria-label="Portfolio allocation by asset class">
        {slices.map((s, i) => (
          <div
            key={s.key}
            tabIndex={0}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(s.key)}
            onBlur={() => setHovered(null)}
            className="relative h-full outline-none transition-opacity"
            style={{
              width: `${s.pct}%`,
              backgroundColor: `var(--alloc-${s.key})`,
              marginLeft: i === 0 ? 0 : '2px',
              opacity: hovered && hovered !== s.key ? 0.55 : 1,
            }}
          >
            {hovered === s.key && (
              <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-surface shadow-lg">
                <span className="font-semibold tabular-nums">{formatCompactPaise(s.valuePaise)}</span>{' '}
                <span className="text-surface/70">{s.label}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: `var(--alloc-${s.key})` }}
              aria-hidden
            />
            <span className="truncate text-ink/70">{s.label}</span>
            <span className="ml-auto tabular-nums text-ink/40">{s.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>

      {AllocationPaletteVars}
    </div>
  )
}
