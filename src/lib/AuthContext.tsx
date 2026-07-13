import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { watchAuthState } from '@/lib/auth'

// undefined = auth state not yet resolved, null = signed out, User = signed in.
const AuthContext = createContext<User | null | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => watchAuthState(setUser), [])

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}

export function useAuthUser(): User | null | undefined {
  return useContext(AuthContext)
}
