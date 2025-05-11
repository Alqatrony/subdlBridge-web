// src/hooks/useSubList.ts
import { useEffect, useState } from 'react'
import { db } from '../services/firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { useAuth } from './useAuth'

export function useSubList() {
  const { user } = useAuth()
  const [list, setList] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user) return setList({})
    const ref = collection(db, 'users', user.uid, 'subs')
    const unsub = onSnapshot(ref, snap => {
      const map: Record<string, boolean> = {}
      snap.forEach(doc => { map[doc.data().url as string] = true })
      setList(map)
    })
    return () => unsub()
  }, [user])

  return list
}