import { useState } from 'react'
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, ChevronDown, Download, Info, Check } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ASSET_CLASSES, type AssetClass, type SavingsSplit, type SavingsPlan, type Contribution, type Goal, type Holding } from '@/db/db'
import { useFirestoreCollection, putDoc, patchDoc, removeDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { Select } from '@/components/Select'
import { ProgressBar } from '@/components/ProgressBar'
import { ProgressRing } from '@/components/ProgressRing'
import { BackButton } from '@/components/BackButton'
import { newId } from '@/lib/id'
import { cn } from '@/lib/utils'
import { rupeesToPaise, paiseToRupees, formatPaise, formatCompactPaise } from '@/lib/money'
import {
  currentMonthKey,
  contributionsForMonth,
  totalContributedPaise,
  resolveActivePlan,
  latestPlan,
  resolveSplitForContribution,
  splitKey,
  splitDisplayName,
  annualCapPaise,
} from '@/lib/calc'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Tone = 'accent' | 'blue' | 'sage' | 'gold' | 'accent-strong'

const TONE_STROKE: Record<Tone, string> = {
  accent: 'stroke-accent',
  blue: 'stroke-blue',
  sage: 'stroke-sage',
  gold: 'stroke-gold',
  'accent-strong': 'stroke-accent-strong',
}
const TONE_FILL: Record<Tone, string> = {
  accent: 'fill-accent',
  blue: 'fill-blue',
  sage: 'fill-sage',
  gold: 'fill-gold',
  'accent-strong': 'fill-accent-strong',
}
const TONE_BG: Record<Tone, string> = {
  accent: 'bg-accent',
  blue: 'bg-blue',
  sage: 'bg-sage',
  gold: 'bg-gold',
  'accent-strong': 'bg-accent-strong',
}

// Funds aren't categorized anymore, so color is assigned by position in the
// plan rather than by asset class — cycled so adjacent funds stay visually
// distinct regardless of how many there are.
const TONE_CYCLE: Tone[] = ['accent', 'blue', 'sage', 'gold', 'accent-strong']

function fundTonesFor(splits: SavingsSplit[]): Map<SavingsSplit, Tone> {
  const result = new Map<SavingsSplit, Tone>()
  splits.forEach((s, i) => result.set(s, TONE_CYCLE[i % TONE_CYCLE.length]))
  return result
}

interface SplitDraft {
  id: string
  name: string
  targetPct: number
}

function assetClassLabel(ac: AssetClass) {
  return ASSET_CLASSES.find((a) => a.value === ac)?.label ?? ac
}

// splitKey() alone collides when a plan has multiple id-less (legacy) splits
// sharing an assetClass — real before named funds existed, since at most one
// split per assetClass was ever possible. Disambiguate with an index suffix
// so React keys, the fund <select>, and expand/link state all stay unique
// until the plan is next saved (which assigns every split a real id).
function uniqueSplitKeys(splits: SavingsSplit[]): Map<SavingsSplit, string> {
  const seen = new Map<string, number>()
  const result = new Map<SavingsSplit, string>()
  for (const s of splits) {
    const base = splitKey(s)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    result.set(s, count === 0 ? base : `${base}#${count}`)
  }
  return result
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

// A contribution entry's descriptor, e.g. "Jul 1 · Withdrawal". Negative
// amounts read as a withdrawal when the user didn't type their own note,
// matching the design's labelling of money taken back out of a fund.
function formatEntryLabel(c: Contribution): string {
  const [, m, d] = c.date.split('-').map(Number)
  const dateLabel = `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`
  const note = c.note?.trim() || (c.amountPaise < 0 ? 'Withdrawal' : '')
  return note ? `${dateLabel} · ${note}` : dateLabel
}

export function Savings() {
  const user = useAuthUser()
  const uid = user?.uid
  const [searchParams, setSearchParams] = useSearchParams()
  const goalFilterId = searchParams.get('goalId') ?? ''
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthKey())
  const [view, setView] = useState<'month' | 'year'>('month')
  const [expandedFund, setExpandedFund] = useState<string | null>(null)
  const [hoverPaceIdx, setHoverPaceIdx] = useState<number | null>(null)
  const plans = useFirestoreCollection<SavingsPlan>(uid, 'savingsPlan')
  const contributionsRaw = useFirestoreCollection<Contribution>(uid, 'contributions')
  const goals = useFirestoreCollection<Goal>(uid, 'goals')
  const holdings = useFirestoreCollection<Holding>(uid, 'holdings')
  const selectedGoal = goals?.find((goal) => goal.id === goalFilterId)

  const [planOpen, setPlanOpen] = useState(false)
  const [yearlyGoalRupees, setYearlyGoalRupees] = useState(0)
  const [splits, setSplits] = useState<SplitDraft[]>([])

  const [contribOpen, setContribOpen] = useState(false)
  const [editingContribId, setEditingContribId] = useState<string | null>(null)
  const [contribDate, setContribDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [contribAmountRupees, setContribAmountRupees] = useState(0)
  const [contribFundId, setContribFundId] = useState('mf')
  const [contribGoalId, setContribGoalId] = useState('')
  const [contribNote, setContribNote] = useState('')

  const [linkFund, setLinkFund] = useState<string | null>(null)
  const [linkSelectedIds, setLinkSelectedIds] = useState<string[]>([])

  function openPlanEditor() {
    const existingPlan = resolveActivePlan(plans ?? [], selectedMonth)
    const keys = uniqueSplitKeys(existingPlan?.splits ?? [])
    setYearlyGoalRupees(existingPlan ? paiseToRupees(existingPlan.yearlyGoalPaise ?? existingPlan.monthlyTotalPaise * 12) : 0)
    setSplits(
      existingPlan
        ? existingPlan.splits.map((s) => ({
            id: keys.get(s)!,
            name: splitDisplayName(s, assetClassLabel),
            targetPct: s.targetPct,
          }))
        : [],
    )
    setPlanOpen(true)
  }

  function addSplitRow() {
    setSplits([...splits, { id: newId(), name: '', targetPct: 0 }])
  }

  function updateSplitRow(index: number, patch: Partial<SplitDraft>) {
    setSplits(splits.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeSplitRow(index: number) {
    setSplits(splits.filter((_, i) => i !== index))
  }

  async function handlePlanSubmit() {
    const yearlyGoalPaise = rupeesToPaise(yearlyGoalRupees)
    const monthlyTotalPaise = Math.round(yearlyGoalPaise / 12)
    const existingPlan = resolveActivePlan(plans ?? [], selectedMonth)
    const keys = uniqueSplitKeys(existingPlan?.splits ?? [])
    const finalSplits: SavingsSplit[] = splits.map((s, i) => {
      const pct = Number.isFinite(s.targetPct) ? s.targetPct : 0
      const annualAmountPaise = Math.round((yearlyGoalPaise * pct) / 100)
      const monthlyAmountPaise = Math.round(annualAmountPaise / 12)
      const original = existingPlan?.splits.find((os) => keys.get(os) === s.id)
      const base: SavingsSplit = {
        id: s.id,
        name: s.name.trim() || original?.name || `Fund ${i + 1}`,
        targetPct: pct,
        targetAmountPaise: monthlyAmountPaise,
        annualTargetPaise: annualAmountPaise,
      }
      // assetClass is legacy-only (see SavingsSplit) — never set on new funds,
      // only ever carried forward silently from a prior save so old
      // fundId-less Contributions keep resolving to this fund.
      let result = base
      if (original?.linkedHoldingIds) result = { ...result, linkedHoldingIds: original.linkedHoldingIds }
      if (original?.assetClass) result = { ...result, assetClass: original.assetClass }
      return result
    })
    await putDoc<SavingsPlan>(uid!, 'savingsPlan', {
      id: selectedMonth,
      monthKey: selectedMonth,
      yearlyGoalPaise,
      monthlyTotalPaise,
      splits: finalSplits,
      updatedAt: Date.now(),
    })
    setPlanOpen(false)
  }

  function openContribNew() {
    // Fall back to the latest plan so logging into a month that predates any
    // plan still offers real named funds, not bare asset classes.
    const existingPlan = resolveActivePlan(plans ?? [], selectedMonth) ?? latestPlan(plans ?? [])
    const keys = uniqueSplitKeys(existingPlan?.splits ?? [])
    setEditingContribId(null)
    setContribDate(new Date().toISOString().slice(0, 10))
    setContribAmountRupees(0)
    setContribFundId(existingPlan && existingPlan.splits.length > 0 ? keys.get(existingPlan.splits[0])! : 'mf')
    setContribGoalId(goalFilterId)
    setContribNote('')
    setContribOpen(true)
  }

  function openContribEdit(c: Contribution) {
    const existingPlan = resolveActivePlan(plans ?? [], selectedMonth) ?? latestPlan(plans ?? [])
    const keys = uniqueSplitKeys(existingPlan?.splits ?? [])
    const split = existingPlan ? resolveSplitForContribution(c, existingPlan.splits) : undefined
    setEditingContribId(c.id)
    setContribDate(c.date)
    setContribAmountRupees(paiseToRupees(c.amountPaise))
    // An unassigned contribution won't resolve to a split — default to the
    // first fund so the dropdown shows a valid choice the user can adjust.
    setContribFundId(
      split
        ? keys.get(split)!
        : existingPlan && existingPlan.splits.length > 0
          ? keys.get(existingPlan.splits[0])!
          : (c.assetClass ?? 'mf'),
    )
    setContribGoalId(c.goalId ?? '')
    setContribNote(c.note)
    setContribOpen(true)
  }

  async function handleContribSubmit() {
    const existingPlan = resolveActivePlan(plans ?? [], selectedMonth) ?? latestPlan(plans ?? [])
    const keys = uniqueSplitKeys(existingPlan?.splits ?? [])
    const matchedSplit = existingPlan?.splits.find((s) => keys.get(s) === contribFundId)
    const assetClass: AssetClass | null =
      matchedSplit?.assetClass ?? (ASSET_CLASSES.some((a) => a.value === contribFundId) ? (contribFundId as AssetClass) : null)
    // Reusing the existing id when editing overwrites that contribution in
    // place (putDoc is a set); a new id creates a fresh one.
    await putDoc<Contribution>(uid!, 'contributions', {
      id: editingContribId ?? newId(),
      date: contribDate,
      amountPaise: rupeesToPaise(contribAmountRupees),
      goalId: contribGoalId || null,
      assetClass,
      fundId: matchedSplit ? keys.get(matchedSplit)! : null,
      note: contribNote,
    })
    setContribOpen(false)
    setEditingContribId(null)
  }

  async function handleContribDelete(id: string) {
    await removeDoc(uid!, 'contributions', id)
  }

  if (!contributionsRaw || !goals || !holdings || !plans) return null
  const contributions = [...contributionsRaw].sort((a, b) => b.date.localeCompare(a.date))
  const visibleContributions = goalFilterId ? contributions.filter((contribution) => contribution.goalId === goalFilterId) : contributions

  const activePlan = resolveActivePlan(plans, selectedMonth)
  const fundKeys = uniqueSplitKeys(activePlan?.splits ?? [])
  const fundTones = fundTonesFor(activePlan?.splits ?? [])
  const monthContributions = contributionsForMonth(visibleContributions, selectedMonth)
  const savedThisMonth = totalContributedPaise(monthContributions)
  const monthlyTarget = activePlan?.monthlyTotalPaise ?? 0
  const savedPct = monthlyTarget > 0 ? Math.min(100, (savedThisMonth / monthlyTarget) * 100) : 0
  const yearKey = selectedMonth.slice(0, 4)
  const yearContributions = visibleContributions.filter((contribution) => contribution.date.startsWith(yearKey))
  const yearTotalActual = totalContributedPaise(yearContributions)
  const yearlyGoalPaise = activePlan ? (activePlan.yearlyGoalPaise ?? activePlan.monthlyTotalPaise * 12) : 0
  const yearPct = yearlyGoalPaise > 0 ? Math.min(100, (yearTotalActual / yearlyGoalPaise) * 100) : 0
  const allocatedPct = splits.reduce((sum, r) => sum + (Number.isFinite(r.targetPct) ? r.targetPct : 0), 0)
  const goalMonthlyTarget = selectedGoal?.monthlyAllocationPaise ?? 0
  const goalSavedPct = goalMonthlyTarget > 0 ? Math.min(100, (savedThisMonth / goalMonthlyTarget) * 100) : 0

  // Raw per-fund actuals (not clamped) so net withdrawals stay visible in
  // the split legend instead of silently reading as zero.
  const splitActualFor = (contribs: Contribution[]) =>
    new Map<SavingsSplit, number>(
      (activePlan?.splits ?? []).map((split) => [
        split,
        totalContributedPaise(contribs.filter((c) => resolveSplitForContribution(c, activePlan!.splits) === split)),
      ]),
    )
  const splitMonthActual = splitActualFor(monthContributions)
  const splitYearActual = splitActualFor(yearContributions)
  // The bar segments can only represent positive shares; a negative fund
  // gets no width but still appears in the legend with its real figure.
  const splitActual = view === 'month' ? splitMonthActual : splitYearActual
  const splitPositiveTotal = Array.from(splitActual.values()).reduce((sum, v) => sum + Math.max(0, v), 0)
  const anySplitActual = Array.from(splitActual.values()).some((v) => v !== 0)

  // Contributions in the current view that map to no current fund — e.g.
  // logged against a bare asset class before this plan's named funds
  // existed. They still count in the hero totals, so surface them here to
  // reconcile and let the user reassign or remove them.
  const unassignedContributions = activePlan
    ? (view === 'month' ? monthContributions : yearContributions).filter(
        (c) => !resolveSplitForContribution(c, activePlan.splits),
      )
    : []

  // Year-tab pace chart: cumulative contributions (all funds) vs the
  // straight "on-track" line (monthly target × months elapsed). Actual is
  // drawn only through the latest elapsed month — the current month for the
  // running year, all 12 for a past year.
  const paceLastIdx = yearKey === String(new Date().getFullYear()) ? new Date().getMonth() : 11
  const paceMonthTotals = Array.from({ length: 12 }, () => 0)
  for (const c of yearContributions) paceMonthTotals[Number(c.date.slice(5, 7)) - 1] += c.amountPaise
  const paceCum: number[] = []
  for (let i = 0, s = 0; i <= paceLastIdx; i++) {
    s += paceMonthTotals[i]
    paceCum.push(s)
  }
  const paceSaved = paceCum.length ? paceCum[paceCum.length - 1] : 0
  const paceExpected = monthlyTarget * (paceLastIdx + 1)
  const paceDelta = paceSaved - paceExpected
  const paceScaleMax = Math.max(yearlyGoalPaise, monthlyTarget * 12, paceSaved, 1)
  const PW = 320
  const PH = 116
  const pPad = 12
  const pPadB = 14
  const pPadT = 10
  const paceX = (i: number) => pPad + (i * (PW - 2 * pPad)) / 11
  const paceY = (val: number) => PH - pPadB - (val / paceScaleMax) * (PH - pPadB - pPadT)
  const paceLine = paceCum.map((v, i) => `${i ? 'L' : 'M'} ${paceX(i).toFixed(1)} ${paceY(v).toFixed(1)}`).join(' ')
  const paceArea = paceCum.length
    ? `${paceLine} L ${paceX(paceLastIdx).toFixed(1)} ${paceY(0).toFixed(1)} L ${paceX(0).toFixed(1)} ${paceY(0).toFixed(1)} Z`
    : ''
  const paceTarget = `M ${paceX(0).toFixed(1)} ${paceY(monthlyTarget).toFixed(1)} L ${paceX(11).toFixed(1)} ${paceY(monthlyTarget * 12).toFixed(1)}`

  // The plan whose funds the Log/Edit form offers. Falls back to the latest
  // plan when the viewed month predates every plan, so the dropdown always
  // lists named funds instead of bare asset classes.
  const logPlan = activePlan ?? latestPlan(plans)
  const logPlanKeys = uniqueSplitKeys(logPlan?.splits ?? [])
  const fundOptions =
    logPlan && logPlan.splits.length > 0
      ? logPlan.splits.map((s) => ({ value: logPlanKeys.get(s)!, label: splitDisplayName(s, assetClassLabel) }))
      : ASSET_CLASSES

  function fundNameForContribution(c: Contribution): string {
    if (c.fundId) {
      for (const p of plans!) {
        const keys = uniqueSplitKeys(p.splits)
        const match = p.splits.find((s) => keys.get(s) === c.fundId)
        if (match) return splitDisplayName(match, assetClassLabel)
      }
    }
    return c.assetClass ? assetClassLabel(c.assetClass) : ''
  }

  function handleExportCsv() {
    const header = ['Date', 'Fund', 'Asset class', 'Amount (INR)', 'Goal', 'Note']
    const rows = contributions.map((c) => [
      c.date,
      fundNameForContribution(c),
      c.assetClass ? assetClassLabel(c.assetClass) : '',
      paiseToRupees(c.amountPaise).toString(),
      goals!.find((g) => g.id === c.goalId)?.name ?? '',
      c.note,
    ])
    const csv = [header, ...rows].map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `savings-history-${selectedMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openLinkHoldings(split: SavingsSplit) {
    const candidateIds = holdings!.filter((h) => h.assetClass === split.assetClass).map((h) => h.id)
    setLinkSelectedIds(split.linkedHoldingIds ?? candidateIds)
    setLinkFund(fundKeys.get(split)!)
  }

  function toggleLinkHolding(id: string) {
    setLinkSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
  }

  async function saveLinkedHoldings() {
    if (!activePlan || !linkFund) return
    const newSplits = activePlan.splits.map((s) => (fundKeys.get(s) === linkFund ? { ...s, linkedHoldingIds: linkSelectedIds } : s))
    await patchDoc(uid!, 'savingsPlan', activePlan.id, { splits: newSplits, updatedAt: Date.now() })
    setLinkFund(null)
  }

  const linkSplit = activePlan?.splits.find((s) => fundKeys.get(s) === linkFund)
  const linkCandidates = linkSplit
    ? [...holdings].sort((a, b) => Number(a.assetClass !== linkSplit.assetClass) - Number(b.assetClass !== linkSplit.assetClass))
    : holdings

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Savings</h1>
        </div>
        <div className="flex items-center gap-2">
          {goalFilterId && (
            <input aria-label="Savings month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-xl border border-ink/12 bg-surface px-2 py-2 text-[13px] text-ink" />
          )}
          <button
            onClick={openPlanEditor}
            className="rounded-full bg-ink/6 px-4 py-2.5 text-[13px] font-semibold text-ink/70 hover:bg-ink/10"
          >
            Edit Plan
          </button>
        </div>
      </div>

      {goalFilterId ? (
        <>
          <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">
                  {selectedGoal ? `${selectedGoal.name} · ` : ''}Saved in {monthLabel(selectedMonth)}
                </div>
                <div className={cn('mt-1.5 font-serif text-2xl font-semibold', savedThisMonth < 0 ? 'text-accent-strong' : 'text-ink')}>
                  {formatCompactPaise(savedThisMonth)}
                </div>
              </div>
              {goalMonthlyTarget > 0 && (
                <div className="text-right">
                  <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">Target</div>
                  <div className="mt-1.5 text-base font-semibold text-ink/55">{formatCompactPaise(goalMonthlyTarget)}</div>
                </div>
              )}
            </div>
            {goalMonthlyTarget > 0 && <ProgressBar pct={goalSavedPct} tone="sage" className="mt-3 h-2" />}
          </div>

          <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{selectedGoal ? `${selectedGoal.name} savings` : 'Savings'}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setSearchParams({})} className="text-[13px] font-semibold text-ink/45">Show all savings</button>
                <button onClick={openContribNew} className="flex items-center gap-1 text-[13px] font-semibold text-sage">
                  <Plus size={12} strokeWidth={2.5} /> Log
                </button>
              </div>
            </div>
            {visibleContributions.length === 0 ? (
              <p className="py-4 text-center text-[13.5px] text-ink/35">No contributions logged yet.</p>
            ) : (
              <div className="space-y-2.5">
                {visibleContributions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-[13.5px]">
                    <span className="text-ink/50">
                      {c.date} · {fundNameForContribution(c) || '—'}
                      {c.note && ` · ${c.note}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="tabular-nums font-semibold text-ink/80">{formatPaise(c.amountPaise)}</span>
                      <button
                        onClick={() => openContribEdit(c)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-ink/6 text-ink/50 hover:bg-ink/10"
                        aria-label="Edit"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleContribDelete(c.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-strong/9 text-accent-strong hover:bg-accent-strong/15"
                        aria-label="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
            <div className="mb-3.5 flex rounded-full bg-ink/6 p-[3px]">
              <button
                type="button"
                onClick={() => setView('month')}
                className={cn(
                  'flex-1 rounded-full py-1.5 text-center text-[12.5px] font-semibold transition-colors',
                  view === 'month' ? 'bg-surface text-ink shadow-sm shadow-ink/10' : 'text-ink/50',
                )}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setView('year')}
                className={cn(
                  'flex-1 rounded-full py-1.5 text-center text-[12.5px] font-semibold transition-colors',
                  view === 'year' ? 'bg-surface text-ink shadow-sm shadow-ink/10' : 'text-ink/50',
                )}
              >
                Year
              </button>
            </div>

            {view === 'month' && (
              <div className="mb-3.5 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/6 text-ink/55 hover:bg-ink/10"
                >
                  <ChevronLeft size={14} strokeWidth={2.4} />
                </button>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm font-bold text-ink">{monthLabel(selectedMonth)}</span>
                  {selectedMonth !== currentMonthKey() && (
                    <button
                      type="button"
                      onClick={() => setSelectedMonth(currentMonthKey())}
                      className="text-[10.5px] font-semibold text-sage hover:text-sage/80"
                    >
                      Go to today
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/6 text-ink/55 hover:bg-ink/10"
                >
                  <ChevronRight size={14} strokeWidth={2.4} />
                </button>
              </div>
            )}

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">
                  {view === 'month' ? `Saved in ${MONTH_NAMES[Number(selectedMonth.slice(5, 7)) - 1]}` : `Saved in ${yearKey}`}
                </div>
                <div
                  className={cn(
                    'mt-1.5 font-serif text-2xl font-semibold',
                    (view === 'month' ? savedThisMonth : yearTotalActual) < 0 ? 'text-accent-strong' : 'text-ink',
                  )}
                >
                  {formatCompactPaise(view === 'month' ? savedThisMonth : yearTotalActual)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">Target</div>
                <div className="mt-1.5 text-base font-semibold text-ink/55">{formatCompactPaise(view === 'month' ? monthlyTarget : yearlyGoalPaise)}</div>
              </div>
            </div>
            <ProgressBar pct={view === 'month' ? savedPct : yearPct} tone="sage" className="mt-3 h-2" />
          </div>

          {view === 'year' && activePlan && yearlyGoalPaise > 0 && (
            <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Year pace</span>
                <span className="text-[11px] tabular-nums text-ink/40">{formatCompactPaise(monthlyTarget)}/mo target</span>
              </div>
              <div className="relative" onMouseLeave={() => setHoverPaceIdx(null)}>
                <svg viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" className="block h-auto w-full overflow-visible">
                  <line x1={pPad} y1={paceY(0)} x2={PW - pPad} y2={paceY(0)} className="stroke-ink/10" strokeWidth={1} />
                  {paceArea && <path d={paceArea} className="fill-sage/15" />}
                  <path d={paceTarget} fill="none" className="stroke-ink/30" strokeWidth={1.4} strokeDasharray="4 3" />
                  {hoverPaceIdx !== null && hoverPaceIdx <= paceLastIdx && (
                    <line
                      x1={paceX(hoverPaceIdx)}
                      y1={pPadT}
                      x2={paceX(hoverPaceIdx)}
                      y2={paceY(0)}
                      className="stroke-ink/15"
                      strokeWidth={1}
                    />
                  )}
                  <path d={paceLine} fill="none" className="stroke-sage" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  {paceCum.map((v, i) => (
                    <circle
                      key={i}
                      cx={paceX(i)}
                      cy={paceY(v)}
                      r={i === hoverPaceIdx ? 4.2 : i === paceLastIdx ? 3.4 : 2.2}
                      className={cn('fill-sage', (i === paceLastIdx || i === hoverPaceIdx) && 'stroke-surface')}
                      strokeWidth={i === paceLastIdx || i === hoverPaceIdx ? 1.5 : 0}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Open ${MONTH_NAMES[i]} ${yearKey}`}
                      onMouseEnter={() => i <= paceLastIdx && setHoverPaceIdx(i)}
                      onFocus={() => i <= paceLastIdx && setHoverPaceIdx(i)}
                      onBlur={() => setHoverPaceIdx(null)}
                      onClick={() => {
                        setSelectedMonth(`${yearKey}-${String(i + 1).padStart(2, '0')}`)
                        setView('month')
                      }}
                      className="flex-1"
                    />
                  ))}
                </div>
                {hoverPaceIdx !== null && hoverPaceIdx <= paceLastIdx && (
                  <div
                    className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 whitespace-nowrap rounded-lg border border-ink/12 bg-surface px-2.5 py-1.5 text-center shadow-md shadow-ink/15"
                    style={{
                      left: `${(paceX(hoverPaceIdx) / PW) * 100}%`,
                      top: `${(paceY(paceCum[hoverPaceIdx]) / PH) * 100}%`,
                      marginTop: '-10px',
                    }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                      {MONTH_NAMES[hoverPaceIdx].slice(0, 3)} {yearKey}
                    </span>
                    <span className="text-[12.5px] font-bold tabular-nums text-ink">{formatCompactPaise(paceCum[hoverPaceIdx])}</span>
                    <span className={cn('text-[10px] font-semibold tabular-nums', paceCum[hoverPaceIdx] >= monthlyTarget * (hoverPaceIdx + 1) ? 'text-sage' : 'text-accent-strong')}>
                      {paceCum[hoverPaceIdx] >= monthlyTarget * (hoverPaceIdx + 1)
                        ? `+${formatCompactPaise(paceCum[hoverPaceIdx] - monthlyTarget * (hoverPaceIdx + 1))}`
                        : `-${formatCompactPaise(monthlyTarget * (hoverPaceIdx + 1) - paceCum[hoverPaceIdx])}`}{' '}
                      vs pace
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-1.5 flex">
                {MONTH_NAMES.map((m, i) => (
                  <span
                    key={m}
                    className={cn('flex-1 text-center text-[9px] leading-none', i === paceLastIdx ? 'font-bold text-ink/60' : 'text-ink/35')}
                  >
                    {m.slice(0, 1)}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-ink/55">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-sage" />
                  Saved so far
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-3.5 border-t-[1.5px] border-dashed border-ink/40" />
                  On-track pace
                </span>
              </div>
              <div className="mt-1.5 text-[11.5px] text-ink/55">
                <span className="font-semibold text-ink/75">{formatCompactPaise(paceSaved)}</span> saved ·{' '}
                {paceDelta >= 0 ? (
                  <>
                    <span className="font-semibold text-sage">{formatCompactPaise(paceDelta)} ahead</span> of pace
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-accent-strong">{formatCompactPaise(-paceDelta)} behind</span> pace
                  </>
                )}{' '}
                through {MONTH_NAMES[paceLastIdx]}
              </div>
            </div>
          )}

          {view === 'month' && activePlan && activePlan.splits.some((s) => s.targetPct > 0) && (
            <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Split by fund</div>

              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink/40">Plan</div>
              <div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
                {activePlan.splits.map(
                  (split) =>
                    split.targetPct > 0 && (
                      <div
                        key={fundKeys.get(split)}
                        className={cn('h-full', TONE_BG[fundTones.get(split)!])}
                        style={{ width: `${split.targetPct}%` }}
                      />
                    ),
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {activePlan.splits.map((split) => (
                  <div key={fundKeys.get(split)} className="flex items-center gap-1.5 text-[12px]">
                    <span className={cn('h-2 w-2 shrink-0 rounded-sm', TONE_BG[fundTones.get(split)!])} />
                    <span className="text-ink/70">{splitDisplayName(split, assetClassLabel)}</span>
                    <span className="font-semibold tabular-nums text-ink/45">{split.targetPct}%</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-[10.5px] font-semibold uppercase tracking-wide text-ink/40">
                {view === 'month' ? 'This month' : 'This year'}
              </div>
              {anySplitActual ? (
                <>
                  <div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-ink/8">
                    {activePlan.splits.map((split) => {
                      const actual = splitActual.get(split) ?? 0
                      const share = splitPositiveTotal > 0 ? (Math.max(0, actual) / splitPositiveTotal) * 100 : 0
                      return (
                        share > 0 && (
                          <div
                            key={fundKeys.get(split)}
                            className={cn('h-full', TONE_BG[fundTones.get(split)!])}
                            style={{ width: `${share}%` }}
                          />
                        )
                      )
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                    {activePlan.splits.map((split) => {
                      const actual = splitActual.get(split) ?? 0
                      // Percentage share (of positive total) mirrors the Plan
                      // row's % format and the bar widths above. A net
                      // withdrawal has no meaningful positive share, so show
                      // its amount in red instead.
                      const share = splitPositiveTotal > 0 ? Math.round((Math.max(0, actual) / splitPositiveTotal) * 100) : 0
                      return (
                        actual !== 0 && (
                          <div key={fundKeys.get(split)} className="flex items-center gap-1.5 text-[12px]">
                            <span className={cn('h-2 w-2 shrink-0 rounded-sm', TONE_BG[fundTones.get(split)!])} />
                            <span className="text-ink/70">{splitDisplayName(split, assetClassLabel)}</span>
                            {actual < 0 ? (
                              <span className="font-semibold tabular-nums text-accent-strong">{formatCompactPaise(actual)}</span>
                            ) : (
                              <span className="font-semibold tabular-nums text-ink/45">{share}%</span>
                            )}
                          </div>
                        )
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="mt-1.5 text-[12px] text-ink/40">
                  No contributions logged yet {view === 'month' ? 'this month' : 'this year'}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{view === 'month' ? 'Funds' : 'Yearly caps by fund'}</span>
            {view === 'month' && (
              <button onClick={openContribNew} className="flex items-center gap-1 text-[13px] font-semibold text-sage">
                <Plus size={12} strokeWidth={2.5} /> Log
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {!activePlan || activePlan.splits.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-ink/15 bg-surface/60 p-6 text-center text-[13px] text-ink/45">
                No savings plan for {monthLabel(selectedMonth)} yet.{' '}
                <button onClick={openPlanEditor} className="font-semibold text-sage">Set one up</button>
              </div>
            ) : (
              activePlan.splits.map((split) => {
                const key = fundKeys.get(split)!
                const tone = fundTones.get(split)!
                const monthActual = totalContributedPaise(
                  monthContributions.filter((c) => resolveSplitForContribution(c, activePlan.splits) === split),
                )
                const fundYearContribs = yearContributions.filter((c) => resolveSplitForContribution(c, activePlan.splits) === split)
                const yearActual = totalContributedPaise(fundYearContribs)
                // Per-calendar-month totals for this fund, for the year-view
                // expansion's pacing strip + monthly list.
                const monthlyTotals = Array.from({ length: 12 }, () => 0)
                for (const c of fundYearContribs) monthlyTotals[Number(c.date.slice(5, 7)) - 1] += c.amountPaise
                const activeMonthCount = monthlyTotals.filter((v) => v !== 0).length
                const monthlyMaxAbs = Math.max(1, ...monthlyTotals.map((v) => Math.abs(v)))
                const annualCap = annualCapPaise(split)
                const capped = annualCap > 0 && yearActual >= annualCap
                const neg = view === 'month' && monthActual < 0
                const pct =
                  view === 'month'
                    ? split.targetAmountPaise > 0
                      ? (Math.max(0, monthActual) / split.targetAmountPaise) * 100
                      : 0
                    : annualCap > 0
                      ? (yearActual / annualCap) * 100
                      : 0
                const ringMode: 'done' | 'alert' | undefined = capped ? 'done' : neg ? 'alert' : undefined
                const expanded = expandedFund === key
                const entries = monthContributions.filter((c) => resolveSplitForContribution(c, activePlan.splits) === split)
                const linkedHoldings = split.linkedHoldingIds
                  ? holdings.filter((h) => split.linkedHoldingIds!.includes(h.id))
                  : holdings.filter((h) => h.assetClass === split.assetClass)
                const yearPctForFund = annualCap > 0 ? Math.min(100, (yearActual / annualCap) * 100) : 0
                const yearOverCap = annualCap > 0 && yearActual >= annualCap

                return (
                  <div
                    key={key}
                    onClick={() => setExpandedFund(expandedFund === key ? null : key)}
                    className={cn(
                      'flex cursor-pointer flex-col gap-3 rounded-[20px] border p-3.5 shadow-sm shadow-ink/5 transition-opacity',
                      capped && !expanded ? 'opacity-70' : 'opacity-100',
                      neg ? 'border-[1.5px] border-accent-strong/30' : capped ? 'border-ink/6' : 'border-ink/7',
                      capped ? 'bg-surface/70' : 'bg-surface',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ProgressRing
                        pct={pct}
                        mode={ringMode}
                        strokeClassName={TONE_STROKE[tone]}
                        fillClassName={TONE_FILL[tone]}
                        trackClassName={neg ? 'stroke-accent-strong/15' : 'stroke-ink/8'}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                            <span className="truncate">{splitDisplayName(split, assetClassLabel)}</span>
                            {capped && (
                              <span className="shrink-0 whitespace-nowrap rounded-full bg-sage/16 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-sage">
                                Done for {yearKey}
                              </span>
                            )}
                          </span>
                          <span className={cn('shrink-0 whitespace-nowrap text-xs tabular-nums', neg ? 'font-semibold text-accent-strong' : 'font-normal text-ink/45')}>
                            {view === 'month'
                              ? `${formatCompactPaise(monthActual)} / ${formatCompactPaise(split.targetAmountPaise)}`
                              : `${formatCompactPaise(yearActual)} / ${formatCompactPaise(annualCap)}`}
                          </span>
                        </div>
                        <ProgressBar pct={pct} className={cn('mt-1.5 h-1.5', neg && 'bg-accent-strong/15')} tone={neg ? 'accent' : 'sage'} />
                        <div className={cn('mt-1 text-[11px]', capped ? 'text-ink/45' : neg ? 'text-accent-strong' : 'text-ink/40')}>
                          {view === 'month'
                            ? capped
                              ? 'Yearly goal met — skip this month'
                              : neg
                                ? 'Withdrawal this month'
                                : pct >= 100
                                  ? 'Monthly goal met'
                                  : 'On plan'
                            : yearOverCap
                              ? `Exceeded by ${formatCompactPaise(yearActual - annualCap)} — don't buy more this year`
                              : annualCap > 0
                                ? `${formatCompactPaise(annualCap - yearActual)} left this year`
                                : 'No annual cap set'}
                        </div>
                      </div>
                      <ChevronDown size={13} className={cn('shrink-0 text-ink/35 transition-transform', expanded && 'rotate-180')} />
                    </div>

                    {expanded && (
                      <div className="flex flex-col gap-3 duration-200 animate-in fade-in">
                        {view === 'month' ? (
                          <>
                        {annualCap > 0 && (
                          <div className="flex flex-col gap-1.5 rounded-[13px] bg-ink/3 p-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold uppercase tracking-wide text-ink/55">This year</span>
                              <span className="tabular-nums text-ink/50">
                                {formatCompactPaise(yearActual)} / {formatCompactPaise(annualCap)} cap
                              </span>
                            </div>
                            <ProgressBar pct={yearPctForFund} tone={yearOverCap ? 'sage' : 'accent'} className="h-1.5" />
                            <span className={cn('text-[11px]', yearOverCap ? 'text-sage' : 'text-ink/40')}>
                              {yearOverCap ? "Annual cap met — don't contribute more this year" : `${formatCompactPaise(annualCap - yearActual)} left before the annual cap`}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink/45">This month</div>
                          {entries.length === 0 ? (
                            <div className="text-xs text-ink/40">No contributions this month yet</div>
                          ) : (
                            entries.map((e) => (
                              <div key={e.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                                <span className="min-w-0 truncate text-ink/55">{formatEntryLabel(e)}</span>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <span className={cn('font-semibold tabular-nums', e.amountPaise < 0 ? 'text-accent-strong' : 'text-ink/75')}>
                                    {formatPaise(e.amountPaise)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation()
                                      openContribEdit(e)
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded-md bg-ink/6 text-ink/50 hover:bg-ink/10"
                                    aria-label="Edit contribution"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation()
                                      handleContribDelete(e.id)
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-strong/9 text-accent-strong hover:bg-accent-strong/15"
                                    aria-label="Delete contribution"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                          </>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink/45">By month</span>
                              {activeMonthCount > 0 && (
                                <span className="text-[10px] text-ink/35">tap a bar to open that month</span>
                              )}
                            </div>
                            {activeMonthCount === 0 ? (
                              <div className="text-xs text-ink/40">No contributions logged this year yet</div>
                            ) : (
                              <>
                                <div className="flex items-end gap-1">
                                  {monthlyTotals.map((v, i) => {
                                    const h = v !== 0 ? Math.max(12, (Math.abs(v) / monthlyMaxAbs) * 100) : 0
                                    const isSel = i === Number(selectedMonth.slice(5, 7)) - 1
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={(ev) => {
                                          ev.stopPropagation()
                                          setSelectedMonth(`${yearKey}-${String(i + 1).padStart(2, '0')}`)
                                          setView('month')
                                        }}
                                        className="flex flex-1 flex-col items-center gap-1"
                                        aria-label={`${MONTH_NAMES[i]}: ${formatPaise(v)}`}
                                      >
                                        <div className="flex h-12 w-full items-end overflow-hidden rounded-[3px] bg-ink/5">
                                          <div
                                            className={cn('w-full', v < 0 ? 'bg-accent-strong/70' : TONE_BG[tone])}
                                            style={{ height: `${h}%` }}
                                          />
                                        </div>
                                        <span className={cn('text-[9px] leading-none', isSel ? 'font-bold text-ink/60' : 'text-ink/35')}>
                                          {MONTH_NAMES[i].slice(0, 1)}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]">
                                  {monthlyTotals.map((v, i) =>
                                    v !== 0 ? (
                                      <span key={i} className="text-ink/50">
                                        {MONTH_NAMES[i].slice(0, 3)}{' '}
                                        <span className={cn('font-semibold tabular-nums', v < 0 ? 'text-accent-strong' : 'text-ink/75')}>
                                          {formatCompactPaise(v)}
                                        </span>
                                      </span>
                                    ) : null,
                                  )}
                                </div>
                                <div className="text-[10.5px] text-ink/40">
                                  Contributed in {activeMonthCount} of 12 months · {formatCompactPaise(Math.round(yearActual / activeMonthCount))} avg
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink/45">Linked holdings</span>
                            {holdings.length > 0 && (
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  openLinkHoldings(split)
                                }}
                                className="text-[11.5px] font-semibold text-blue"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                          {holdings.length === 0 ? (
                            <Link to="/portfolio" onClick={(ev) => ev.stopPropagation()} className="text-[11.5px] font-semibold text-blue">
                              + Add a holding in Portfolio to link here
                            </Link>
                          ) : linkedHoldings.length === 0 ? (
                            <div className="text-xs text-ink/40">No holdings linked yet</div>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-1.5">
                                {linkedHoldings.map((h) => (
                                  <span
                                    key={h.id}
                                    className="flex items-center gap-1.5 rounded-full border border-blue/25 bg-blue/12 px-2.5 py-1 text-[11.5px] font-semibold text-ink/80"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                                    {h.name}
                                  </span>
                                ))}
                              </div>
                              <div className="text-[10.5px] text-ink/40">Shown here for reference — doesn't change how contributions are logged</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {unassignedContributions.length > 0 && (
            <div className="rounded-[20px] border border-gold/35 bg-gold/6 p-3.5 shadow-sm shadow-ink/5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">Unassigned</span>
                <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-gold">
                  {unassignedContributions.length}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink/50">
                {view === 'month' ? 'This month' : 'This year'} these aren't linked to any current fund — they still count in
                your totals above. Edit one to assign it to a fund.
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {unassignedContributions.map((c) => {
                  const hint = fundNameForContribution(c)
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="min-w-0 truncate text-ink/55">
                        {formatEntryLabel(c)}
                        {hint && ` · ${hint}`}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className={cn('font-semibold tabular-nums', c.amountPaise < 0 ? 'text-accent-strong' : 'text-ink/75')}>
                          {formatPaise(c.amountPaise)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openContribEdit(c)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-ink/6 text-ink/50 hover:bg-ink/10"
                          aria-label="Edit contribution"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleContribDelete(c.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-strong/9 text-accent-strong hover:bg-accent-strong/15"
                          aria-label="Delete contribution"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-1.5 self-center py-1.5 text-[12.5px] font-semibold text-ink/45 hover:text-ink/65"
          >
            <Download size={12} /> Export full history (CSV)
          </button>
        </>
      )}

      <EntityForm
        open={planOpen}
        onOpenChange={setPlanOpen}
        title="Yearly Savings Plan"
        subtitle={`Applies from ${monthLabel(selectedMonth)} onward, until you change it again`}
        onSubmit={handlePlanSubmit}
        submitLabel="Save Plan"
        accent="sage"
      >
        <div className="flex gap-2">
          <MoneyInput
            label="Monthly Goal"
            valueRupees={Math.round(yearlyGoalRupees / 12)}
            onChange={(v) => setYearlyGoalRupees(v * 12)}
          />
          <MoneyInput label="Yearly Goal" valueRupees={yearlyGoalRupees} onChange={setYearlyGoalRupees} required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-ink/70">Split by fund</span>
            <span className={cn('text-xs tabular-nums', allocatedPct === 100 ? 'text-ink/40' : 'text-accent-strong')}>
              {allocatedPct}% of 100% allocated
            </span>
          </div>
          {splits.length > 0 && (
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
              {splits.map(
                (row, i) =>
                  Number.isFinite(row.targetPct) &&
                  row.targetPct > 0 && (
                    <div
                      key={row.id}
                      className={cn('h-full', TONE_BG[TONE_CYCLE[i % TONE_CYCLE.length]])}
                      style={{ width: `${row.targetPct}%` }}
                    />
                  ),
              )}
            </div>
          )}
          {splits.map((row, i) => {
            const pct = Number.isFinite(row.targetPct) ? row.targetPct : 0
            const monthlyAmountPaise = Math.round((rupeesToPaise(yearlyGoalRupees) * pct) / 100 / 12)
            const annualAmountPaise = monthlyAmountPaise * 12
            const original = activePlan?.splits.find((os) => fundKeys.get(os) === row.id)
            const yearActualForRow = original
              ? totalContributedPaise(yearContributions.filter((c) => resolveSplitForContribution(c, activePlan!.splits) === original))
              : 0
            const rowCapped = annualAmountPaise > 0 && yearActualForRow >= annualAmountPaise
            return (
              <div key={row.id} className="flex flex-col gap-1">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-2.5 py-2',
                    rowCapped ? 'border-sage/35 bg-sage/5' : 'border-ink/9 bg-app/40',
                  )}
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-sm', TONE_BG[TONE_CYCLE[i % TONE_CYCLE.length]])} />
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateSplitRow(i, { name: e.target.value })}
                    placeholder="Fund name"
                    className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ink outline-none"
                  />
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-ink/14 bg-app px-2 py-1">
                    <input
                      type="number"
                      value={Number.isFinite(row.targetPct) ? row.targetPct : ''}
                      onChange={(e) => updateSplitRow(i, { targetPct: e.target.value === '' ? Number.NaN : Number(e.target.value) })}
                      className="w-9 bg-transparent text-right text-[14px] text-ink outline-none tabular-nums"
                    />
                    <span className="text-[13px] text-ink/40">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSplitRow(i)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-strong/9 text-accent-strong hover:bg-accent-strong/15"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className={cn('pl-1 text-[11px]', rowCapped ? 'font-semibold text-sage' : 'text-ink/40')}>
                  {rowCapped
                    ? `✓ Cap reached — ${formatCompactPaise(yearActualForRow)} saved this year, goal auto-skipped`
                    : `≈ ${formatCompactPaise(monthlyAmountPaise)}/mo · ${formatCompactPaise(annualAmountPaise)}/yr`}
                </div>
              </div>
            )
          })}
          <button type="button" onClick={addSplitRow} className="text-[13px] font-semibold text-sage">
            + Add fund
          </button>
        </div>
      </EntityForm>

      <EntityForm
        open={contribOpen}
        onOpenChange={(o) => {
          setContribOpen(o)
          if (!o) setEditingContribId(null)
        }}
        title={editingContribId ? 'Edit Contribution' : 'Log Contribution'}
        submitLabel={editingContribId ? 'Save Changes' : undefined}
        onSubmit={handleContribSubmit}
        accent="sage"
      >
        <TextInput label="Date" type="date" value={contribDate} onChange={setContribDate} required />
        <MoneyInput label="Amount" valueRupees={contribAmountRupees} onChange={setContribAmountRupees} required />
        <Select
          label="Fund"
          value={contribFundId}
          onChange={setContribFundId}
          options={fundOptions}
        />
        <Select label="Goal (optional)" value={contribGoalId} onChange={setContribGoalId} options={[{ value: '', label: 'Not linked to a goal' }, ...goals.map((goal) => ({ value: goal.id, label: goal.name }))]} />
        <TextInput label="Note" value={contribNote} onChange={setContribNote} />
      </EntityForm>

      <EntityForm
        open={linkFund !== null}
        onOpenChange={(o) => !o && setLinkFund(null)}
        title="Link holdings"
        subtitle={linkSplit ? `${splitDisplayName(linkSplit, assetClassLabel)} fund` : ''}
        onSubmit={saveLinkedHoldings}
        submitLabel={linkSelectedIds.length > 0 ? `Link ${linkSelectedIds.length} holding${linkSelectedIds.length > 1 ? 's' : ''}` : 'Save'}
        accent="sage"
      >
        <div className="flex items-start gap-2.5 rounded-2xl border border-blue/20 bg-blue/10 p-3.5 text-[12.5px] leading-relaxed text-ink/70">
          <Info size={15} className="mt-0.5 shrink-0 text-blue" />
          <span>Choose which holdings count toward this fund. This only changes what's shown here — it doesn't change how contributions are logged.</span>
        </div>
        <div className="space-y-2">
          <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">Your portfolio</div>
          {linkCandidates.map((h) => {
            const on = linkSelectedIds.includes(h.id)
            return (
              <div
                key={h.id}
                onClick={() => toggleLinkHolding(h.id)}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-2xl border p-3.5',
                  on ? 'border-[1.5px] border-sage bg-sage/7' : 'border-ink/10 bg-app',
                )}
              >
                <div>
                  <div className="text-sm font-semibold text-ink">{h.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink/40">
                    {assetClassLabel(h.assetClass)} · {h.platform} · {formatCompactPaise(h.currentValuePaise)}
                  </div>
                </div>
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', on ? 'bg-sage' : 'border-[1.5px] border-ink/18')}>
                  {on && <Check size={12} className="text-cream" strokeWidth={3} />}
                </span>
              </div>
            )
          })}
        </div>
      </EntityForm>
    </div>
  )
}
