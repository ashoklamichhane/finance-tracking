import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { db, type Goal } from '@/db/db'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { ProgressBar } from '@/components/ProgressBar'
import { newId } from '@/lib/id'
import { paiseToRupees, rupeesToPaise, formatCompactPaise } from '@/lib/money'
import { goalProgress } from '@/lib/calc'

interface DraftGoal {
  name: string
  category: string
  targetAmountRupees: number
  currentAmountRupees: number
  targetDate: string
  monthlyAllocationRupees: number
  notes: string
}

const EMPTY_DRAFT: DraftGoal = {
  name: '',
  category: '',
  targetAmountRupees: 0,
  currentAmountRupees: 0,
  targetDate: '',
  monthlyAllocationRupees: 0,
  notes: '',
}

export function Goals() {
  const goals = useLiveQuery(() => db.goals.orderBy('priority').toArray(), [], [])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftGoal>(EMPTY_DRAFT)

  function openNew() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setOpen(true)
  }

  function openEdit(goal: Goal) {
    setEditingId(goal.id)
    setDraft({
      name: goal.name,
      category: goal.category,
      targetAmountRupees: paiseToRupees(goal.targetAmountPaise),
      currentAmountRupees: paiseToRupees(goal.currentAmountPaise),
      targetDate: goal.targetDate ?? '',
      monthlyAllocationRupees: paiseToRupees(goal.monthlyAllocationPaise),
      notes: goal.notes,
    })
    setOpen(true)
  }

  async function handleSubmit() {
    const now = Date.now()
    if (editingId) {
      await db.goals.update(editingId, {
        name: draft.name,
        category: draft.category,
        targetAmountPaise: rupeesToPaise(draft.targetAmountRupees),
        currentAmountPaise: rupeesToPaise(draft.currentAmountRupees),
        targetDate: draft.targetDate || null,
        monthlyAllocationPaise: rupeesToPaise(draft.monthlyAllocationRupees),
        notes: draft.notes,
        updatedAt: now,
      })
    } else {
      const existingCount = await db.goals.count()
      await db.goals.add({
        id: newId(),
        name: draft.name,
        category: draft.category,
        targetAmountPaise: rupeesToPaise(draft.targetAmountRupees),
        currentAmountPaise: rupeesToPaise(draft.currentAmountRupees),
        targetDate: draft.targetDate || null,
        priority: existingCount,
        monthlyAllocationPaise: rupeesToPaise(draft.monthlyAllocationRupees),
        notes: draft.notes,
        updatedAt: now,
      })
    }
    setOpen(false)
  }

  async function handleDelete(id: string) {
    await db.goals.delete(id)
  }

  if (!goals) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Goals</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add goal
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-neutral-400">No goals yet. Add your first one.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => {
            const { progressPct, projectedDate, remainingPaise } = goalProgress(goal)
            return (
              <li
                key={goal.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{goal.name}</div>
                    {goal.category && <div className="text-xs text-neutral-400">{goal.category}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(goal)}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                      aria-label="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="tabular-nums text-neutral-500">
                    {formatCompactPaise(goal.currentAmountPaise)} / {formatCompactPaise(goal.targetAmountPaise)}
                  </span>
                  <span className="tabular-nums text-neutral-400">{progressPct.toFixed(0)}%</span>
                </div>
                <ProgressBar pct={progressPct} />
                <div className="mt-2 flex justify-between text-xs text-neutral-400">
                  <span>{remainingPaise > 0 ? `${formatCompactPaise(remainingPaise)} remaining` : 'Target reached'}</span>
                  {projectedDate && <span>Projected: {projectedDate}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <EntityForm
        open={open}
        onOpenChange={setOpen}
        title={editingId ? 'Edit goal' : 'Add goal'}
        onSubmit={handleSubmit}
      >
        <TextInput label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required />
        <TextInput label="Category" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} placeholder="e.g. Education, Retirement" />
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label="Target amount"
            valueRupees={draft.targetAmountRupees}
            onChange={(v) => setDraft({ ...draft, targetAmountRupees: v })}
            required
          />
          <MoneyInput
            label="Current amount"
            valueRupees={draft.currentAmountRupees}
            onChange={(v) => setDraft({ ...draft, currentAmountRupees: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label="Monthly allocation"
            valueRupees={draft.monthlyAllocationRupees}
            onChange={(v) => setDraft({ ...draft, monthlyAllocationRupees: v })}
          />
          <TextInput
            label="Target date"
            type="date"
            value={draft.targetDate}
            onChange={(v) => setDraft({ ...draft, targetDate: v })}
          />
        </div>
        <TextInput label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
      </EntityForm>
    </div>
  )
}
