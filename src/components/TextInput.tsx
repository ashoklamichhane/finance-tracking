interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'date' | 'number'
  required?: boolean
  placeholder?: string
}

export function TextInput({ label, value, onChange, type = 'text', required, placeholder }: TextInputProps) {
  return (
    <label className="block text-[13px] font-semibold text-ink/70">
      {label}
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block w-full rounded-xl border border-ink/14 bg-app px-3 py-2.5 text-[15px] font-normal text-ink outline-none focus:ring-2 focus:ring-accent"
      />
    </label>
  )
}
