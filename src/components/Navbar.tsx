import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
import logo from '../assets/logo.svg'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Active link style
  const activeLinkClass = "text-primary-600 dark:text-primary-500 font-medium"
  const normalLinkClass = "text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-500"

  // Check if a route is active
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Handle click outside of user menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav className="bg-white border-gray-200 px-4 lg:px-6 py-3 dark:bg-gray-800 shadow-md">
      <div className="flex flex-wrap justify-between items-center mx-auto">
        {/* Logo and brand name */}
        <Link to="/" className="flex items-center">
          <img src={logo} className="w-8 h-8 mr-2" alt="subdlBridge Logo" />
          <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">subdlBridge</span>
        </Link>

        {/* Navigation links */}
        <div className="flex items-center lg:order-2">
          {/* User menu dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="flex text-sm bg-gray-200 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="sr-only">Open user menu</span>
              <svg
                className="w-8 h-8 p-1 text-gray-600 dark:text-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 dark:bg-gray-700">
                <Link
                  to="/account"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setShowUserMenu(false)}
                >
                  Account Settings
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setShowUserMenu(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex justify-between items-center w-full lg:flex lg:w-auto lg:order-1 mt-2 lg:mt-0">
          <ul className="flex flex-col font-medium lg:flex-row lg:space-x-8 lg:mt-0">
            <li>
              <Link
                to="/"
                className={`block py-2 pl-3 pr-4 ${isActive('/') ? activeLinkClass : normalLinkClass} lg:p-0`}
              >
                Search
              </Link>
            </li>
            <li>
              <Link
                to="/my-sub-list"
                className={`block py-2 pl-3 pr-4 ${isActive('/my-sub-list') ? activeLinkClass : normalLinkClass} lg:p-0`}
              >
                My Sub List
              </Link>
            </li>
            <li>
              <Link
                to="/how-to-use"
                className={`block py-2 pl-3 pr-4 ${isActive('/how-to-use') ? activeLinkClass : normalLinkClass} lg:p-0`}
              >
                How to Use
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}