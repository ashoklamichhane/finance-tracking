import { useRef } from 'react'
import type { Holding, Goal, Loan, SavingsPlan, Contribution } from '@/db/db'
import { getCollectionOnce, putDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { signOutUser } from '@/lib/auth'
import { BackButton } from '@/components/BackButton'

async function exportBackup(uid: string) {
  const data = {
    holdings: await getCollectionOnce<Holding>(uid, 'holdings'),
    goals: await getCollectionOnce<Goal>(uid, 'goals'),
    loans: await getCollectionOnce<Loan>(uid, 'loans'),
    savingsPlan: await getCollectionOnce<SavingsPlan>(uid, 'savingsPlan'),
    contributions: await getCollectionOnce<Contribution>(uid, 'contributions'),
    exportedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `savings-app-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function importBackup(uid: string, file: File) {
  const text = await file.text()
  const data = JSON.parse(text)
  const writes: Promise<void>[] = []
  for (const h of data.holdings ?? []) writes.push(putDoc<Holding>(uid, 'holdings', h))
  for (const g of data.goals ?? []) writes.push(putDoc<Goal>(uid, 'goals', g))
  for (const l of data.loans ?? []) writes.push(putDoc<Loan>(uid, 'loans', l))
  for (const p of data.savingsPlan ?? []) writes.push(putDoc<SavingsPlan>(uid, 'savingsPlan', p))
  for (const c of data.contributions ?? []) writes.push(putDoc<Contribution>(uid, 'contributions', c))
  await Promise.all(writes)
}

export function Settings() {
  const user = useAuthUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const initial = (user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await importBackup(user!.uid, file)
    e.target.value = ''
    alert('Backup imported.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Settings</h1>
      </div>

      <div className="rounded-[22px] border border-ink/7 bg-surface p-[18px] shadow-sm shadow-ink/5">
        <div className="mb-3.5 flex items-center gap-3">
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-strong text-[17px] font-bold text-cream">
            {user.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : initial}
          </span>
          <div>
            <div className="text-[15px] font-semibold text-ink">{user.displayName}</div>
            <div className="text-[12.5px] text-ink/40">{user.email}</div>
          </div>
        </div>
        <p className="mb-3.5 text-[13px] leading-relaxed text-ink/50">
          Your data syncs automatically across every device signed in to this account.
        </p>
        <button
          onClick={() => signOutUser()}
          className="rounded-xl bg-ink/6 px-4 py-2.5 text-[13.5px] font-semibold text-ink/70 hover:bg-ink/10"
        >
          Sign Out
        </button>

        <div className="my-[18px] -mx-[18px] h-px bg-ink/8" />

        <div className="mb-1 text-[15px] font-semibold text-ink">Backup &amp; Restore</div>
        <p className="mb-3 text-[13px] leading-relaxed text-ink/50">
          A manual point-in-time export/import, independent of automatic sync.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => exportBackup(user.uid)}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-cream hover:opacity-90"
          >
            Export Backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-ink/6 px-4 py-2.5 text-[13.5px] font-semibold text-ink/70 hover:bg-ink/10"
          >
            Import Backup
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChange} />
        </div>
      </div>
    </div>
  )
}
