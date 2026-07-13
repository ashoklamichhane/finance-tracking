interface MoneyInputProps {
  label: string
  valueRupees: number
  onChange: (rupees: number) => void
  required?: boolean
}

export function MoneyInput({ label, valueRupees, onChange, required }: MoneyInputProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <div className="flex items-center rounded-lg border border-neutral-300 bg-white px-3 focus-within:ring-2 focus-within:ring-accent dark:border-neutral-700 dark:bg-neutral-900">
        <span className="text-neutral-400">₹</span>
        <input
          type="number"
          inputMode="decimal"
          required={required}
          value={Number.isFinite(valueRupees) ? valueRupees : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full bg-transparent px-2 py-2 outline-none tabular-nums"
          placeholder="0"
        />
      </div>
    </label>
  )
}
