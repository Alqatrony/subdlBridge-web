// Home.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import SearchBar from '../components/SearchBar'
import SubtitleCard from '../components/SubtitleCard'
import type { SubtitleResult } from '../services/subdl'
import { searchSubDL } from '../services/subdl'
import { useAuth } from '../hooks/useAuth'
import { useSubList } from '../hooks/useSubList'
import { db } from '../services/firebase'
import { collection, addDoc } from 'firebase/firestore'

export default function Home() {
  const [results, setResults] = useState<SubtitleResult[]>([])
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalItems: 0
  })
  const [searchParams, setSearchParams] = useState<Record<string, string | number> | null>(null)
  const { user } = useAuth()
  const subList = useSubList() // Get the current user's subtitle list
  const observerTarget = useRef<HTMLDivElement>(null)

  const addSub = async (s: SubtitleResult) => {
    if (!user) { alert('Login first'); return }
    
    setIsAdding(s.url)
    try {
      await addDoc(collection(db, 'users', user.uid, 'subs'), {
        url: s.url, 
        lang: s.lang, 
        title: s.name || s.release_name || `Subtitle ${s.subtitle_id || s.sd_id || ''}`,
        addedAt: Date.now()
      })
      // Add to the list of added subtitles
    } catch (error) {
      console.error('Error adding subtitle:', error)
    } finally {
      setIsAdding(null)
    }
  }

  const performSearch = async (params: Record<string, string | number>, resetResults = true) => {
    setLoading(true)
    setError('')
    
    try {
      console.log('Searching with params:', params)
      const response = await searchSubDL(params)
      console.log('Got response:', response)
      
      // Process the subtitles to add download links and extract IDs
      const processedSubs = (response.subtitles || []).map(s => {
        const match = s.url.match(/subtitle\/(\d+)-(\d+)\.zip/)
        return {
          ...s,
          download_link: `https://dl.subdl.com${s.url}`,
          sd_id: match ? Number(match[1]) : undefined,
          subtitle_id: match ? Number(match[2]) : undefined,
        } as SubtitleResult
      })
      
      // Update results (either replace or append based on resetResults flag)
      setResults(prev => resetResults ? processedSubs : [...prev, ...processedSubs])
      
      // Update pagination information
      setPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalItems: response.total || 0
      })
      
      // Store search parameters for "Load More" functionality
      setSearchParams(params)
      
    } catch (err) {
      setError((err as Error).message)
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (params: Record<string, string | number>) => {
    // Start a new search with page 1
    performSearch({ ...params, page: 1 }, true)
  }

  const loadMore = useCallback(() => {
    if (!searchParams || loading || pagination.currentPage >= pagination.totalPages) {
      console.log('Skipping loadMore:', { 
        noSearchParams: !searchParams, 
        isLoading: loading, 
        currentPage: pagination.currentPage, 
        totalPages: pagination.totalPages 
      })
      return
    }
    
    console.log('Loading next page:', pagination.currentPage + 1)
    // Load the next page of results
    performSearch({
      ...searchParams,
      page: pagination.currentPage + 1
    }, false)
  }, [searchParams, loading, pagination.currentPage, pagination.totalPages])

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!observerTarget.current) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        console.log('Intersection observed:', entry.isIntersecting)
        if (entry.isIntersecting && !loading && pagination.currentPage < pagination.totalPages) {
          loadMore()
        }
      },
      {
        root: null, // viewport
        rootMargin: '400px', // Load more when within 400px of the bottom
        threshold: 0.1 // Trigger when at least 10% visible
      }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      console.log('Setting up observer on element:', currentTarget)
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [loadMore, loading, pagination])

  // Determine if there are more results to load
  const hasMoreResults = pagination.currentPage < pagination.totalPages

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white mb-4 text-center">
            Find Your Perfect Subtitle
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-center">
            Search our extensive database for subtitles in multiple languages
          </p>
        </div>

        {/* Search Card */}
        <div className="w-full max-w-3xl mx-auto mb-12">
          <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
              <h2 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
                Search SubDL Subtitles
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter a movie title, SubDL ID, or file name to find matching subtitles
              </p>
              <SearchBar onSearch={handleSearch} loading={loading} />
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full max-w-3xl mx-auto mb-6">
            <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
              {error}
            </div>
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 ? (
          <div className="w-full max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
                Search Results
              </h2>
              <span className="px-2.5 py-0.5 bg-gray-200 text-gray-800 text-xs font-medium rounded-full dark:bg-gray-700 dark:text-gray-300">
                {results.length} of {pagination.totalItems || 'many'} found
              </span>
            </div>
            
            <div className="space-y-4">
              {results.map((r, idx) => (
                <SubtitleCard
                   key={`${r.url}-${idx}`}
                   subtitle={r}
                   onAdd={() => addSub(r)}
                   alreadyAdded={isAdding === r.url || subList[r.url] === true}
                />
              ))}
            </div>
            
            {/* Pagination status indicator */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
              {loading ? 'Loading...' : (
                hasMoreResults ? 
                  `Showing ${results.length} of ${pagination.totalItems} results (Page ${pagination.currentPage} of ${pagination.totalPages})` : 
                  'All results loaded'
              )}
            </div>
            
            {/* Infinite scroll observer element - only render if more results exist */}
            {hasMoreResults && (
              <div 
                ref={observerTarget} 
                className="py-8 flex justify-center"
                style={{ minHeight: '100px' }}
              >
                {loading && (
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-t-4 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Loading more results...</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Fallback load more button */}
            {hasMoreResults && !loading && (
              <div className="mt-4 mb-8 flex justify-center">
                <button
                  onClick={loadMore}
                  className="bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center text-white dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                >
                  Load more results
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto">
            <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 dark:bg-gray-800 dark:border-gray-700 p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No results yet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Use the search above to find subtitles for your favorite movies and TV shows
              </p>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="w-full py-4 mt-auto bg-white border-t dark:bg-gray-800 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            2025 subdlBridge - Find and download subtitles easily
          </p>
        </div>
      </footer>
    </div>
  )
}