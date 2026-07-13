import { useRef } from 'react'
import { db } from '@/db/db'

async function exportBackup() {
  const data = {
    holdings: await db.holdings.toArray(),
    goals: await db.goals.toArray(),
    loans: await db.loans.toArray(),
    savingsPlan: await db.savingsPlan.toArray(),
    contributions: await db.contributions.toArray(),
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

async function importBackup(file: File) {
  const text = await file.text()
  const data = JSON.parse(text)
  await db.transaction('rw', db.holdings, db.goals, db.loans, db.savingsPlan, db.contributions, async () => {
    if (data.holdings) await db.holdings.bulkPut(data.holdings)
    if (data.goals) await db.goals.bulkPut(data.goals)
    if (data.loans) await db.loans.bulkPut(data.loans)
    if (data.savingsPlan) await db.savingsPlan.bulkPut(data.savingsPlan)
    if (data.contributions) await db.contributions.bulkPut(data.contributions)
  })
}

export function Settings() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await importBackup(file)
    e.target.value = ''
    alert('Backup imported.')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Settings</h1>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-1 font-medium text-neutral-800 dark:text-neutral-200">Backup & restore</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Your data lives only on this device. Export a backup regularly, or before switching devices.
        </p>
        <div className="flex gap-2">
          <button
            onClick={exportBackup}
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

      <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-1 font-medium text-neutral-800 dark:text-neutral-200">Google Drive sync</h2>
        <p className="text-sm text-neutral-400">Coming soon — automatic encrypted sync across your devices.</p>
      </section>

      <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-1 font-medium text-neutral-800 dark:text-neutral-200">Import from Google Sheet</h2>
        <p className="text-sm text-neutral-400">
          Coming soon — one-time import from your existing savings spreadsheet.
        </p>
      </section>
    </div>
  )
}
