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
  assetClass: AssetClass
  targetPct: number
  targetAmountPaise: number
  // Optional calendar-year cap. Once contributions reach it, the app tells
  // the user that no further contribution is required for that fund.
  annualTargetPaise?: number
}

export interface SavingsPlan {
  id: string
  monthKey?: string
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
  note: string
}

export interface GoalPayment {
  id: string
  goalId: string
  date: string
  amountPaise: number
  note: string
}
