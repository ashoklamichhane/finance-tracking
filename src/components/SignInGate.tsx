import { useState, type ReactNode } from 'react'
import { signIn } from '@/lib/auth'
import { useAuthUser } from '@/lib/AuthContext'

export function SignInGate({ children }: { children: ReactNode }) {
  const user = useAuthUser()
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  if (user === undefined) {
    return <div className="flex min-h-svh items-center justify-center text-neutral-400">Loading…</div>
  }

  if (user === null) {
    async function handleSignIn() {
      setError(null)
      setSigningIn(true)
      try {
        await signIn()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSigningIn(false)
      }
    }

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-neutral-50 px-4 dark:bg-neutral-950">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Savings & Portfolio</h1>
        <p className="max-w-xs text-center text-sm text-neutral-500">
          Sign in with Google to sync your goals, portfolio, and loans across devices.
        </p>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  return <>{children}</>
}
