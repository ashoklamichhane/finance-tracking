interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}

export function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="block text-[13px] font-semibold text-ink/70">
      {label && <span className="mb-1.5 block">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-ink/14 bg-white px-3 py-2.5 text-[15px] font-normal text-ink outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
