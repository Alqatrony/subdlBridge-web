// useUserPrefs.ts
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from './useAuth'

interface Prefs { lang?: string; apiKey?: string }

export function useUserPrefs() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<Prefs>({})
  useEffect(() => {
    if (!user) return setPrefs({})
    getDoc(doc(db, 'users', user.uid, 'settings', 'prefs'))
      .then(snap => setPrefs(snap.exists() ? snap.data() as Prefs : {}))
      .catch(() => setPrefs({}))
  }, [user])
  return prefs
}