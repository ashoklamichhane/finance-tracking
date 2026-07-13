import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  setDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy as fsOrderBy,
  type Query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type CollectionName = 'holdings' | 'goals' | 'loans' | 'savingsPlan' | 'contributions'

function userCollection(uid: string, name: CollectionName) {
  return collection(db, 'users', uid, name)
}

export async function putDoc<T extends { id: string }>(uid: string, name: CollectionName, item: T): Promise<void> {
  await setDoc(doc(db, 'users', uid, name, item.id), item)
}

export async function patchDoc(
  uid: string,
  name: CollectionName,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await fsUpdateDoc(doc(db, 'users', uid, name, id), patch)
}

export async function removeDoc(uid: string, name: CollectionName, id: string): Promise<void> {
  await fsDeleteDoc(doc(db, 'users', uid, name, id))
}

// Reactive collection query — mirrors dexie-react-hooks' useLiveQuery ergonomics.
// Returns undefined while loading/signed-out, then keeps the array live via onSnapshot.
export function useFirestoreCollection<T>(
  uid: string | null | undefined,
  name: CollectionName,
  orderByField?: string,
): T[] | undefined {
  const [data, setData] = useState<T[] | undefined>(undefined)

  useEffect(() => {
    if (!uid) {
      setData(undefined)
      return
    }
    const base = userCollection(uid, name)
    const q: Query = orderByField ? query(base, fsOrderBy(orderByField)) : query(base)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map((d) => d.data() as T))
    })
    return unsubscribe
  }, [uid, name, orderByField])

  return data
}

// Reactive single-document query, for the one-record savingsPlan doc (id: 'main').
export function useFirestoreDoc<T>(uid: string | null | undefined, name: CollectionName, id: string): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined)

  useEffect(() => {
    if (!uid) {
      setData(undefined)
      return
    }
    const ref = doc(db, 'users', uid, name, id)
    const unsubscribe = onSnapshot(ref, (snap) => {
      setData(snap.exists() ? (snap.data() as T) : undefined)
    })
    return unsubscribe
  }, [uid, name, id])

  return data
}

export async function getDocOnce<T>(uid: string, name: CollectionName, id: string): Promise<T | undefined> {
  const snap = await getDoc(doc(db, 'users', uid, name, id))
  return snap.exists() ? (snap.data() as T) : undefined
}

export async function getCollectionOnce<T>(uid: string, name: CollectionName): Promise<T[]> {
  const snap = await getDocs(userCollection(uid, name))
  return snap.docs.map((d) => d.data() as T)
}
