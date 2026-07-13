import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

const provider = new GoogleAuthProvider()

// Redirect-based flow (not popup) — popups are unreliable on mobile browsers,
// and Google blocks sign-in entirely inside embedded/in-app browsers (e.g. a
// link opened from within Messages or Instagram) regardless of flow.
export function signIn(): Promise<void> {
  return signInWithRedirect(auth, provider)
}

// Call once on app load to surface errors from a just-completed redirect.
// A successful sign-in is already picked up by onAuthStateChanged below.
export function checkRedirectResult(): Promise<User | null> {
  return getRedirectResult(auth).then((cred) => cred?.user ?? null)
}

export function signOutUser(): Promise<void> {
  return signOut(auth)
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}
