interface MoneyInputProps {
  label: string
  valueRupees: number
  onChange: (rupees: number) => void
  required?: boolean
}

export function MoneyInput({ label, valueRupees, onChange, required }: MoneyInputProps) {
  return (
    <label className="block text-[13px] font-semibold text-ink/70">
      {label}
      <div className="mt-1.5 flex items-center rounded-xl border border-ink/14 bg-white px-3 focus-within:ring-2 focus-within:ring-accent">
        <span className="text-ink/40">₹</span>
        <input
          type="number"
          inputMode="decimal"
          required={required}
          value={Number.isFinite(valueRupees) ? valueRupees : ''}
          // NaN is used as the temporary empty state so a user can clear the
          // initial zero while typing; the money conversion normalizes it on save.
          onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
          className="w-full bg-transparent px-2 py-2.5 text-[15px] font-normal text-ink outline-none tabular-nums"
          placeholder="0"
        />
      </div>
    </label>
  )
}
