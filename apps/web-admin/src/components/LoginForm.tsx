import { trpc } from '@corner-click/api-client'
import { AuthProvider, LoginForm as SharedLoginForm } from '@corner-click/auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useEffect } from 'react'
import { auth } from '../lib/firebase'
import { API_URL, fetchWithAuth, wakeUpApi } from '../utils/apiClient'

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
    }),
  ],
})

export default function LoginForm() {
  useEffect(() => {
    wakeUpApi()
  }, [])

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider auth={auth} fetchWithAuth={fetchWithAuth}>
          <SharedLoginForm title="CORNERCLICK" subtitle="Admin Console" />
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
