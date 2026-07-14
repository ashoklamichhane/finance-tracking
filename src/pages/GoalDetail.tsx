import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { Contribution, Goal, GoalPayment, Holding } from '@/db/db'
import { useFirestoreCollection, patchDoc, putDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { BackButton } from '@/components/BackButton'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { ProgressBar } from '@/components/ProgressBar'
import { newId } from '@/lib/id'
import { formatCompactPaise, formatPaise, rupeesToPaise } from '@/lib/money'
import { goalPaymentsPaise, linkedFundPaise } from '@/lib/calc'

export function GoalDetail() {
  const { goalId } = useParams()
  const user = useAuthUser()
  const uid = user?.uid
  const goals = useFirestoreCollection<Goal>(uid, 'goals')
  const holdings = useFirestoreCollection<Holding>(uid, 'holdings')
  const payments = useFirestoreCollection<GoalPayment>(uid, 'goalPayments')
  const contributions = useFirestoreCollection<Contribution>(uid, 'contributions')
  const [fundOpen, setFundOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [linkedIds, setLinkedIds] = useState<string[]>([])
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentNote, setPaymentNote] = useState('')

  const goal = goals?.find((item) => item.id === goalId)
  const linkedHoldings = useMemo(
    () => (holdings ?? []).filter((holding) => goal?.linkedHoldingIds?.includes(holding.id)),
    [goal?.linkedHoldingIds, holdings],
  )

  useEffect(() => setLinkedIds(goal?.linkedHoldingIds ?? []), [goal?.linkedHoldingIds])

  if (!uid || !goals || !holdings || !payments || !contributions) return null
  if (!goal) {
    return (
      <div className="space-y-4">
        <BackButton to="/goals" />
        <p className="text-sm text-ink/50">This goal no longer exists.</p>
      </div>
    )
  }

  const paidPaise = goalPaymentsPaise(goal.id, payments)
  const remainingPaise = Math.max(0, goal.targetAmountPaise - paidPaise)
  const fundedPaise = linkedFundPaise(goal, holdings)
  const fundDifferencePaise = fundedPaise - remainingPaise
  const paymentPct = goal.targetAmountPaise > 0 ? Math.min(100, (paidPaise / goal.targetAmountPaise) * 100) : 0
  const fundPct = remainingPaise > 0 ? Math.min(100, (fundedPaise / remainingPaise) * 100) : 100
  const trackingType = goal.trackingType ?? 'savings'
  const goalPayments = payments.filter((payment) => payment.goalId === goal.id).sort((a, b) => b.date.localeCompare(a.date))
  const goalContributions = contributions
    .filter((contribution) => contribution.goalId === goal.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  async function saveFundLinks() {
    await patchDoc(uid!, 'goals', goal!.id, { linkedHoldingIds: linkedIds, updatedAt: Date.now() })
    setFundOpen(false)
  }

  async function savePayment() {
    await putDoc<GoalPayment>(uid!, 'goalPayments', {
      id: newId(),
      goalId: goal!.id,
      date: paymentDate,
      amountPaise: rupeesToPaise(paymentAmount),
      note: paymentNote,
    })
    setPaymentOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton to="/goals" />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-2xl font-semibold tracking-tight text-ink">{goal.name}</h1>
            {goal.category && <p className="text-xs text-ink/45">{goal.category}</p>}
          </div>
        </div>
        <Link to="/goals" className="text-[13px] font-semibold text-accent">Edit goal</Link>
      </div>

      <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Goal cost</div>
        <div className="mt-1.5 font-serif text-3xl font-semibold text-ink">{formatCompactPaise(goal.targetAmountPaise)}</div>
        {trackingType !== 'savings' ? <>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-ink/[0.035] p-3"><div className="text-xs text-ink/45">Amount paid</div><div className="mt-1 font-semibold text-sage">{formatCompactPaise(paidPaise)}</div></div>
            <div className="rounded-xl bg-ink/[0.035] p-3"><div className="text-xs text-ink/45">Still to pay</div><div className="mt-1 font-semibold text-ink">{formatCompactPaise(remainingPaise)}</div></div>
          </div>
          <ProgressBar pct={paymentPct} tone="sage" className="mt-3 h-2" />
        </> : <p className="mt-2 text-sm text-ink/45">Savings-only goal · linked funds are used for progress.</p>}
      </div>

      <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Linked fund</span><button onClick={() => setFundOpen(true)} className="text-[13px] font-semibold text-accent">Manage funds</button></div>
        <div className="mt-1.5 font-serif text-3xl font-semibold text-ink">{formatCompactPaise(fundedPaise)}</div>
        <div className={`mt-1 text-sm ${fundDifferencePaise >= 0 ? 'text-sage' : 'text-accent-strong'}`}>
          {fundDifferencePaise >= 0 ? `${formatCompactPaise(fundDifferencePaise)} surplus` : `${formatCompactPaise(Math.abs(fundDifferencePaise))} funding gap`}
        </div>
        <ProgressBar pct={fundPct} tone={fundDifferencePaise >= 0 ? 'sage' : 'accent'} className="mt-3 h-2" />
        {linkedHoldings.length > 0 ? <p className="mt-3 text-xs text-ink/45">{linkedHoldings.map((holding) => holding.name).join(' · ')}</p> : <p className="mt-3 text-xs text-ink/45">Choose one or more portfolio holdings to calculate this balance automatically.</p>}
      </div>

      {trackingType !== 'savings' && <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Payment history</span><button onClick={() => { setPaymentDate(new Date().toISOString().slice(0, 10)); setPaymentAmount(0); setPaymentNote(''); setPaymentOpen(true) }} className="flex items-center gap-1 text-[13px] font-semibold text-accent"><Plus size={13} /> Add payment</button></div>
        {goalPayments.length === 0 ? <p className="text-sm text-ink/40">No payments recorded yet.</p> : <div className="space-y-2.5">{goalPayments.map((payment) => <div key={payment.id} className="flex justify-between gap-3 text-[13.5px]"><span className="text-ink/50">{payment.date}{payment.note && ` · ${payment.note}`}</span><span className="shrink-0 font-semibold tabular-nums text-ink/80">{formatPaise(payment.amountPaise)}</span></div>)}</div>}
      </div>}

      {trackingType !== 'payments' && <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Savings history</span><Link to={`/savings?goalId=${goal.id}`} className="text-[13px] font-semibold text-accent">View or log savings</Link></div>
        {goalContributions.length === 0 ? <p className="text-sm text-ink/40">No savings contributions linked to this goal yet.</p> : <div className="space-y-2.5">{goalContributions.map((contribution) => <div key={contribution.id} className="flex justify-between gap-3 text-[13.5px]"><span className="text-ink/50">{contribution.date}{contribution.note && ` · ${contribution.note}`}</span><span className="shrink-0 font-semibold tabular-nums text-ink/80">{formatPaise(contribution.amountPaise)}</span></div>)}</div>}
      </div>}

      <EntityForm open={fundOpen} onOpenChange={setFundOpen} title="Linked portfolio funds" onSubmit={saveFundLinks} submitLabel="Save linked funds">
        <p className="text-sm text-ink/50">The live value of selected holdings becomes this goal’s fund balance.</p>
        <div className="space-y-2">{holdings.map((holding) => <label key={holding.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-ink/10 p-3 text-sm"><span>{holding.name}<span className="ml-1.5 text-xs text-ink/40">{formatPaise(holding.currentValuePaise)}</span></span><input type="checkbox" checked={linkedIds.includes(holding.id)} onChange={() => setLinkedIds((ids) => ids.includes(holding.id) ? ids.filter((id) => id !== holding.id) : [...ids, holding.id])} /></label>)}</div>
      </EntityForm>

      <EntityForm open={paymentOpen} onOpenChange={setPaymentOpen} title="Record payment" onSubmit={savePayment} submitLabel="Save payment" accent="sage">
        <TextInput label="Date" type="date" value={paymentDate} onChange={setPaymentDate} required />
        <MoneyInput label="Amount paid" valueRupees={paymentAmount} onChange={setPaymentAmount} required />
        <TextInput label="Note" value={paymentNote} onChange={setPaymentNote} placeholder="e.g. Semester 3" />
      </EntityForm>
    </div>
  )
}
