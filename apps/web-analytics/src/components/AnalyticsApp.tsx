import { AuthProvider, LoginForm, useAuth } from '@corner-click/auth'
import { useEffect, useState } from 'react'
import { auth } from '../lib/firebase'
import { getCategories } from '../services/categoryService'
import { API_URL, fetchWithAuth } from '../utils/apiClient'
import AnalyticsFooter from './AnalyticsFooter'
import AnalyticsHeader from './AnalyticsHeader'
import AnalyticsManager from './AnalyticsManager'

function AnalyticsAppContent() {
  const { user, loading } = useAuth()
  const [tournaments, setTournaments] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [loadingCategories, setLoadingCategories] = useState(false)

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const selectedCategoryName = selectedCategory?.name

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId)
  const selectedTournamentName = selectedTournament?.name

  // Load URL params if any
  useEffect(() => {
    if (!user) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const tId = params.get('tournament')
    const cId = params.get('category')
    if (tId) {
      setSelectedTournamentId(tId)
    }
    if (cId) {
      setSelectedCategoryId(cId)
    }

    // Fetch tournaments list from API publicly (since Firestore holds their names)
    fetchWithAuth(`${API_URL}/api/tournaments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const list = data.map((t: any) => ({
            id: t.id,
            name: t.name || 'Torneo Sin Nombre',
          }))
          setTournaments(list)
        }
      })
      .catch((err) => console.error('Failed to load tournaments:', err))
  }, [user])

  // Update URL params when selections change
  useEffect(() => {
    if (!user) {
      return
    }

    const url = new URL(window.location.href)
    if (selectedTournamentId) {
      url.searchParams.set('tournament', selectedTournamentId)
    } else {
      url.searchParams.delete('tournament')
    }

    if (selectedCategoryId) {
      url.searchParams.set('category', selectedCategoryId)
    } else {
      url.searchParams.delete('category')
    }

    window.history.replaceState({}, '', url.toString())
  }, [selectedTournamentId, selectedCategoryId, user])

  // Fetch categories when tournament is selected
  useEffect(() => {
    if (!user) {
      return
    }

    if (selectedTournamentId) {
      setLoadingCategories(true)
      getCategories(selectedTournamentId)
        .then((list) => {
          setCategories(list)
          if (list.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(list[0].id)
          }
          setLoadingCategories(false)
        })
        .catch((err) => {
          console.error(err)
          setLoadingCategories(false)
        })
    } else {
      setCategories([])
      setSelectedCategoryId('')
    }
  }, [selectedTournamentId, user, selectedCategoryId])

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#0A0F1C]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <LoginForm
        title="CORNERCLICK"
        subtitle="Public Analytics"
        onLoginSuccess={() => {
          // reload the page to initialize session state correctly
          window.location.reload()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <AnalyticsHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 space-y-8 print:p-0">
        {/* Selection panel - hidden on print */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:hidden">
          {/* Tournament selection */}
          <div>
            <label
              htmlFor="t-select"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
            >
              Seleccionar Torneo
            </label>
            <select
              id="t-select"
              value={selectedTournamentId}
              onChange={(e) => {
                setSelectedTournamentId(e.target.value)
                setSelectedCategoryId('')
              }}
              className="block w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">-- Elige un torneo --</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category selection */}
          <div>
            <label
              htmlFor="cat-select"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
            >
              Seleccionar Categoría
            </label>
            <select
              id="cat-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={!selectedTournamentId || loadingCategories}
              className="block w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50"
            >
              {loadingCategories ? (
                <option>Cargando categorías...</option>
              ) : selectedTournamentId ? (
                <>
                  <option value="">-- Elige una categoría --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </>
              ) : (
                <option>Selecciona un torneo primero</option>
              )}
            </select>
          </div>
        </div>

        {/* Analytics view */}
        {selectedTournamentId && selectedCategoryId ? (
          <AnalyticsManager
            tournamentId={selectedTournamentId}
            categoryId={selectedCategoryId}
            categoryName={selectedCategoryName}
            tournamentName={selectedTournamentName}
          />
        ) : (
          <div className="bg-slate-100/50 rounded-2xl border border-slate-200 border-dashed p-12 text-center text-slate-400 print:hidden">
            <svg
              aria-hidden="true"
              className="w-12 h-12 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-lg font-bold">Espera de Selección</p>
            <p className="text-sm mt-1">
              Selecciona un torneo y categoría en los paneles superiores para cargar estadísticas y
              reportes.
            </p>
          </div>
        )}
      </main>

      <AnalyticsFooter />
    </div>
  )
}

export default function AnalyticsApp() {
  return (
    <AuthProvider auth={auth} fetchWithAuth={fetchWithAuth}>
      <AnalyticsAppContent />
    </AuthProvider>
  )
}
