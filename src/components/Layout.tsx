import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Target, PieChart, Landmark, PiggyBank, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true, tint: 'text-accent' },
  { to: '/goals', label: 'Goals', icon: Target, tint: 'text-violet-500 dark:text-violet-400' },
  { to: '/portfolio', label: 'Portfolio', icon: PieChart, tint: 'text-blue-500 dark:text-blue-400' },
  { to: '/loans', label: 'Loans', icon: Landmark, tint: 'text-orange-500 dark:text-orange-400' },
  { to: '/savings', label: 'Savings', icon: PiggyBank, tint: 'text-teal-500 dark:text-teal-400' },
  { to: '/settings', label: 'Settings', icon: Settings, tint: 'text-neutral-500 dark:text-neutral-400' },
]

export function Layout() {
  return (
    <div className="min-h-svh bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-30 hidden border-b border-neutral-200/80 bg-white/80 backdrop-blur-md sm:block dark:border-neutral-800/80 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-4xl items-center gap-1 px-4 py-3">
          <span className="mr-4 text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Savings
          </span>
          <nav className="flex gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end, tint }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? cn('bg-neutral-100 dark:bg-neutral-900', tint)
                      : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900',
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-28 pt-5 sm:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-neutral-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden dark:border-neutral-800/80 dark:bg-neutral-950/95">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, tint }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-col items-center justify-center gap-1 py-2.5"
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                    isActive ? cn('bg-neutral-100 dark:bg-neutral-900', tint) : 'text-neutral-400',
                  )}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.25 : 2} />
                </span>
                <span className={cn('text-[11px] font-medium', isActive ? tint : 'text-neutral-400')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
