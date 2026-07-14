import type { CollectionName } from '@/db/firestore'
import type { Contribution, Goal, GoalPayment, Holding, Loan, SavingsPlan } from '@/db/db'

function monthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function today(day: number) {
  return `${monthKey()}-${String(day).padStart(2, '0')}`
}

const holdings: Holding[] = [
  { id: 'demo-index', name: 'Nifty 50 Index Fund', assetClass: 'mf', platform: 'Groww', currentValuePaise: 8420000, notes: '', updatedAt: 0 },
  { id: 'demo-arbitrage', name: 'Arbitrage Fund', assetClass: 'arbitrage', platform: 'Zerodha', currentValuePaise: 2360000, notes: 'Education fund', updatedAt: 0 },
  { id: 'demo-gold', name: 'Gold ETF', assetClass: 'gold', platform: 'Zerodha', currentValuePaise: 1740000, notes: '', updatedAt: 0 },
  { id: 'demo-cash', name: 'Emergency Savings', assetClass: 'emergency', platform: 'Bank', currentValuePaise: 4200000, notes: '', updatedAt: 0 },
]

const goals: Goal[] = [
  { id: 'demo-college', name: 'College Fees', category: 'Education', targetAmountPaise: 43060000, currentAmountPaise: 0, targetDate: null, priority: 0, monthlyAllocationPaise: 300000, linkedHoldingIds: ['demo-arbitrage'], trackingType: 'both', notes: '', updatedAt: 0 },
  { id: 'demo-home', name: 'Home Down Payment', category: 'Home', targetAmountPaise: 250000000, currentAmountPaise: 0, targetDate: '2030-12-31', priority: 1, monthlyAllocationPaise: 600000, linkedHoldingIds: ['demo-index'], trackingType: 'savings', notes: '', updatedAt: 0 },
  { id: 'demo-trip', name: 'Family Holiday', category: 'Travel', targetAmountPaise: 30000000, currentAmountPaise: 1350000, targetDate: '2027-05-01', priority: 2, monthlyAllocationPaise: 120000, trackingType: 'savings', notes: '', updatedAt: 0 },
]

const loans: Loan[] = [
  { id: 'demo-loan', name: 'Car Loan', lender: 'HDFC Bank', outstandingPaise: 6450000, interestRate: 8.7, emiAmountPaise: 185000, notes: '', updatedAt: 0 },
]

function plans(): SavingsPlan[] {
  const id = monthKey()
  const plan: SavingsPlan = {
    id,
    monthKey: id,
    monthlyTotalPaise: 600000,
    splits: [
      { assetClass: 'mf', targetPct: 50, targetAmountPaise: 300000, annualTargetPaise: 3600000 },
      { assetClass: 'emergency', targetPct: 30, targetAmountPaise: 180000, annualTargetPaise: 1800000 },
      { assetClass: 'gold', targetPct: 20, targetAmountPaise: 120000, annualTargetPaise: 1200000 },
    ],
    updatedAt: 0,
  }
  return [plan, { ...plan, id: 'main' }]
}

function contributions(): Contribution[] {
  return [
    { id: 'demo-contribution-1', date: today(3), amountPaise: 300000, goalId: 'demo-home', assetClass: 'mf', note: 'Index fund SIP' },
    { id: 'demo-contribution-2', date: today(7), amountPaise: 180000, goalId: null, assetClass: 'emergency', note: 'Emergency fund' },
    { id: 'demo-contribution-3', date: today(12), amountPaise: 120000, goalId: 'demo-trip', assetClass: 'gold', note: 'Gold allocation' },
  ]
}

const goalPayments: GoalPayment[] = [
  { id: 'demo-payment-1', goalId: 'demo-college', date: '2026-01-12', amountPaise: 2500000, note: 'Admission fees' },
  { id: 'demo-payment-2', goalId: 'demo-college', date: '2026-02-05', amountPaise: 18060000, note: 'First year fees' },
]

export function demoCollection(name: CollectionName): unknown[] {
  switch (name) {
    case 'holdings': return holdings
    case 'goals': return goals
    case 'loans': return loans
    case 'savingsPlan': return plans()
    case 'contributions': return contributions()
    case 'goalPayments': return goalPayments
  }
}

export function demoDoc(name: CollectionName, id: string): unknown | undefined {
  return demoCollection(name).find((item) => (item as { id: string }).id === id)
}
