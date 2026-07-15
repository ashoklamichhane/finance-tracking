import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { type Loan } from '@/db/db'
import { useFirestoreCollection, putDoc, patchDoc, removeDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { EntityForm } from '@/components/EntityForm'
import { MoneyInput } from '@/components/MoneyInput'
import { TextInput } from '@/components/TextInput'
import { BackButton } from '@/components/BackButton'
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

  if (!loans) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Loans</h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2.5 text-[13.5px] font-semibold text-cream shadow-[0_2px_8px_rgba(191,77,67,0.35)] hover:opacity-90"
        >
          <Plus size={14} strokeWidth={2.5} /> Add
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5 rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div>
          <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">Outstanding</div>
          <div className="mt-1.5 font-serif text-[22px] font-semibold text-accent-strong">
            {formatCompactPaise(totalOutstandingLoansPaise(loans))}
          </div>
        </div>
        <div className="border-l border-ink/8 pl-3.5">
          <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/50">EMI / month</div>
          <div className="mt-1.5 font-serif text-[22px] font-semibold text-ink">{formatCompactPaise(totalEmiPaise(loans))}</div>
        </div>
      </div>

      {loans.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink/35">No loans. Add one if you have debt to track.</p>
      ) : (
        <ul className="space-y-2">
          {loans.map((loan) => (
            <li
              key={loan.id}
              className="flex items-center justify-between rounded-[18px] border border-ink/7 bg-surface py-[13px] px-[15px] shadow-sm shadow-ink/5"
            >
              <div>
                <div className="text-[14.5px] font-semibold text-ink">{loan.name}</div>
                <div className="mt-px text-[11.5px] text-ink/40">
                  {loan.lender && `${loan.lender} · `}
                  {loan.interestRate}% · EMI {formatPaise(loan.emiAmountPaise)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-sm font-semibold text-ink/80">{formatPaise(loan.outstandingPaise)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(loan)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/5 text-ink/50 hover:bg-ink/10"
                    aria-label="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(loan.id)}
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

      <EntityForm open={open} onOpenChange={setOpen} title={editingId ? 'Edit Loan' : 'Add Loan'} onSubmit={handleSubmit} submitLabel="Save Loan" accent="accent-strong">
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
          <label className="block text-[13px] font-semibold text-ink/70">
            Interest rate (%)
            <input
              type="number"
              step="0.01"
              value={draft.interestRate}
              onChange={(e) => setDraft({ ...draft, interestRate: Number(e.target.value) })}
              className="mt-1.5 block w-full rounded-xl border border-ink/14 bg-app px-3 py-2.5 text-[15px] font-normal text-ink outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
        </div>
        <TextInput label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
      </EntityForm>
    </div>
  )
}
