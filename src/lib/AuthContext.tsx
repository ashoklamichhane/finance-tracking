import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { watchAuthState, checkRedirectResult } from '@/lib/auth'

interface AuthState {
  user: User | null | undefined
  error: string | null
}

// undefined = auth state not yet resolved, null = signed out, User = signed in.
const AuthContext = createContext<AuthState>({ user: undefined, error: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkRedirectResult().catch((err) => setError(err instanceof Error ? err.message : String(err)))
    return watchAuthState(setUser)
  }, [])

  return <AuthContext.Provider value={{ user, error }}>{children}</AuthContext.Provider>
}

export function useAuthUser(): User | null | undefined {
  return useContext(AuthContext).user
}

export function useAuthError(): string | null {
  return useContext(AuthContext).error
}
