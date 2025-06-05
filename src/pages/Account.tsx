// Account.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { updateEmail, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'

interface UserPrefs {
  lang?: string;
  apiKey?: string;
}

interface AuthSettings {
  token: string;
}

export default function Account() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Form states
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [lang, setLang] = useState('en')
  const [apiKey, setApiKey] = useState('')
  const [token, setToken] = useState('')

  // UI states
  const [loading, setLoading] = useState(false)
  const [tokenLoading, setTokenLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [userIdCopied, setUserIdCopied] = useState(false)

  const LANGS = ['en', 'ar', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh']

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return

      setEmail(user.email || '')

      try {
        const prefsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'prefs'))
        if (prefsDoc.exists()) {
          const prefs = prefsDoc.data() as UserPrefs
          if (prefs.lang) setLang(prefs.lang)
          if (prefs.apiKey) setApiKey(prefs.apiKey || '')
        }

        // Load or generate token
        await loadOrGenerateToken()
      } catch (error) {
        console.error('Error loading user preferences:', error)
        setMessage({
          type: 'error',
          text: 'Failed to load your preferences. Please try again later.'
        })
      }
    }

    loadUserData()
  }, [user])

  // Copy token to clipboard
  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(token)
      .then(() => {
        setTokenCopied(true)
        setTimeout(() => setTokenCopied(false), 3000)
      })
      .catch(error => {
        console.error('Error copying token to clipboard:', error)
        setMessage({
          type: 'error',
          text: 'Failed to copy token to clipboard. Please try manually selecting and copying.'
        })
      })
  }

  // Copy user ID to clipboard
  const copyUserIdToClipboard = () => {
    if (!user) return;
    
    navigator.clipboard.writeText(user.uid)
      .then(() => {
        setUserIdCopied(true)
        setTimeout(() => setUserIdCopied(false), 3000)
      })
      .catch(error => {
        console.error('Error copying user ID to clipboard:', error)
        setMessage({
          type: 'error',
          text: 'Failed to copy user ID to clipboard. Please try manually selecting and copying.'
        })
      })
  }

  // Update user preferences
  const updatePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'prefs'), {
        lang,
        apiKey: apiKey.trim() || null
      })

      setMessage({
        type: 'success',
        text: 'Your preferences have been updated successfully!'
      })
    } catch (error) {
      console.error('Error updating preferences:', error)
      setMessage({
        type: 'error',
        text: 'Failed to update preferences. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  // Update email and password
  const updateCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !currentPassword) return

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Re-authenticate user before sensitive operations
      const credential = EmailAuthProvider.credential(
        user.email || '',
        currentPassword
      )

      await reauthenticateWithCredential(user, credential)

      // Update email if changed
      if (email !== user.email && email.trim()) {
        await updateEmail(user, email)
      }

      // Update password if provided
      if (newPassword.trim()) {
        await updatePassword(user, newPassword)
      }

      setCurrentPassword('')
      setNewPassword('')

      setMessage({
        type: 'success',
        text: 'Your account has been updated successfully!'
      })
    } catch (error) {
      console.error('Error updating account:', error)
      setMessage({
        type: 'error',
        text: 'Failed to update account. Please check your current password and try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  // Delete account with all data
  const handleDeleteAccount = async () => {
    if (!user || !currentPassword) return

    setDeleteLoading(true)

    try {
      // Re-authenticate user before deletion
      const credential = EmailAuthProvider.credential(
        user.email || '',
        currentPassword
      )

      await reauthenticateWithCredential(user, credential)

      // Delete user data from Firestore
      await deleteDoc(doc(db, 'users', user.uid, 'settings', 'prefs'))
      await deleteDoc(doc(db, 'users', user.uid, 'settings', 'auth'))

      // Delete user subtitles collection
      // Note: In a production app, you might want to use a Cloud Function
      // to delete the entire collection as client-side deletion is limited

      // Delete the user account
      await deleteUser(user)

      // Redirect to login page
      navigate('/login')
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage({
        type: 'error',
        text: 'Failed to delete account. Please check your password and try again.'
      })
      setDeleteLoading(false)
      setConfirmDelete(false)
    }
  }

  // Updated loadOrGenerateToken function
  // Load or generate token
  const loadOrGenerateToken = async () => {
    if (!user) return

    setTokenLoading(true)

    try {
      const authDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'auth'))

      if (authDoc.exists()) {
        // Token already exists, use it
        const authData = authDoc.data() as AuthSettings
        setToken(authData.token)
      } else {
        // Generate a new token
        const newToken = uuidv4()

        // Use a batch to ensure both operations succeed or fail together
        const batch = writeBatch(db)

        // Save token to user's settings
        batch.set(doc(db, 'users', user.uid, 'settings', 'auth'), {
          token: newToken
        })

        // Create token lookup document
        batch.set(doc(db, 'tokens', newToken), {
          uid: user.uid,
          createdAt: serverTimestamp()
        })

        await batch.commit()
        setToken(newToken)
      }
    } catch (error) {
      console.error('Error loading or generating token:', error)
      setMessage({
        type: 'error',
        text: 'Failed to generate your authentication token. Please try again later.'
      })
    } finally {
      setTokenLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Account Settings
          </h1>

          {/* Alert Messages */}
          {message.text && (
            <div className={`p-4 mb-6 text-sm rounded-lg ${message.type === 'success'
              ? 'text-green-800 bg-green-50 dark:bg-gray-800 dark:text-green-400'
              : 'text-red-800 bg-red-50 dark:bg-gray-800 dark:text-red-400'
              }`} role="alert">
              {message.text}
            </div>
          )}

          {/* API Authentication Token */}
          <div className="w-full bg-white rounded-lg shadow dark:border mb-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                API Authentication Token
              </h2>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                This is your unique authentication token for API access. Keep it secret and secure.
              </p>

              {tokenLoading ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-8 bg-gray-200 rounded dark:bg-gray-700"></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={token}
                      readOnly
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={copyTokenToClipboard}
                    className="inline-flex items-center justify-center text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                  >
                    {tokenCopied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
              )}

              {/* User ID display section */}
              <div className="mt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Your User ID:
                </p>
                {!user ? (
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-8 bg-gray-200 rounded dark:bg-gray-700"></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={user.uid}
                        readOnly
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={copyUserIdToClipboard}
                      className="inline-flex items-center justify-center text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                    >
                      {userIdCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="w-full bg-white rounded-lg shadow dark:border mb-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Account Information
              </h2>

              <form onSubmit={updateCredentials} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="current-password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Current Password (required to update account)
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Account'}
                </button>
              </form>
            </div>
          </div>

          {/* User Preferences */}
          <div className="w-full bg-white rounded-lg shadow dark:border mb-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Subtitle Preferences
              </h2>

              <form onSubmit={updatePreferences} className="space-y-4">
                <div>
                  <label htmlFor="default-lang" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Default Language
                  </label>
                  <select
                    id="default-lang"
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  >
                    {LANGS.map(code => (
                      <option key={code} value={code}>
                        {code.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="api-key" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    SubDL API Key (optional)
                  </label>
                  <input
                    type="text"
                    id="api-key"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="Enter your SubDL API key (if you have one)"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </form>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="w-full bg-white rounded-lg shadow dark:border dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-500">
                Danger Zone
              </h2>

              {!confirmDelete ? (
                <div>
                  <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                    Deleting your account will permanently remove all your data, including saved subtitles.
                    This action cannot be undone.
                  </p>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full md:w-auto text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
                  >
                    Delete Account
                  </button>
                </div>
              ) : (
                <div className="p-4 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-700 dark:border-red-800">
                  <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-3">
                    Confirm Account Deletion
                  </h3>
                  <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                    Please enter your current password to confirm account deletion:
                  </p>
                  <div className="mb-4">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      placeholder="Enter your current password"
                      required
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || !currentPassword}
                      className="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDelete(false)
                        setCurrentPassword('')
                      }}
                      disabled={deleteLoading}
                      className="text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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