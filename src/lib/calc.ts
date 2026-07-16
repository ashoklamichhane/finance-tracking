import type { AssetClass, Contribution, Goal, GoalPayment, Holding, Loan, SavingsPlan, SavingsSplit } from '@/db/db'

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

// A saved plan applies from its own month forward until a newer plan
// supersedes it — there's no need to re-save a plan every month. Pick the
// most recent dated plan at or before monthKey; the legacy undated 'main'
// plan (id, not a real month) is the fallback of last resort.
export function resolveActivePlan(plans: SavingsPlan[], monthKey: string): SavingsPlan | undefined {
  const dated = plans
    .filter((p) => p.id !== 'main' && !!p.monthKey && p.monthKey <= monthKey)
    .sort((a, b) => b.monthKey!.localeCompare(a.monthKey!))
  if (dated.length > 0) return dated[0]
  return plans.find((p) => p.id === 'main')
}

// The most recent plan overall — the current fund structure. Used when
// logging into a month earlier than any saved plan (resolveActivePlan
// returns nothing there), so contributions still attach to real named funds
// instead of falling back to bare asset classes that can't resolve later.
export function latestPlan(plans: SavingsPlan[]): SavingsPlan | undefined {
  const dated = plans
    .filter((p) => p.id !== 'main' && !!p.monthKey)
    .sort((a, b) => b.monthKey!.localeCompare(a.monthKey!))
  if (dated.length > 0) return dated[0]
  return plans.find((p) => p.id === 'main')
}

// A stable identity for a split even on legacy plans saved before named
// funds existed (no id yet) — falls back to assetClass, which was a unique
// key back when every plan had at most one split per asset class. 'fund' is
// a last-resort fallback for the never-really-expected case of neither.
export function splitKey(split: SavingsSplit): string {
  return split.id ?? split.assetClass ?? 'fund'
}

export function splitDisplayName(split: SavingsSplit, assetClassLabel: (ac: AssetClass) => string): string {
  return split.name ?? (split.assetClass ? assetClassLabel(split.assetClass) : 'Fund')
}

// Which split a contribution counts toward. fundId is authoritative when
// present; older contributions (and any logged with no active plan) only
// have assetClass, so fall back to the first split of that asset class —
// the only case that was ever possible before funds could be named and
// multiple funds could share an asset class.
export function resolveSplitForContribution(contribution: Contribution, splits: SavingsSplit[]): SavingsSplit | undefined {
  if (contribution.fundId) {
    const byId = splits.find((s) => splitKey(s) === contribution.fundId)
    if (byId) return byId
  }
  return splits.find((s) => s.assetClass === contribution.assetClass)
}

export function totalContributedPaise(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => sum + c.amountPaise, 0)
}

// Which of the currently displayed splits a contribution counts toward,
// bridging plan-doc boundaries. A contribution's fundId only matches splits
// from the exact plan document active when it was logged — but a legacy
// 'main' plan and a later dated plan (or two dated plans from different
// months) each carry their own copy of a same-named fund under a different
// id. A contribution logged under the plan active in its own month can
// therefore fail to resolve against `displaySplits` (the plan active for
// whatever month/year is currently being viewed) even though it's plainly
// the same fund. Falls back to matching by display name against the plan
// that actually was active for the contribution's own month.
export function resolveDisplaySplit(
  contribution: Contribution,
  plans: SavingsPlan[],
  displaySplits: SavingsSplit[],
  assetClassLabel: (ac: AssetClass) => string,
): SavingsSplit | undefined {
  const direct = resolveSplitForContribution(contribution, displaySplits)
  if (direct) return direct
  const historicalPlan = resolveActivePlan(plans, contribution.date.slice(0, 7))
  const historicalSplit = historicalPlan ? resolveSplitForContribution(contribution, historicalPlan.splits) : undefined
  if (!historicalSplit) return undefined
  const name = splitDisplayName(historicalSplit, assetClassLabel)
  return displaySplits.find((s) => splitDisplayName(s, assetClassLabel) === name)
}

// The effective calendar-year cap for a fund. annualTargetPaise is
// authoritative when a positive value was stored, but legacy plans (and
// any saved before an annual cap was recorded per fund) only carry a
// monthly targetAmountPaise — so fall back to 12× that. Mirrors the
// plan-level yearlyGoalPaise ?? monthlyTotalPaise * 12 fallback. Returns 0
// only when the fund has no target at all, which reads as "no cap set".
export function annualCapPaise(split: SavingsSplit): number {
  if (split.annualTargetPaise && split.annualTargetPaise > 0) return split.annualTargetPaise
  return split.targetAmountPaise > 0 ? split.targetAmountPaise * 12 : 0
}

