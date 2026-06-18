// SearchBar.tsx
import { useState, useEffect } from 'react'
import { useUserPrefs } from '../hooks/useUserPrefs'
import { useSearchHistory } from '../hooks/useSearchHistory'
import { searchTmdb, type TmdbMatch } from '../services/tmdb'
interface Props { 
  onSearch: (params: Record<string, string | number>) => void 
  loading?: boolean
}

export default function SearchBar({ onSearch, loading = false }: Props) {
  const { lang: defaultLang, apiKey } = useUserPrefs()
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory()

  const [query, setQuery] = useState('')
  const [mode, setMode]  = useState<'title' | 'sd_id'>('title')
  const [lang, setLang]  = useState(defaultLang || 'en')
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)
  const [matches, setMatches] = useState<TmdbMatch[]>([])

  useEffect(() => {
    if (defaultLang) {
      setLang(defaultLang)
    }
  }, [defaultLang])

  const LANGS = ['en','ar','fr','es','de','it','pt','ru','ja','zh']

  const runSubDLSearch = (extra: Record<string, string | number>) => {
    const p: Record<string, string | number> = {
      languages: lang.toUpperCase(),
      api_key: apiKey || '',
      ...extra,
    }
    onSearch(p)
  }

  const pickMatch = (m: TmdbMatch) => {
    setMatches([])
    addToHistory(m)
    runSubDLSearch({ tmdb_id: m.tmdb_id, type: m.type })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    setMatches([])

    if (mode === 'sd_id') {
      runSubDLSearch({ sd_id: query.trim() })
      return
    }

    // Title mode: SubDL's free-text search is now paid-only, so resolve the
    // title to a TMDB id first and search SubDL by tmdb_id (free).
    try {
      setResolving(true)
      const found = await searchTmdb(query.trim())
      if (found.length === 0) {
        setError('No movie or TV show found for that title.')
      } else if (found.length === 1) {
        pickMatch(found[0])
      } else {
        setMatches(found.slice(0, 8))
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="search-query" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Search {mode === 'title' ? 'by Title' : 'by SubDL ID'}
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              id="search-query"
              type="text" 
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={mode === 'title' ? "Enter movie title..." : "Enter SubDL ID..."}
              required
            />
            
            <button 
              type="submit" 
              disabled={loading || resolving || !query.trim()}
              className="w-full md:w-auto text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
            >
              {resolving ? 'Finding title...' : loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {matches.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
            <p className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
              Select the correct title:
            </p>
            {matches.map(m => (
              <button
                key={`${m.type}-${m.tmdb_id}`}
                type="button"
                onClick={() => pickMatch(m)}
                className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {m.poster
                  ? <img src={m.poster} alt="" className="w-8 h-12 object-cover rounded" />
                  : <span className="w-8 h-12 rounded bg-gray-200 dark:bg-gray-600" />}
                <span className="flex-1">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">{m.title}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {m.type === 'movie' ? 'Movie' : 'TV'}{m.year ? ` \u00b7 ${m.year}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2">
            <label htmlFor="search-mode" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Search Mode
            </label>
            <select 
              id="search-mode"
              value={mode} 
              onChange={e => setMode(e.target.value as 'title' | 'sd_id')} 
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            >
              <option value="title">Movie / TV Title</option>
              <option value="sd_id">SubDL ID</option>
            </select>
          </div>
          
          <div className="w-full sm:w-1/2">
            <label htmlFor="search-lang" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Language
            </label>
            <select 
              id="search-lang"
              value={lang} 
              onChange={e => setLang(e.target.value)} 
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            >
              {LANGS.map(c => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Recent searches</h3>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {history.map(m => (
              <div
                key={`${m.type}-${m.tmdb_id}`}
                className="group relative shrink-0 w-28 snap-start"
              >
                <button
                  type="button"
                  onClick={() => pickMatch(m)}
                  className="block w-full text-left rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 bg-white dark:bg-gray-800 transition-colors"
                  title={`${m.title}${m.year ? ` (${m.year})` : ''}`}
                >
                  {m.poster
                    ? <img src={m.poster} alt="" className="w-full h-40 object-cover" />
                    : <span className="flex items-center justify-center w-full h-40 bg-gray-100 dark:bg-gray-700 text-xs text-gray-400">No image</span>}
                  <span className="block p-2">
                    <span className="block text-xs font-medium text-gray-900 dark:text-white truncate">{m.title}</span>
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                      {m.type === 'movie' ? 'Movie' : 'TV'}{m.year ? ` \u00b7 ${m.year}` : ''}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromHistory(m)}
                  aria-label={`Remove ${m.title} from history`}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white text-sm opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity"
                >
                  {'\u00d7'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}