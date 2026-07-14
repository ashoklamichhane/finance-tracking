import type { AssetClass, Contribution, Goal, GoalPayment, Holding, Loan, SavingsPlan } from '@/db/db'

export function netWorthPaise(holdings: Holding[], loans: Loan[]): number {
  const assets = holdings.reduce((sum, h) => sum + h.currentValuePaise, 0)
  const debts = loans.reduce((sum, l) => sum + l.outstandingPaise, 0)
  return assets - debts
}

export function totalPortfolioPaise(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.currentValuePaise, 0)
}

export function totalOutstandingLoansPaise(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + l.outstandingPaise, 0)
}

export function totalEmiPaise(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + l.emiAmountPaise, 0)
}

export interface AllocationSlice {
  assetClass: AssetClass
  valuePaise: number
  pct: number
}

export function allocationByAssetClass(holdings: Holding[]): AllocationSlice[] {
  const total = totalPortfolioPaise(holdings)
  const byClass = new Map<AssetClass, number>()
  for (const h of holdings) {
    byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + h.currentValuePaise)
  }
  return Array.from(byClass.entries())
    .map(([assetClass, valuePaise]) => ({
      assetClass,
      valuePaise,
      pct: total > 0 ? (valuePaise / total) * 100 : 0,
    }))
    .sort((a, b) => b.valuePaise - a.valuePaise)
}

export interface GoalProgress {
  goal: Goal
  progressPct: number
  remainingPaise: number
  projectedMonthsToTarget: number | null
  projectedDate: string | null
}

export function goalProgress(goal: Goal): GoalProgress {
  const remainingPaise = Math.max(0, goal.targetAmountPaise - goal.currentAmountPaise)
  const progressPct =
    goal.targetAmountPaise > 0
      ? Math.min(100, (goal.currentAmountPaise / goal.targetAmountPaise) * 100)
      : 0

  let projectedMonthsToTarget: number | null = null
  let projectedDate: string | null = null
  if (goal.monthlyAllocationPaise > 0 && remainingPaise > 0) {
    projectedMonthsToTarget = Math.ceil(remainingPaise / goal.monthlyAllocationPaise)
    const d = new Date()
    d.setMonth(d.getMonth() + projectedMonthsToTarget)
    projectedDate = d.toISOString().slice(0, 10)
  } else if (remainingPaise === 0) {
    projectedMonthsToTarget = 0
  }

  return { goal, progressPct, remainingPaise, projectedMonthsToTarget, projectedDate }
}

// A completed goal is archived once the calendar year after it was
// completed has turned over, e.g. completed any time in 2026 archives on
// or after 2027-01-01.
export function shouldArchive(completedAt: number, now = new Date()): boolean {
  return now.getFullYear() > new Date(completedAt).getFullYear()
}

export function linkedFundPaise(goal: Goal, holdings: Holding[]): number {
  if (!goal.linkedHoldingIds?.length) return goal.currentAmountPaise
  const linked = new Set(goal.linkedHoldingIds)
  return holdings.reduce((sum, holding) => sum + (linked.has(holding.id) ? holding.currentValuePaise : 0), 0)
}

export function goalPaymentsPaise(goalId: string, payments: GoalPayment[]): number {
  return payments.filter((payment) => payment.goalId === goalId).reduce((sum, payment) => sum + payment.amountPaise, 0)
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function contributionsForMonth(contributions: Contribution[], monthKey: string): Contribution[] {
  return contributions.filter((c) => c.date.startsWith(monthKey))
}

export function totalContributedPaise(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => sum + c.amountPaise, 0)
}

export interface PlannedVsActual {
  assetClass: AssetClass
  plannedPaise: number
  actualPaise: number
  diffPaise: number
}

export function plannedVsActual(
  plan: SavingsPlan | undefined,
  monthContributions: Contribution[],
): PlannedVsActual[] {
  if (!plan) return []
  return plan.splits.map((split) => {
    const actualPaise = monthContributions
      .filter((c) => c.assetClass === split.assetClass)
      .reduce((sum, c) => sum + c.amountPaise, 0)
    return {
      assetClass: split.assetClass,
      plannedPaise: split.targetAmountPaise,
      actualPaise,
      diffPaise: actualPaise - split.targetAmountPaise,
    }
  })
}
