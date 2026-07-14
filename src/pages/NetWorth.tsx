import type { Holding, Loan } from '@/db/db'
import { useFirestoreCollection } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { BackButton } from '@/components/BackButton'
import { formatCompactPaise } from '@/lib/money'
import { netWorthPaise, totalOutstandingLoansPaise, totalPortfolioPaise } from '@/lib/calc'

export function NetWorth() {
  const user = useAuthUser()
  const uid = user?.uid
  const holdings = useFirestoreCollection<Holding>(uid, 'holdings')
  const loans = useFirestoreCollection<Loan>(uid, 'loans')
  if (!holdings || !loans) return null

  const assets = totalPortfolioPaise(holdings)
  const liabilities = totalOutstandingLoansPaise(loans)
  const netWorth = netWorthPaise(holdings, loans)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><BackButton /><h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Net Worth</h1></div>
      <div className="rounded-[24px] bg-ink p-5 text-cream shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-cream/55">Assets − liabilities</div><div className="mt-2 font-serif text-4xl font-semibold">{formatCompactPaise(netWorth)}</div></div>
      <section className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5"><div className="mb-3 flex justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Portfolio assets</span><span className="font-semibold text-sage">{formatCompactPaise(assets)}</span></div><div className="space-y-2.5">{holdings.length === 0 ? <p className="text-sm text-ink/40">No holdings yet.</p> : holdings.map((holding) => <div key={holding.id} className="flex justify-between text-[13.5px]"><span className="text-ink/65">{holding.name}</span><span className="font-semibold tabular-nums text-ink/80">{formatCompactPaise(holding.currentValuePaise)}</span></div>)}</div></section>
      <section className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5"><div className="mb-3 flex justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Loan liabilities</span><span className="font-semibold text-accent-strong">−{formatCompactPaise(liabilities)}</span></div><div className="space-y-2.5">{loans.length === 0 ? <p className="text-sm text-ink/40">No loans recorded.</p> : loans.map((loan) => <div key={loan.id} className="flex justify-between text-[13.5px]"><span className="text-ink/65">{loan.name}</span><span className="font-semibold tabular-nums text-ink/80">{formatCompactPaise(loan.outstandingPaise)}</span></div>)}</div></section>
    </div>
  )
}
