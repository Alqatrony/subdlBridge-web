// SearchBar.tsx
import { useState, useEffect } from 'react'
import { useUserPrefs } from '../hooks/useUserPrefs'
interface Props { 
  onSearch: (params: Record<string, string | number>) => void 
  loading?: boolean
}

export default function SearchBar({ onSearch, loading = false }: Props) {
  const { lang: defaultLang, apiKey } = useUserPrefs()

  const [query, setQuery] = useState('')
  const [mode, setMode]  = useState<'title' | 'sd_id' | 'file_name'>('title')
  const [lang, setLang]  = useState(defaultLang || 'en')
  const [error, setError] = useState('')

  useEffect(() => {
    if (defaultLang) {
      setLang(defaultLang)
    }
  }, [defaultLang])

  const LANGS = ['en','ar','fr','es','de','it','pt','ru','ja','zh']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    try {
      const p: Record<string, string | number> = {
        languages: lang.toUpperCase(),
        api_key: apiKey || ''
      }
      if (mode==='title')      p.film_name = query.trim()
      if (mode==='sd_id')      p.sd_id     = query.trim()
      if (mode==='file_name')  p.file_name = query.trim()
      onSearch(p)
    } catch (err) {
      setError((err as Error).message)
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
            Search {mode === 'title' ? 'by Title' : mode === 'sd_id' ? 'by SubDL ID' : 'by File Name'}
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              id="search-query"
              type="text" 
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={mode === 'title' ? "Enter movie title..." : mode === 'sd_id' ? "Enter SubDL ID..." : "Enter file name..."}
              required
            />
            
            <button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="w-full md:w-auto text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2">
            <label htmlFor="search-mode" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Search Mode
            </label>
            <select 
              id="search-mode"
              value={mode} 
              onChange={e => setMode(e.target.value as 'title' | 'sd_id' | 'file_name')} 
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            >
              <option value="title">Movie Title</option>
              <option value="sd_id">SubDL ID</option>
              <option value="file_name">File Name</option>
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
    </div>
  )
}