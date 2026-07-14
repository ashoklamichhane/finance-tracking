import { useState } from 'react'
import { Plus, Pencil, Trash2, CheckCircle2, ArrowUpDown, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type Goal, type Holding } from '@/db/db'
import { useFirestoreCollection, putDoc, patchDoc, removeDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { Select } from '@/components/Select'
import { ProgressBar } from '@/components/ProgressBar'
import { newId } from '@/lib/id'
import { paiseToRupees, rupeesToPaise, formatCompactPaise } from '@/lib/money'
import { goalProgress, linkedFundPaise } from '@/lib/calc'
import { cn } from '@/lib/utils'

interface DraftGoal {
  name: string
  category: string
  targetAmountRupees: number
  currentAmountRupees: number
  targetDate: string
  monthlyAllocationRupees: number
  notes: string
  trackingType: 'savings' | 'payments' | 'both'
}

const EMPTY_DRAFT: DraftGoal = {
  name: '',
  category: '',
  targetAmountRupees: 0,
  currentAmountRupees: 0,
  targetDate: '',
  monthlyAllocationRupees: 0,
  notes: '',
  trackingType: 'savings',
}

export function Goals() {
  const user = useAuthUser()
  const navigate = useNavigate()
  const uid = user?.uid
  const goalsRaw = useFirestoreCollection<Goal>(uid, 'goals')
  const holdings = useFirestoreCollection<Holding>(uid, 'holdings')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftGoal>(EMPTY_DRAFT)
  const [linkedHoldingIds, setLinkedHoldingIds] = useState<string[]>([])
  const [reorderMode, setReorderMode] = useState(false)
  const [reorderIds, setReorderIds] = useState<string[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)

  if (!uid || !goalsRaw || !holdings) return null
  const goals = [...goalsRaw].sort((a, b) => a.priority - b.priority)
  const orderedGoals = reorderMode && reorderIds.length === goals.length
    ? reorderIds.map((id) => goals.find((goal) => goal.id === id)).filter((goal): goal is Goal => Boolean(goal))
    : goals

  function openNew() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setLinkedHoldingIds([])
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
      trackingType: goal.trackingType ?? 'savings',
    })
    setLinkedHoldingIds(goal.linkedHoldingIds ?? [])
    setOpen(true)
  }

  async function handleSubmit() {
    const now = Date.now()
    if (editingId) {
      await patchDoc(uid!, 'goals', editingId, {
        name: draft.name,
        category: draft.category,
        targetAmountPaise: rupeesToPaise(draft.targetAmountRupees),
        currentAmountPaise: rupeesToPaise(draft.currentAmountRupees),
        targetDate: draft.targetDate || null,
        monthlyAllocationPaise: rupeesToPaise(draft.monthlyAllocationRupees),
        linkedHoldingIds,
        trackingType: draft.trackingType,
        notes: draft.notes,
        updatedAt: now,
      })
    } else {
      await putDoc<Goal>(uid!, 'goals', {
        id: newId(),
        name: draft.name,
        category: draft.category,
        targetAmountPaise: rupeesToPaise(draft.targetAmountRupees),
        currentAmountPaise: rupeesToPaise(draft.currentAmountRupees),
        targetDate: draft.targetDate || null,
        priority: goals.length,
        monthlyAllocationPaise: rupeesToPaise(draft.monthlyAllocationRupees),
        linkedHoldingIds,
        trackingType: draft.trackingType,
        notes: draft.notes,
        updatedAt: now,
      })
    }
    setOpen(false)
  }

  async function handleDelete(id: string) {
    await removeDoc(uid!, 'goals', id)
  }

  async function saveOrder(ids: string[]) {
    await Promise.all(ids.map((id, priority) => patchDoc(uid!, 'goals', id, { priority, updatedAt: Date.now() })))
  }

  async function toggleReorder() {
    if (reorderMode) {
      await saveOrder(reorderIds)
      setDraggingId(null)
      setReorderMode(false)
      return
    }
    setReorderIds(goals.map((goal) => goal.id))
    setReorderMode(true)
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (!reorderMode) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingId(id)
  }

  function dragOver(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingId) return
    const element = document.elementFromPoint(event.clientX, event.clientY)
    const targetId = element?.closest<HTMLElement>('[data-goal-id]')?.dataset.goalId
    if (!targetId || targetId === draggingId) return
    setReorderIds((ids) => {
      const from = ids.indexOf(draggingId)
      const to = ids.indexOf(targetId)
      if (from < 0 || to < 0 || from === to) return ids
      const next = [...ids]
      next.splice(from, 1)
      next.splice(to, 0, draggingId)
      return next
    })
  }

  async function finishDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDraggingId(null)
    await saveOrder(reorderIds)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Goals</h1>
        <div className="flex items-center gap-2">
          <button onClick={toggleReorder} className={cn('flex items-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-semibold', reorderMode ? 'bg-ink text-cream' : 'bg-ink/6 text-ink/70')}>
            <ArrowUpDown size={14} /> {reorderMode ? 'Done' : 'Reorder'}
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-cream shadow-[0_2px_8px_rgba(217,119,87,0.35)] hover:opacity-90"
          >
            <Plus size={14} strokeWidth={2.5} /> Add Goal
          </button>
        </div>
      </div>

      {goals.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink/35">No goals yet. Add your first one.</p>
      ) : (
        <ul className="space-y-2.5">
          {orderedGoals.map((goal) => {
            const fundedPaise = linkedFundPaise(goal, holdings)
            const { progressPct, projectedDate, remainingPaise } = goalProgress({ ...goal, currentAmountPaise: fundedPaise })
            const isComplete = progressPct >= 100
            return (
              <li
                key={goal.id}
                data-goal-id={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => !reorderMode && navigate(`/goals/${goal.id}`)}
                onKeyDown={(event) => { if (!reorderMode && (event.key === 'Enter' || event.key === ' ')) navigate(`/goals/${goal.id}`) }}
                className={cn(
                  'cursor-pointer rounded-[22px] border border-ink/7 bg-surface p-4 shadow-sm shadow-ink/5 transition-colors hover:border-accent/30',
                  isComplete && 'opacity-70',
                  reorderMode && 'cursor-default border-ink/15',
                  draggingId === goal.id && 'scale-[1.01] opacity-60 shadow-lg',
                )}
              >
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[15.5px] font-semibold text-ink">
                      {goal.name}
                      {isComplete && <CheckCircle2 size={15} className="text-sage" />}
                    </div>
                    {goal.category && <div className="mt-px text-xs text-ink/40">{goal.category}</div>}
                  </div>
                  <div className="flex gap-1">
                    {reorderMode && <button type="button" onPointerDown={(event) => startDrag(event, goal.id)} onPointerMove={dragOver} onPointerUp={finishDrag} onPointerCancel={finishDrag} onClick={(event) => event.stopPropagation()} className="flex h-9 w-9 touch-none cursor-grab items-center justify-center rounded-lg bg-ink/6 text-ink/55 active:cursor-grabbing" aria-label={`Hold and drag ${goal.name} to reorder`}><GripVertical size={17} /></button>}
                    <button
                      onClick={(event) => { event.stopPropagation(); openEdit(goal) }}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-ink/5 text-ink/50 hover:bg-ink/10"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(event) => { event.stopPropagation(); handleDelete(goal.id) }}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent-strong/9 text-accent-strong hover:bg-accent-strong/15"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mb-1.5 flex items-baseline justify-between text-[13.5px]">
                  <span className="tabular-nums text-ink/50">
                    {formatCompactPaise(fundedPaise)} / {formatCompactPaise(goal.targetAmountPaise)}
                  </span>
                  <span className="tabular-nums text-ink/40">{progressPct.toFixed(0)}%</span>
                </div>
                <ProgressBar pct={progressPct} />
                <div className="mt-2.5 flex justify-between text-[11.5px] text-ink/40">
                  <span>{remainingPaise > 0 ? `${formatCompactPaise(remainingPaise)} remaining` : 'Target reached'}</span>
                  {projectedDate && <span>Projected: {projectedDate}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <EntityForm open={open} onOpenChange={setOpen} title={editingId ? 'Edit Goal' : 'Add Goal'} onSubmit={handleSubmit} submitLabel="Save Goal">
        <TextInput label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required placeholder="e.g. Home down payment" />
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
        <Select
          label="Track for this goal"
          value={draft.trackingType}
          onChange={(value) => setDraft({ ...draft, trackingType: value as DraftGoal['trackingType'] })}
          options={[
            { value: 'savings', label: 'Savings only' },
            { value: 'payments', label: 'Payments only' },
            { value: 'both', label: 'Savings and payments' },
          ]}
        />
        <div className="space-y-2">
          <div className="text-[13px] font-semibold text-ink/70">Linked portfolio funds <span className="font-normal text-ink/40">(optional)</span></div>
          <p className="text-xs text-ink/45">Selected holdings update this goal’s fund balance automatically.</p>
          {holdings.length === 0 ? <p className="text-xs text-ink/40">Add a portfolio holding first.</p> : holdings.map((holding) => (
            <label key={holding.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-ink/10 p-3 text-[13px]">
              <span>{holding.name}</span>
              <input type="checkbox" checked={linkedHoldingIds.includes(holding.id)} onChange={() => setLinkedHoldingIds((ids) => ids.includes(holding.id) ? ids.filter((id) => id !== holding.id) : [...ids, holding.id])} />
            </label>
          ))}
        </div>
      </EntityForm>
    </div>
  )
}
