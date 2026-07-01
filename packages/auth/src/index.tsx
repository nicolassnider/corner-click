import { type Auth, onAuthStateChanged, type User } from 'firebase/auth'
import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  user: User | null
  loading: boolean
  auth: Auth
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
  auth: Auth
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function AuthProvider({ children, auth, fetchWithAuth }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [auth])

  return (
    <AuthContext.Provider value={{ user, loading, auth, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export { default as LoginForm } from './LoginForm'
