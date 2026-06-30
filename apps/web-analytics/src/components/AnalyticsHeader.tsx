import { useAuth } from '@corner-click/auth'
import { signOut } from 'firebase/auth'

export default function AnalyticsHeader() {
  const { user, auth } = useAuth()

  const handleHomeClick = () => {
    window.location.search = ''
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      window.location.reload()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : '??'

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Admin'
  const email = user?.email || ''

  return (
    <header className="sticky top-0 z-50 bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl print:hidden">
      <div className="max-w-[95vw] 2xl:max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer group" onClick={handleHomeClick}>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="ml-3 flex flex-col">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-blue-400 transition-colors leading-none">
                CORNER<span className="text-blue-500">CLICK</span>
              </span>
              <span className="text-[9px] font-bold text-gray-500 tracking-widest uppercase group-hover:text-gray-400 transition-colors">
                Public Analytics
              </span>
            </div>
          </div>

          {/* Right: user pill + logout */}
          {user && (
            <div className="flex items-center gap-2">
              {/* User pill */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#0A0F1C] group-hover:scale-105 transition-transform">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col leading-none">
                  <span
                    className="text-sm font-semibold text-gray-200 truncate max-w-[140px]"
                    title={displayName}
                  >
                    {displayName}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate max-w-[140px]" title={email}>
                    {email}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
