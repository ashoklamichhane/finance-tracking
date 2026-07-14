import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'finance-demo-mode'

interface DemoState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

const DemoContext = createContext<DemoState>({ enabled: false, setEnabled: () => undefined })

export function DemoProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  function setEnabled(next: boolean) {
    localStorage.setItem(STORAGE_KEY, String(next))
    setEnabledState(next)
  }

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setEnabledState(event.newValue === 'true')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  return <DemoContext.Provider value={{ enabled, setEnabled }}>{children}</DemoContext.Provider>
}

export function useDemoMode(): DemoState {
  return useContext(DemoContext)
}

export function isDemoModeEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}
