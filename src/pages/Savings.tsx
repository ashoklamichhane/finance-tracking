import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ASSET_CLASSES, type AssetClass, type SavingsSplit, type SavingsPlan, type Contribution } from '@/db/db'
import { useFirestoreCollection, useFirestoreDoc, putDoc, removeDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { Select } from '@/components/Select'
import { ProgressBar } from '@/components/ProgressBar'
import { BackButton } from '@/components/BackButton'
import { newId } from '@/lib/id'
import { rupeesToPaise, paiseToRupees, formatPaise, formatCompactPaise } from '@/lib/money'
import { currentMonthKey, contributionsForMonth, totalContributedPaise, plannedVsActual } from '@/lib/calc'

const PLAN_ID = 'main'

function assetClassLabel(ac: AssetClass) {
  return ASSET_CLASSES.find((a) => a.value === ac)?.label ?? ac
}

export function Savings() {
  const user = useAuthUser()
  const uid = user?.uid
  const plan = useFirestoreDoc<SavingsPlan>(uid, 'savingsPlan', PLAN_ID)
  const contributionsRaw = useFirestoreCollection<Contribution>(uid, 'contributions')

  const [planOpen, setPlanOpen] = useState(false)
  const [monthlyTotalRupees, setMonthlyTotalRupees] = useState(0)
  const [splits, setSplits] = useState<{ assetClass: AssetClass; targetPct: number }[]>([])

  const [contribOpen, setContribOpen] = useState(false)
  const [contribDate, setContribDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [contribAmountRupees, setContribAmountRupees] = useState(0)
  const [contribAssetClass, setContribAssetClass] = useState<AssetClass>('mf')
  const [contribNote, setContribNote] = useState('')

  function openPlanEditor() {
    setMonthlyTotalRupees(plan ? paiseToRupees(plan.monthlyTotalPaise) : 0)
    setSplits(plan ? plan.splits.map((s) => ({ assetClass: s.assetClass, targetPct: s.targetPct })) : [])
    setPlanOpen(true)
  }

  function addSplitRow() {
    setSplits([...splits, { assetClass: 'mf', targetPct: 0 }])
  }

  function updateSplitRow(index: number, patch: Partial<{ assetClass: AssetClass; targetPct: number }>) {
    setSplits(splits.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeSplitRow(index: number) {
    setSplits(splits.filter((_, i) => i !== index))
  }

  async function handlePlanSubmit() {
    const monthlyTotalPaise = rupeesToPaise(monthlyTotalRupees)
    const finalSplits: SavingsSplit[] = splits.map((s) => ({
      assetClass: s.assetClass,
      targetPct: s.targetPct,
      targetAmountPaise: Math.round((monthlyTotalPaise * s.targetPct) / 100),
    }))
    await putDoc<SavingsPlan>(uid!, 'savingsPlan', {
      id: PLAN_ID,
      monthlyTotalPaise,
      splits: finalSplits,
      updatedAt: Date.now(),
    })
    setPlanOpen(false)
  }

  function openContribNew() {
    setContribDate(new Date().toISOString().slice(0, 10))
    setContribAmountRupees(0)
    setContribAssetClass('mf')
    setContribNote('')
    setContribOpen(true)
  }

  async function handleContribSubmit() {
    await putDoc<Contribution>(uid!, 'contributions', {
      id: newId(),
      date: contribDate,
      amountPaise: rupeesToPaise(contribAmountRupees),
      goalId: null,
      assetClass: contribAssetClass,
      note: contribNote,
    })
    setContribOpen(false)
  }

  async function handleContribDelete(id: string) {
    await removeDoc(uid!, 'contributions', id)
  }

  if (!uid || !contributionsRaw) return null
  const contributions = [...contributionsRaw].sort((a, b) => b.date.localeCompare(a.date))

  const monthKey = currentMonthKey()
  const monthContributions = contributionsForMonth(contributions, monthKey)
  const savedThisMonth = totalContributedPaise(monthContributions)
  const pctOfSplit = splits.reduce((s, r) => s + r.targetPct, 0)
  const comparison = plannedVsActual(plan, monthContributions)
  const monthlyTarget = plan?.monthlyTotalPaise ?? 0
  const savedPct = monthlyTarget > 0 ? Math.min(100, (savedThisMonth / monthlyTarget) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Savings</h1>
        </div>
        <button
          onClick={openPlanEditor}
          className="rounded-full bg-ink/6 px-4 py-2.5 text-[13px] font-semibold text-ink/70 hover:bg-ink/10"
        >
          Edit Plan
        </button>
      </div>

      <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">Saved this month</div>
            <div
              className={`mt-1.5 font-serif text-2xl font-semibold ${monthlyTarget > 0 && savedThisMonth >= monthlyTarget ? 'text-sage' : 'text-ink'}`}
            >
              {formatCompactPaise(savedThisMonth)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">Target</div>
            <div className="mt-1.5 text-base font-semibold text-ink/55">{formatCompactPaise(monthlyTarget)}</div>
          </div>
        </div>
        <ProgressBar pct={savedPct} tone="sage" className="mt-3 h-2" />
      </div>

      {comparison.length > 0 && (
        <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Planned vs Actual</div>
          <div className="space-y-2.5">
            {comparison.map((c) => (
              <div key={c.assetClass} className="flex items-center justify-between text-[13.5px]">
                <span className="text-ink/75">{assetClassLabel(c.assetClass)}</span>
                <span className="tabular-nums text-ink/40">
                  {formatCompactPaise(c.actualPaise)} / {formatCompactPaise(c.plannedPaise)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Contribution Log</span>
          <button onClick={openContribNew} className="flex items-center gap-1 text-[13px] font-semibold text-sage">
            <Plus size={12} strokeWidth={2.5} /> Log
          </button>
        </div>
        {contributions.length === 0 ? (
          <p className="py-4 text-center text-[13.5px] text-ink/35">No contributions logged yet.</p>
        ) : (
          <div className="space-y-2.5">
            {contributions.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-[13.5px]">
                <span className="text-ink/50">
                  {c.date} · {c.assetClass ? assetClassLabel(c.assetClass) : '—'}
                  {c.note && ` · ${c.note}`}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="tabular-nums font-semibold text-ink/80">{formatPaise(c.amountPaise)}</span>
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

      <EntityForm open={planOpen} onOpenChange={setPlanOpen} title="Monthly Savings Plan" onSubmit={handlePlanSubmit} submitLabel="Save Plan" accent="sage">
        <MoneyInput label="Monthly Total" valueRupees={monthlyTotalRupees} onChange={setMonthlyTotalRupees} required />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink/70">Split by asset class</span>
            <span className={`text-xs tabular-nums ${pctOfSplit === 100 ? 'text-ink/40' : 'text-accent-strong'}`}>
              {pctOfSplit}% allocated
            </span>
          </div>
          {splits.map((row, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Select
                label=""
                value={row.assetClass}
                onChange={(v) => updateSplitRow(i, { assetClass: v as AssetClass })}
                options={ASSET_CLASSES}
              />
              <input
                type="number"
                value={row.targetPct}
                onChange={(e) => updateSplitRow(i, { targetPct: Number(e.target.value) })}
                className="w-16 rounded-xl border border-ink/14 bg-white px-2.5 py-2.5 text-[13.5px] text-ink outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => removeSplitRow(i)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-strong/9 text-accent-strong hover:bg-accent-strong/15"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addSplitRow} className="text-[13px] font-semibold text-sage">
            + Add Row
          </button>
        </div>
      </EntityForm>

      <EntityForm open={contribOpen} onOpenChange={setContribOpen} title="Log Contribution" onSubmit={handleContribSubmit} accent="sage">
        <TextInput label="Date" type="date" value={contribDate} onChange={setContribDate} required />
        <MoneyInput label="Amount" valueRupees={contribAmountRupees} onChange={setContribAmountRupees} required />
        <Select
          label="Asset class"
          value={contribAssetClass}
          onChange={(v) => setContribAssetClass(v as AssetClass)}
          options={ASSET_CLASSES}
        />
        <TextInput label="Note" value={contribNote} onChange={setContribNote} />
      </EntityForm>
    </div>
  )
}
