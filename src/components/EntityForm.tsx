import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const ACCENTS = {
  accent: 'bg-accent',
  blue: 'bg-blue',
  'accent-strong': 'bg-accent-strong',
  sage: 'bg-sage',
} as const

interface EntityFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  onSubmit: () => void
  children: ReactNode
  submitLabel?: string
  accent?: keyof typeof ACCENTS
}

export function EntityForm({
  open,
  onOpenChange,
  title,
  subtitle,
  onSubmit,
  children,
  submitLabel = 'Save',
  accent = 'accent',
}: EntityFormProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85svh] overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-[min(90vw,480px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pb-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <Dialog.Title className="font-serif text-xl font-semibold text-ink">{title}</Dialog.Title>
              {subtitle && <p className="mt-0.5 text-[12.5px] text-ink/45">{subtitle}</p>}
            </div>
            <Dialog.Close className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/7 text-ink/50 hover:bg-ink/12">
              <X size={14} />
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {children}
            <button
              type="submit"
              className={cn(
                'mt-2 w-full rounded-2xl py-3.5 text-center text-[15px] font-semibold text-cream hover:opacity-90',
                ACCENTS[accent],
              )}
            >
              {submitLabel}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
