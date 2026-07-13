import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ASSET_CLASSES, type AssetClass, type SavingsSplit, type SavingsPlan, type Contribution } from '@/db/db'
import { useFirestoreCollection, useFirestoreDoc, putDoc, removeDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { Select } from '@/components/Select'
import { StatTile } from '@/components/StatTile'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Savings</h1>
        <button
          onClick={openPlanEditor}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {plan ? 'Edit plan' : 'Set up plan'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Monthly target" value={formatCompactPaise(plan?.monthlyTotalPaise ?? 0)} />
        <StatTile
          label="Saved this month"
          value={formatCompactPaise(savedThisMonth)}
          tone={plan && savedThisMonth >= plan.monthlyTotalPaise ? 'positive' : 'default'}
        />
      </div>

      {comparison.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Planned vs actual this month
          </div>
          <ul className="space-y-2">
            {comparison.map((c) => (
              <li key={c.assetClass} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 dark:text-neutral-300">{assetClassLabel(c.assetClass)}</span>
                <span className="tabular-nums text-neutral-400">
                  {formatCompactPaise(c.actualPaise)} / {formatCompactPaise(c.plannedPaise)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Contribution log</span>
          <button
            onClick={openContribNew}
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            <Plus size={14} /> Log contribution
          </button>
        </div>
        {contributions.length === 0 ? (
          <p className="text-sm text-neutral-400">No contributions logged yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {contributions.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">
                  {c.date} · {c.assetClass ? assetClassLabel(c.assetClass) : '—'}
                  {c.note && ` · ${c.note}`}
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
                    {formatPaise(c.amountPaise)}
                  </span>
                  <button
                    onClick={() => handleContribDelete(c.id)}
                    className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EntityForm open={planOpen} onOpenChange={setPlanOpen} title="Monthly savings plan" onSubmit={handlePlanSubmit}>
        <MoneyInput label="Monthly total" valueRupees={monthlyTotalRupees} onChange={setMonthlyTotalRupees} required />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Split by asset class</span>
            <span className={`text-xs tabular-nums ${pctOfSplit === 100 ? 'text-neutral-400' : 'text-red-500'}`}>
              {pctOfSplit}% allocated
            </span>
          </div>
          {splits.map((row, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  label={i === 0 ? 'Asset class' : ''}
                  value={row.assetClass}
                  onChange={(v) => updateSplitRow(i, { assetClass: v as AssetClass })}
                  options={ASSET_CLASSES}
                />
              </div>
              <div className="w-24">
                <label className="block text-sm">
                  {i === 0 && <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">%</span>}
                  <input
                    type="number"
                    value={row.targetPct}
                    onChange={(e) => updateSplitRow(i, { targetPct: Number(e.target.value) })}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 outline-none focus:ring-2 focus:ring-accent dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeSplitRow(i)}
                className="mb-0.5 rounded-md p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSplitRow}
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            <Plus size={14} /> Add row
          </button>
        </div>
      </EntityForm>

      <EntityForm open={contribOpen} onOpenChange={setContribOpen} title="Log contribution" onSubmit={handleContribSubmit}>
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
