import { trpc } from '@corner-click/api-client'
import type { Tournament } from '@corner-click/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { auth } from '../lib/firebase'
import { API_URL, wakeUpApi } from '../utils/apiClient'
import AdminHeader from './AdminHeader'
import Footer from './Footer'
import TournamentDetail from './TournamentDetail'
import TournamentForm from './TournamentForm'
import TournamentList from './TournamentList'

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      async headers() {
        const user = auth.currentUser
        const token = user ? await user.getIdToken() : ''
        return {
          authorization: token ? `Bearer ${token}` : '',
        }
      },
    }),
  ],
})

export default function Dashboard() {
  const [view, setView] = useState<'LIST' | 'FORM' | 'DETAIL'>('LIST')
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    wakeUpApi()

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = '/login'
        return
      }
      setUser(u)
      setAuthChecked(true)
    })
    return () => unsub()
  }, [])

  const handleSelect = (t: Tournament) => {
    setSelectedTournament(t)
    setView('DETAIL')
  }

  const handleBackToList = () => {
    setSelectedTournament(null)
    setEditingTournament(null)
    setView('LIST')
  }

  const handleEdit = (t: Tournament) => {
    setEditingTournament(t)
    setView('FORM')
  }

  const handleCreateNew = () => {
    setEditingTournament(null)
    setView('FORM')
  }

  // Show nothing while checking auth to avoid flash of content
  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0A0F1C]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans">
          <Toaster position="top-right" />
          <AdminHeader onHomeClick={handleBackToList} user={user} />

          {/* Main Content Area */}
          <main className="flex-1 pb-12">
            {view === 'LIST' && (
              <TournamentList
                onSelect={handleSelect}
                onCreateNew={handleCreateNew}
                onEdit={handleEdit}
              />
            )}

            {view === 'FORM' && (
              <TournamentForm
                initialData={editingTournament}
                onCancel={handleBackToList}
                onCreated={handleBackToList}
              />
            )}

            {view === 'DETAIL' && selectedTournament && (
              <TournamentDetail tournament={selectedTournament} onBack={handleBackToList} />
            )}
          </main>

          <Footer />
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
