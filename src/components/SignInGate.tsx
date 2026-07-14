import { useState, type ReactNode } from 'react'
import { Wallet } from 'lucide-react'
import { signIn } from '@/lib/auth'
import { useAuthUser, useAuthError } from '@/lib/AuthContext'
import { useDemoMode } from '@/lib/DemoContext'

export function SignInGate({ children }: { children: ReactNode }) {
  const user = useAuthUser()
  const redirectError = useAuthError()
  const { enabled: demoEnabled, setEnabled: setDemoEnabled } = useDemoMode()
  const [initError, setInitError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  if (demoEnabled) {
    return <>{children}</>
  }

  if (user === undefined) {
    return <div className="flex min-h-svh items-center justify-center bg-app text-ink/40">Loading…</div>
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
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-app px-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-strong text-cream shadow-[0_2px_8px_rgba(191,77,67,0.3)]">
          <Wallet size={28} strokeWidth={2.25} />
        </span>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">Finance</h1>
        <p className="max-w-xs text-center text-sm text-ink/50">
          Sign in with Google to sync your goals, portfolio, and loans across devices.
        </p>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-cream shadow-[0_2px_8px_rgba(217,119,87,0.35)] hover:opacity-90 disabled:opacity-50"
        >
          {signingIn ? 'Redirecting…' : 'Sign in with Google'}
        </button>
        <button onClick={() => setDemoEnabled(true)} className="text-sm font-medium text-ink/40 underline hover:text-ink/60">
          Try it with demo data
        </button>
        {error && (
          <p className="max-w-xs text-center text-sm text-accent-strong">
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
