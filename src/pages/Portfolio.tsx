import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { db, type Holding, ASSET_CLASSES, type AssetClass } from '@/db/db'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { Select } from '@/components/Select'
import { AllocationBar } from '@/components/AllocationBar'
import { newId } from '@/lib/id'
import { paiseToRupees, rupeesToPaise, formatPaise } from '@/lib/money'
import { allocationByAssetClass, totalPortfolioPaise } from '@/lib/calc'
import { StatTile } from '@/components/StatTile'
import { formatCompactPaise } from '@/lib/money'

interface DraftHolding {
  name: string
  assetClass: AssetClass
  platform: string
  currentValueRupees: number
  notes: string
}

const EMPTY_DRAFT: DraftHolding = {
  name: '',
  assetClass: 'mf',
  platform: '',
  currentValueRupees: 0,
  notes: '',
}

function assetClassLabel(ac: AssetClass) {
  return ASSET_CLASSES.find((a) => a.value === ac)?.label ?? ac
}

export function Portfolio() {
  const holdings = useLiveQuery(() => db.holdings.toArray(), [], [])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftHolding>(EMPTY_DRAFT)

  function openNew() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setOpen(true)
  }

  function openEdit(holding: Holding) {
    setEditingId(holding.id)
    setDraft({
      name: holding.name,
      assetClass: holding.assetClass,
      platform: holding.platform,
      currentValueRupees: paiseToRupees(holding.currentValuePaise),
      notes: holding.notes,
    })
    setOpen(true)
  }

  async function handleSubmit() {
    const now = Date.now()
    if (editingId) {
      await db.holdings.update(editingId, {
        name: draft.name,
        assetClass: draft.assetClass,
        platform: draft.platform,
        currentValuePaise: rupeesToPaise(draft.currentValueRupees),
        notes: draft.notes,
        updatedAt: now,
      })
    } else {
      await db.holdings.add({
        id: newId(),
        name: draft.name,
        assetClass: draft.assetClass,
        platform: draft.platform,
        currentValuePaise: rupeesToPaise(draft.currentValueRupees),
        notes: draft.notes,
        updatedAt: now,
      })
    }
    setOpen(false)
  }

  async function handleDelete(id: string) {
    await db.holdings.delete(id)
  }

  if (!holdings) return null

  const allocation = allocationByAssetClass(holdings)
  const total = totalPortfolioPaise(holdings)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Portfolio</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add holding
        </button>
      </div>

      <StatTile label="Total portfolio value" value={formatCompactPaise(total)} />
      <AllocationBar allocation={allocation} />

      {holdings.length === 0 ? (
        <p className="text-sm text-neutral-400">No holdings yet. Add your first one.</p>
      ) : (
        <ul className="space-y-2">
          {holdings.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{h.name}</div>
                <div className="text-xs text-neutral-400">
                  {assetClassLabel(h.assetClass)}
                  {h.platform && ` · ${h.platform}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {formatPaise(h.currentValuePaise)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(h)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                    aria-label="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EntityForm
        open={open}
        onOpenChange={setOpen}
        title={editingId ? 'Edit holding' : 'Add holding'}
        onSubmit={handleSubmit}
      >
        <TextInput label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required placeholder="e.g. UTI Nifty 50 Index Fund" />
        <Select
          label="Asset class"
          value={draft.assetClass}
          onChange={(v) => setDraft({ ...draft, assetClass: v as AssetClass })}
          options={ASSET_CLASSES}
        />
        <TextInput label="Platform" value={draft.platform} onChange={(v) => setDraft({ ...draft, platform: v })} placeholder="e.g. Zerodha, Groww" />
        <MoneyInput
          label="Current value"
          valueRupees={draft.currentValueRupees}
          onChange={(v) => setDraft({ ...draft, currentValueRupees: v })}
          required
        />
        <TextInput label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
      </EntityForm>
    </div>
  )
}
