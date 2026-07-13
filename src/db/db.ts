import Dexie, { type EntityTable } from 'dexie'

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
}

export interface SavingsPlan {
  id: string
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

export interface Meta {
  id: string
  lastSyncedAt: number | null
  snapshotVersion: number
  driveFileId: string | null
  encSalt: string | null
}

const db = new Dexie('savings-app') as Dexie & {
  holdings: EntityTable<Holding, 'id'>
  goals: EntityTable<Goal, 'id'>
  loans: EntityTable<Loan, 'id'>
  savingsPlan: EntityTable<SavingsPlan, 'id'>
  contributions: EntityTable<Contribution, 'id'>
  meta: EntityTable<Meta, 'id'>
}

db.version(1).stores({
  holdings: 'id, assetClass, platform, updatedAt',
  goals: 'id, category, targetDate, priority, updatedAt',
  loans: 'id, updatedAt',
  savingsPlan: 'id, updatedAt',
  contributions: 'id, date, goalId, assetClass',
  meta: 'id',
})

export { db }
