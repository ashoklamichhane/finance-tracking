import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

const provider = new GoogleAuthProvider()
// Force the account chooser every time — otherwise Google silently reuses
// whichever account is already logged into the browser, even after signOut()
// (signOut only clears Firebase's session, not Google's).
provider.setCustomParameters({ prompt: 'select_account' })

function isInstalledWebApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// An installed iOS web app has storage isolated from Safari. A redirect can
// therefore complete in Safari but return to the installed app without the
// Firebase credential. Keep the OAuth window attached to the installed app
// instead; regular browser sessions continue to use the mobile-friendly
// redirect flow.
//
// Localhost has the same class of problem: the redirect round-trips through
// the authDomain (a different origin), and browsers increasingly partition
// storage across that hop, so getRedirectResult() comes back empty and the
// sign-in silently no-ops. Popup avoids the cross-origin storage handoff, so
// use it for local dev regardless of install state.
export function signIn(): Promise<void> {
  if (isInstalledWebApp() || import.meta.env.DEV) {
    return signInWithPopup(auth, provider).then(() => undefined)
  }

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
