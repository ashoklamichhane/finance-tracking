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
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-accent dark:border-neutral-700 dark:bg-neutral-900"
      />
    </label>
  )
}
