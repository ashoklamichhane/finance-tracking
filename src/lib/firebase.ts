import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// Firebase web config values are public identifiers, not secrets — safe to commit.
// Access control is enforced by Firestore Security Rules, not by hiding this config.
const firebaseConfig = {
  projectId: 'ashok-finance-tracking',
  appId: '1:992944875893:web:61514d047a52345ae5cb3c',
  storageBucket: 'ashok-finance-tracking.firebasestorage.app',
  apiKey: 'AIzaSyDxTHE5cg-_4B3ckjEaWGKI3bjCYiP_Y5M',
  authDomain: 'ashok-finance-tracking.firebaseapp.com',
  messagingSenderId: '992944875893',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Persistent local cache (IndexedDB-backed) gives the same offline-first
// behavior Dexie provided, but with real server sync built in.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
