export type AssetClass =
  | 'emergency'
  | 'equity_in'
  | 'equity_intl'
  | 'debt'
  | 'gold'
  | 'cash'
  | 'mf'
  | 'etf'
  | 'arbitrage'

export const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'equity_in', label: 'Indian Equity' },
  { value: 'equity_intl', label: 'International Equity' },
  { value: 'debt', label: 'Debt' },
  { value: 'gold', label: 'Gold' },
  { value: 'cash', label: 'Cash' },
  { value: 'mf', label: 'Mutual Fund' },
  { value: 'etf', label: 'ETF' },
  { value: 'arbitrage', label: 'Arbitrage Fund' },
]

export interface Holding {
  id: string
  name: string
  assetClass: AssetClass
  platform: string
  currentValuePaise: number
  notes: string
  updatedAt: number
}

export interface Goal {
  id: string
  name: string
  category: string
  targetAmountPaise: number
  currentAmountPaise: number
  targetDate: string | null
  priority: number
  monthlyAllocationPaise: number
  trackingType?: 'savings' | 'payments' | 'both'
  // When linked, live holding values become the goal's fund balance.
  linkedHoldingIds?: string[]
  notes: string
  updatedAt: number
  // Set the first time progress reaches 100%; cleared if it dips back down
  // before the goal is archived.
  completedAt?: number | null
  // Set once the calendar year after completedAt turns over — goals move
  // to the Completed section and are excluded from active views.
  archivedAt?: number | null
}

export interface Loan {
  id: string
  name: string
  lender: string
  outstandingPaise: number
  interestRate: number
  emiAmountPaise: number
  notes: string
  updatedAt: number
}

export interface SavingsSplit {
  // Optional because plans saved before named funds existed have no id/name
  // on their splits — treat as uncustomized and fall back to assetClass.
  // Backfilled the next time the plan is edited and saved.
  id?: string
  name?: string
  // No longer user-facing — funds aren't categorized in the planning UI
  // anymore. Present only on funds saved before this change (or silently
  // inherited from them), and used solely to resolve old Contributions
  // that predate per-fund ids (see resolveSplitForContribution). New funds
  // have none; don't add UI that lets a user set this again.
  assetClass?: AssetClass
  // % of the plan's yearlyGoalPaise. targetAmountPaise (monthly) and
  // annualTargetPaise (annual) are both derived from this at save time —
  // there's no independently-set cap anymore.
  targetPct: number
  targetAmountPaise: number
  annualTargetPaise?: number
  // Curated subset of Holding ids shown as this fund's "linked holdings".
  // Undefined means uncustomized — falls back to matching by assetClass.
  linkedHoldingIds?: string[]
}

export interface SavingsPlan {
  id: string
  monthKey?: string
  // Primary input for the plan. monthlyTotalPaise is derived (yearlyGoalPaise / 12)
  // and kept alongside it so older display code needn't special-case its absence.
  yearlyGoalPaise?: number
  monthlyTotalPaise: number
  splits: SavingsSplit[]
  updatedAt: number
}

export interface Contribution {
  id: string
  date: string
  amountPaise: number
  goalId: string | null
  assetClass: AssetClass | null
  // References a specific SavingsSplit.id when logged against a named fund.
  // Older contributions (or ones logged with no active plan) have none —
  // resolveSplitForContribution() falls back to matching by assetClass.
  fundId?: string | null
  note: string
}

export interface GoalPayment {
  id: string
  goalId: string
  date: string
  amountPaise: number
  note: string
}
