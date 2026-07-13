import { useRef } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import type { Holding, Goal, Loan, SavingsPlan, Contribution } from '@/db/db'
import { getCollectionOnce, putDoc } from '@/db/firestore'
import { useAuthUser } from '@/lib/AuthContext'
import { signOutUser } from '@/lib/auth'

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await importBackup(user!.uid, file)
    e.target.value = ''
    alert('Backup imported.')
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <SettingsIcon size={16} strokeWidth={2.25} />
        </span>
        Settings
      </h1>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 font-semibold text-neutral-800 dark:text-neutral-200">Account</h2>
        <div className="mb-3 flex items-center gap-3">
          {user.photoURL && <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full" />}
          <div className="text-sm">
            <div className="font-medium text-neutral-800 dark:text-neutral-200">{user.displayName}</div>
            <div className="text-neutral-400">{user.email}</div>
          </div>
        </div>
        <p className="mb-3 text-sm text-neutral-400">
          Your data syncs automatically across every device signed in to this account.
        </p>
        <button
          onClick={() => signOutUser()}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Sign out
        </button>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-1 font-semibold text-neutral-800 dark:text-neutral-200">Backup & restore</h2>
        <p className="mb-3 text-sm text-neutral-400">
          A manual point-in-time export/import, independent of the automatic sync above.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => exportBackup(user.uid)}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Export backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Import backup
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChange} />
        </div>
      </section>
    </div>
  )
}
