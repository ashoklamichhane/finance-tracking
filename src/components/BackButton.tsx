import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function BackButton({ to = '/' }: { to?: string }) {
  return (
    <Link
      to={to}
      aria-label="Back"
      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-ink/8 bg-surface text-ink"
    >
      <ChevronLeft size={20} strokeWidth={2.4} />
    </Link>
  )
}
