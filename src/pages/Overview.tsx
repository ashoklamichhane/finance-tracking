import { Link } from 'react-router-dom'
import { PieChart as PieChartIcon, Landmark, PiggyBank, ChevronRight } from 'lucide-react'
import { useAuthUser } from '@/lib/AuthContext'
import { useFirestoreCollection, useFirestoreDoc } from '@/db/firestore'
import type { Holding, Goal, Loan, Contribution, SavingsPlan } from '@/db/db'
import { ProgressBar } from '@/components/ProgressBar'
import { MiniAllocationBar } from '@/components/AllocationBar'
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
  const savedPct = monthlyTarget > 0 ? Math.min(100, (savedThisMonth / monthlyTarget) * 100) : 0
  const topGoals = [...goals]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(goalProgress)

  const initial = (user?.displayName ?? user?.email ?? '?').charAt(0).toUpperCase()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-0.5 pb-1">
        <span className="font-serif text-[28px] font-semibold tracking-tight text-ink">Finance</span>
        <Link
          to="/settings"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-strong text-sm font-bold text-cream shadow-[0_2px_6px_rgba(191,77,67,0.3)]"
        >
          {user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : initial}
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2b2a27] to-[#191917] px-6 py-8 text-cream shadow-[0_14px_30px_rgba(25,25,25,0.22)]">
        <div className="pointer-events-none absolute -right-12 -top-[70px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(217,119,87,0.35),transparent_70%)]" />
        <div className="relative text-xs font-semibold uppercase tracking-wide text-cream/55">Net Worth</div>
        <div className="relative mt-3 font-serif text-[52px] font-semibold leading-none tracking-tight">
          {formatCompactPaise(netWorth)}
        </div>
        <div className="relative mt-2 text-[13px] text-cream/45">
          {holdings.length} holdings &middot; {loans.length} loans
        </div>
      </div>

      <Link to="/portfolio" className="block rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-blue/16">
              <PieChartIcon size={18} className="text-blue" strokeWidth={2.25} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-ink/50">Portfolio</div>
              <div className="text-[19px] font-bold tracking-tight text-ink">{formatCompactPaise(portfolioTotal)}</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-ink/30" />
        </div>
        <MiniAllocationBar allocation={allocation} />
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/loans" className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-strong/12">
              <Landmark size={17} className="text-accent-strong" strokeWidth={2.25} />
            </span>
            <ChevronRight size={14} className="text-ink/30" />
          </div>
          <div className="mt-3 text-[13px] font-semibold text-ink/50">Loans</div>
          <div className="mt-0.5 text-lg font-bold tracking-tight text-accent-strong">{formatCompactPaise(loanTotal)}</div>
        </Link>
        <Link to="/savings" className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/15">
              <PiggyBank size={17} className="text-sage" strokeWidth={2.25} />
            </span>
            <ChevronRight size={14} className="text-ink/30" />
          </div>
          <div className="mt-3 text-[13px] font-semibold text-ink/50">Saved this month</div>
          <div className="mt-0.5 text-lg font-bold tracking-tight text-ink">{formatCompactPaise(savedThisMonth)}</div>
          <ProgressBar pct={savedPct} tone="sage" className="mt-1.5 h-[5px]" />
        </Link>
      </div>

      <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Top Goals</span>
          <Link to="/goals" className="text-[13px] font-semibold text-accent">
            View All
          </Link>
        </div>
        {topGoals.length === 0 ? (
          <p className="text-sm text-ink/40">No goals yet — add one to start tracking progress.</p>
        ) : (
          <ul className="space-y-3.5">
            {topGoals.map(({ goal, progressPct }) => (
              <li key={goal.id}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-ink">{goal.name}</span>
                  <span className="tabular-nums text-[12.5px] text-ink/40">
                    {formatCompactPaise(goal.currentAmountPaise)} / {formatCompactPaise(goal.targetAmountPaise)}
                  </span>
                </div>
                <ProgressBar pct={progressPct} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
