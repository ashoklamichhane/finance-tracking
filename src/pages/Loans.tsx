import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { type Loan } from '@/db/db'
import { useFirestoreCollection, putDoc, patchDoc, removeDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { StatTile } from '@/components/StatTile'
import { newId } from '@/lib/id'
import { paiseToRupees, rupeesToPaise, formatPaise, formatCompactPaise } from '@/lib/money'
import { totalOutstandingLoansPaise, totalEmiPaise } from '@/lib/calc'

interface DraftLoan {
  name: string
  lender: string
  outstandingRupees: number
  interestRate: number
  emiAmountRupees: number
  notes: string
}

const EMPTY_DRAFT: DraftLoan = {
  name: '',
  lender: '',
  outstandingRupees: 0,
  interestRate: 0,
  emiAmountRupees: 0,
  notes: '',
}

export function Loans() {
  const user = useAuthUser()
  const uid = user?.uid
  const loans = useFirestoreCollection<Loan>(uid, 'loans')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftLoan>(EMPTY_DRAFT)

  function openNew() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setOpen(true)
  }

  function openEdit(loan: Loan) {
    setEditingId(loan.id)
    setDraft({
      name: loan.name,
      lender: loan.lender,
      outstandingRupees: paiseToRupees(loan.outstandingPaise),
      interestRate: loan.interestRate,
      emiAmountRupees: paiseToRupees(loan.emiAmountPaise),
      notes: loan.notes,
    })
    setOpen(true)
  }

  async function handleSubmit() {
    const now = Date.now()
    if (editingId) {
      await patchDoc(uid!, 'loans', editingId, {
        name: draft.name,
        lender: draft.lender,
        outstandingPaise: rupeesToPaise(draft.outstandingRupees),
        interestRate: draft.interestRate,
        emiAmountPaise: rupeesToPaise(draft.emiAmountRupees),
        notes: draft.notes,
        updatedAt: now,
      })
    } else {
      await putDoc<Loan>(uid!, 'loans', {
        id: newId(),
        name: draft.name,
        lender: draft.lender,
        outstandingPaise: rupeesToPaise(draft.outstandingRupees),
        interestRate: draft.interestRate,
        emiAmountPaise: rupeesToPaise(draft.emiAmountRupees),
        notes: draft.notes,
        updatedAt: now,
      })
    }
    setOpen(false)
  }

  async function handleDelete(id: string) {
    await removeDoc(uid!, 'loans', id)
  }

  if (!uid || !loans) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Loans</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add loan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total outstanding" value={formatCompactPaise(totalOutstandingLoansPaise(loans))} tone={loans.length > 0 ? 'negative' : 'default'} />
        <StatTile label="Total EMI / month" value={formatCompactPaise(totalEmiPaise(loans))} />
      </div>

      {loans.length === 0 ? (
        <p className="text-sm text-neutral-400">No loans. Add one if you have debt to track.</p>
      ) : (
        <ul className="space-y-2">
          {loans.map((loan) => (
            <li
              key={loan.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{loan.name}</div>
                <div className="text-xs text-neutral-400">
                  {loan.lender && `${loan.lender} · `}
                  {loan.interestRate}% · EMI {formatPaise(loan.emiAmountPaise)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {formatPaise(loan.outstandingPaise)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(loan)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                    aria-label="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(loan.id)}
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
        title={editingId ? 'Edit loan' : 'Add loan'}
        onSubmit={handleSubmit}
      >
        <TextInput label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required placeholder="e.g. Home loan" />
        <TextInput label="Lender" value={draft.lender} onChange={(v) => setDraft({ ...draft, lender: v })} />
        <MoneyInput
          label="Outstanding balance"
          valueRupees={draft.outstandingRupees}
          onChange={(v) => setDraft({ ...draft, outstandingRupees: v })}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label="EMI amount"
            valueRupees={draft.emiAmountRupees}
            onChange={(v) => setDraft({ ...draft, emiAmountRupees: v })}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">Interest rate (%)</span>
            <input
              type="number"
              step="0.01"
              value={draft.interestRate}
              onChange={(e) => setDraft({ ...draft, interestRate: Number(e.target.value) })}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-accent dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>
        <TextInput label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
      </EntityForm>
    </div>
  )
}
