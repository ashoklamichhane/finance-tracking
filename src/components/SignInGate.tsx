import { useState, type ReactNode } from 'react'
import { Wallet } from 'lucide-react'
import { signIn } from '@/lib/auth'
import { useAuthUser, useAuthError } from '@/lib/AuthContext'

export function SignInGate({ children }: { children: ReactNode }) {
  const user = useAuthUser()
  const redirectError = useAuthError()
  const [initError, setInitError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  if (user === undefined) {
    return <div className="flex min-h-svh items-center justify-center text-neutral-400">Loading…</div>
  }

  if (user === null) {
    async function handleSignIn() {
      setInitError(null)
      setSigningIn(true)
      try {
        await signIn() // navigates away to Google; only returns early on error
      } catch (err) {
        setInitError(err instanceof Error ? err.message : String(err))
        setSigningIn(false)
      }
    }

    const error = initError ?? redirectError

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-gradient-to-b from-neutral-50 to-white px-4 dark:from-neutral-950 dark:to-neutral-900">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Wallet size={28} strokeWidth={2.25} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Savings & Portfolio</h1>
        <p className="max-w-xs text-center text-sm text-neutral-500">
          Sign in with Google to sync your goals, portfolio, and loans across devices.
        </p>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {signingIn ? 'Redirecting…' : 'Sign in with Google'}
        </button>
        {error && (
          <p className="max-w-xs text-center text-sm text-red-500">
            {error.includes('missing initial state') || error.includes('storage-partitioned')
              ? "Couldn't complete sign-in — if you opened this link inside another app (Messages, Instagram, etc.), open it in Safari directly instead."
              : error}
          </p>
        )}
      </div>
    )
  }

  return <>{children}</>
}
