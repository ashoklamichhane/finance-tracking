import { NavLink, Outlet } from 'react-router-dom'
import { Home, Target, PieChart, Landmark, PiggyBank, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAB_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/savings', label: 'Savings', icon: PiggyBank },
]

const DESKTOP_ITEMS = [
  ...TAB_ITEMS,
  { to: '/portfolio', label: 'Portfolio', icon: PieChart },
  { to: '/loans', label: 'Loans', icon: Landmark },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Layout() {
  return (
    <div className="min-h-svh bg-app">
      <header className="sticky top-0 z-30 hidden border-b border-ink/7 bg-surface/90 backdrop-blur-md sm:block">
        <div className="mx-auto flex max-w-4xl items-center gap-1 px-4 py-3">
          <span className="mr-4 font-serif text-lg font-semibold tracking-tight text-ink">Finance</span>
          <nav className="flex gap-1">
            {DESKTOP_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent/12 text-accent' : 'text-ink/50 hover:bg-ink/6',
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

      <main className="mx-auto max-w-4xl px-4 pb-32 pt-5 sm:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:hidden">
        <div className="flex gap-1 rounded-full border border-ink/8 bg-surface/85 p-1.5 shadow-lg shadow-ink/15 backdrop-blur-xl">
          {TAB_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="flex flex-col items-center gap-0.5 rounded-full px-5 py-2">
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', isActive && 'bg-accent/14')}>
                    <Icon size={22} className={isActive ? 'text-accent' : 'text-ink/40'} strokeWidth={isActive ? 2.25 : 2} />
                  </span>
                  <span className={cn('text-[10.5px] font-semibold', isActive ? 'text-accent' : 'text-ink/40')}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
