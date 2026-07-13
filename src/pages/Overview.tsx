import { Link } from 'react-router-dom'
import { useAuthUser } from '@/lib/AuthContext'
import { useFirestoreCollection, useFirestoreDoc } from '@/db/firestore'
import type { Holding, Goal, Loan, Contribution, SavingsPlan } from '@/db/db'
import { StatTile } from '@/components/StatTile'
import { ProgressBar } from '@/components/ProgressBar'
import { AllocationBar } from '@/components/AllocationBar'
import { formatCompactPaise } from '@/lib/money'
import {
  netWorthPaise,
  totalPortfolioPaise,
  totalOutstandingLoansPaise,
  allocationByAssetClass,
  goalProgress,
  currentMonthKey,
  contributionsForMonth,
  totalContributedPaise,
} from '@/lib/calc'

export function Overview() {
  const user = useAuthUser()
  const uid = user?.uid
  const holdings = useFirestoreCollection<Holding>(uid, 'holdings')
  const loans = useFirestoreCollection<Loan>(uid, 'loans')
  const goals = useFirestoreCollection<Goal>(uid, 'goals')
  const contributions = useFirestoreCollection<Contribution>(uid, 'contributions')
  const plan = useFirestoreDoc<SavingsPlan>(uid, 'savingsPlan', 'main')

  if (!holdings || !loans || !goals || !contributions) return null

  const netWorth = netWorthPaise(holdings, loans)
  const portfolioTotal = totalPortfolioPaise(holdings)
  const loanTotal = totalOutstandingLoansPaise(loans)
  const allocation = allocationByAssetClass(holdings)
  const monthKey = currentMonthKey()
  const monthContributions = contributionsForMonth(contributions, monthKey)
  const savedThisMonth = totalContributedPaise(monthContributions)
  const monthlyTarget = plan?.monthlyTotalPaise ?? 0
  const topGoals = [...goals]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(goalProgress)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Net worth" value={formatCompactPaise(netWorth)} />
        <StatTile label="Portfolio" value={formatCompactPaise(portfolioTotal)} />
        <StatTile label="Loans outstanding" value={formatCompactPaise(loanTotal)} tone={loanTotal > 0 ? 'negative' : 'default'} />
        <StatTile
          label="Saved this month"
          value={formatCompactPaise(savedThisMonth)}
          sublabel={monthlyTarget > 0 ? `of ${formatCompactPaise(monthlyTarget)} target` : undefined}
          tone={monthlyTarget > 0 && savedThisMonth >= monthlyTarget ? 'positive' : 'default'}
        />
      </div>

      <AllocationBar allocation={allocation} />

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Top goals</span>
          <Link to="/goals" className="text-xs font-medium text-accent hover:underline">
            View all
          </Link>
        </div>
        {topGoals.length === 0 ? (
          <p className="text-sm text-neutral-400">No goals yet — add one to start tracking progress.</p>
        ) : (
          <ul className="space-y-4">
            {topGoals.map(({ goal, progressPct, projectedDate }) => (
              <li key={goal.id}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{goal.name}</span>
                  <span className="tabular-nums text-neutral-400">
                    {formatCompactPaise(goal.currentAmountPaise)} / {formatCompactPaise(goal.targetAmountPaise)}
                  </span>
                </div>
                <ProgressBar pct={progressPct} />
                {projectedDate && (
                  <div className="mt-1 text-xs text-neutral-400">Projected: {projectedDate}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
