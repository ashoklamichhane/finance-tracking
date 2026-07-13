import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const provider = new GoogleAuthProvider()

export function signIn(): Promise<User> {
  return signInWithPopup(auth, provider).then((cred) => cred.user)
}

export function signOutUser(): Promise<void> {
  return signOut(auth)
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}
