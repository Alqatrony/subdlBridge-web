// List.tsx
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { db } from '../services/firebase'
import { collection, onSnapshot, doc, deleteDoc, query, orderBy } from 'firebase/firestore'
import SubtitleCard from '../components/SubtitleCard'

interface SavedSubtitle {
  id: string
  url: string
  lang: string
  title: string
  addedAt: number
}

export default function List() {
  const [subtitles, setSubtitles] = useState<SavedSubtitle[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setSubtitles([])
      setLoading(false)
      return
    }

    setLoading(true)
    const subsRef = query(
      collection(db, 'users', user.uid, 'subs'),
      orderBy('addedAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      subsRef,
      (snapshot) => {
        const subtitleList: SavedSubtitle[] = []
        snapshot.forEach((doc) => {
          subtitleList.push({
            id: doc.id,
            ...doc.data() as Omit<SavedSubtitle, 'id'>
          })
        })
        setSubtitles(subtitleList)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching subtitles:', err)
        setError('Failed to load your subtitles. Please try again later.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  const removeSub = async (id: string) => {
    if (!user) return
    
    setRemoving(id)
    setError('')
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'subs', id))
      // Firestore listener will automatically update the UI
    } catch (err) {
      console.error('Error removing subtitle:', err)
      setError('Failed to remove subtitle. Please try again.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white mb-4 text-center">
            My Sub List
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-center">
            Manage your saved subtitles
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full max-w-3xl mx-auto mb-6">
            <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
              {error}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="w-full max-w-3xl mx-auto">
            <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 dark:bg-gray-800 dark:border-gray-700 p-8 text-center">
              <div className="flex justify-center items-center">
                <svg className="animate-spin h-8 w-8 text-primary-600 dark:text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Loading your subtitles...
              </p>
            </div>
          </div>
        ) : subtitles.length > 0 ? (
          <div className="w-full max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
                Your Saved Subtitles
              </h2>
              <span className="px-2.5 py-0.5 bg-gray-200 text-gray-800 text-xs font-medium rounded-full dark:bg-gray-700 dark:text-gray-300">
                {subtitles.length} subtitles
              </span>
            </div>
            
            <div className="space-y-4">
              {subtitles.map((sub) => {
                // Create a SubtitleResult-compatible object from the saved subtitle
                const subtitleResult = {
                  url: sub.url,
                  lang: sub.lang,
                  name: sub.title,
                  download_link: `https://dl.subdl.com${sub.url}`,
                  // Additional fields might be optional so we don't need to populate everything
                };
                
                return (
                  <div key={sub.id} className="relative">
                    <SubtitleCard 
                      subtitle={subtitleResult} 
                      onAdd={() => {}} // Empty function since we don't need "Add" functionality here
                      alreadyAdded={true} // Always true since it's already in the list
                    />
                    <button 
                      onClick={() => removeSub(sub.id)}
                      disabled={removing === sub.id}
                      className={`${
                        removing === sub.id 
                          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                          : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                      } text-white focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:focus:ring-red-800 absolute top-4 right-4`}
                    >
                      {removing === sub.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto">
            <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 dark:bg-gray-800 dark:border-gray-700 p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No saved subtitles
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Start searching and adding subtitles to your list from the home page
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