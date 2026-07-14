import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { type Holding, ASSET_CLASSES, type AssetClass } from '@/db/db'
import { useFirestoreCollection, putDoc, patchDoc, removeDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { Select } from '@/components/Select'
import { BackButton } from '@/components/BackButton'
import { AllocationPaletteVars, toDisplaySlices } from '@/components/AllocationBar'
import { newId } from '@/lib/id'
import { paiseToRupees, rupeesToPaise, formatPaise } from '@/lib/money'
import { allocationByAssetClass, totalPortfolioPaise } from '@/lib/calc'
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
  const user = useAuthUser()
  const uid = user?.uid
  const holdings = useFirestoreCollection<Holding>(uid, 'holdings')
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
      await patchDoc(uid!, 'holdings', editingId, {
        name: draft.name,
        assetClass: draft.assetClass,
        platform: draft.platform,
        currentValuePaise: rupeesToPaise(draft.currentValueRupees),
        notes: draft.notes,
        updatedAt: now,
      })
    } else {
      await putDoc<Holding>(uid!, 'holdings', {
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
    await removeDoc(uid!, 'holdings', id)
  }

  if (!holdings) return null

  const allocation = toDisplaySlices(allocationByAssetClass(holdings))
  const total = totalPortfolioPaise(holdings)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Portfolio</h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-full bg-blue px-4 py-2.5 text-[13.5px] font-semibold text-cream shadow-[0_2px_8px_rgba(106,155,204,0.35)] hover:opacity-90"
        >
          <Plus size={14} strokeWidth={2.5} /> Add
        </button>
      </div>

      <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="mb-3.5 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Total Value</span>
          <span className="font-serif text-2xl font-semibold text-ink">{formatCompactPaise(total)}</span>
        </div>
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          {allocation.length === 0 ? (
            <div className="h-full w-full bg-ink/8" />
          ) : (
            allocation.map((slice) => (
              <div
                key={slice.key}
                className="h-full"
                style={{ width: `${slice.pct}%`, backgroundColor: `var(--alloc-${slice.key})` }}
              />
            ))
          )}
        </div>
        {allocation.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-x-3.5 gap-y-2">
            {allocation.map((slice) => (
              <div key={slice.key} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: `var(--alloc-${slice.key})` }}
                />
                <span className="flex-1 truncate text-ink/75">{slice.label}</span>
                <span className="tabular-nums text-ink/40">{slice.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
        {AllocationPaletteVars}
      </div>

      {holdings.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink/35">No holdings yet. Add your first one.</p>
      ) : (
        <ul className="space-y-2">
          {holdings.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between rounded-[18px] border border-ink/7 bg-surface py-[13px] px-[15px] shadow-sm shadow-ink/5"
            >
              <div>
                <div className="text-[14.5px] font-semibold text-ink">{h.name}</div>
                <div className="mt-px text-[11.5px] text-ink/40">
                  {assetClassLabel(h.assetClass)}
                  {h.platform && ` · ${h.platform}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-sm font-semibold text-ink/80">{formatPaise(h.currentValuePaise)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(h)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/5 text-ink/50 hover:bg-ink/10"
                    aria-label="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-strong/9 text-accent-strong hover:bg-accent-strong/15"
                    aria-label="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EntityForm open={open} onOpenChange={setOpen} title={editingId ? 'Edit Holding' : 'Add Holding'} onSubmit={handleSubmit} submitLabel="Save Holding" accent="blue">
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
