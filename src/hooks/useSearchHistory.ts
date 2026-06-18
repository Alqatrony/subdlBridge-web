// useSearchHistory.ts
// Stores the titles the user confirmed from the TMDB picker, so they can be
// re-searched quickly. Persisted per-user in localStorage.
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import type { TmdbMatch } from '../services/tmdb'

const MAX_ITEMS = 15

const sameItem = (a: TmdbMatch, b: TmdbMatch) =>
  a.tmdb_id === b.tmdb_id && a.type === b.type

export function useSearchHistory() {
  const { user } = useAuth()
  const storageKey = `subdl_search_history_${user?.uid ?? 'guest'}`
  const [history, setHistory] = useState<TmdbMatch[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      setHistory(raw ? (JSON.parse(raw) as TmdbMatch[]) : [])
    } catch {
      setHistory([])
    }
  }, [storageKey])

  const save = useCallback((items: TmdbMatch[]) => {
    setHistory(items)
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {
      /* ignore quota / private mode errors */
    }
  }, [storageKey])

  const addToHistory = useCallback((m: TmdbMatch) => {
    setHistory(prev => {
      const next = [m, ...prev.filter(i => !sameItem(i, m))].slice(0, MAX_ITEMS)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [storageKey])

  const removeFromHistory = useCallback((m: TmdbMatch) => {
    setHistory(prev => {
      const next = prev.filter(i => !sameItem(i, m))
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [storageKey])

  const clearHistory = useCallback(() => save([]), [save])

  return { history, addToHistory, removeFromHistory, clearHistory }
}
