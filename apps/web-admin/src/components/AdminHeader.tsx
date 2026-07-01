import type { User } from 'firebase/auth'
import { signOut } from 'firebase/auth'
import { useState } from 'react'
import { auth } from '../lib/firebase'

interface AdminHeaderProps {
  onHomeClick: () => void
  user: User | null
}

type NavItem = 'dashboard' | 'judges' | 'settings'

export default function AdminHeader({ onHomeClick, user }: AdminHeaderProps) {
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')

  const handleLogout = async () => {
    try {
      await signOut(auth)
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : '??'

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Admin'
  const email = user?.email || ''

  const navItems = [
    {
      id: 'dashboard' as NavItem,
      label: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      id: 'judges' as NavItem,
      label: 'Jueces',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      id: 'settings' as NavItem,
      label: 'Configuración',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ]

  return (
    <header className="sticky top-0 z-50 bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-[95vw] 2xl:max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer group" onClick={onHomeClick}>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Corner Click Logo"
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
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id)
                  if (item.id === 'dashboard') {
                    onHomeClick()
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${
                  activeNav === item.id
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label={item.label}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={item.icon}
                    />
                  </svg>
                  {item.label}
                </div>
              </button>
            ))}
          </nav>

          {/* Right: user pill + logout */}
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
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Cerrar sesión">
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
        </div>
      </div>
    </header>
  )
}
