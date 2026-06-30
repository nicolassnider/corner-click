import { trpc } from '@corner-click/api-client'
import { useEffect, useState } from 'react'

const _API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000'

export function useJudges(tournamentId: string) {
  const [error, setError] = useState<string | null>(null)

  const createMutation = trpc.judges.create.useMutation()
  const assignMutation = trpc.judges.assign.useMutation()
  const disconnectMutation = trpc.judges.disconnect.useMutation()
  const deleteMutation = trpc.judges.delete.useMutation()

  const {
    data: judges = [],
    isLoading: loading,
    error: queryError,
  } = trpc.judges.getAll.useQuery(
    { tournamentId },
    {
      enabled: !!tournamentId,
      refetchInterval: 3000, // Poll every 3 seconds
    }
  )

  useEffect(() => {
    if (queryError) {
      setError('Failed to sync judges')
      console.error('TRPC Error:', queryError)
    } else {
      setError(null)
    }
  }, [queryError])

  const addJudge = async (name: string) => {
    try {
      setError(null)
      await createMutation.mutateAsync({ tournamentId, name })
    } catch (err: any) {
      setError(err.message || 'Failed to add judge')
      throw err
    }
  }

  const assignJudge = async (
    judgeId: string,
    assignment: { areaId: string; cornerId: string; matchId?: string }
  ) => {
    try {
      setError(null)
      await assignMutation.mutateAsync({
        tournamentId,
        judgeId,
        ...assignment,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to assign judge')
      throw err
    }
  }

  const disconnectJudge = async (judgeId: string) => {
    try {
      setError(null)
      await disconnectMutation.mutateAsync({ tournamentId, judgeId })
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect judge')
      throw err
    }
  }

  const deleteJudge = async (judgeId: string) => {
    try {
      setError(null)
      await deleteMutation.mutateAsync({ tournamentId, judgeId })
    } catch (err: any) {
      setError(err.message || 'Failed to delete judge')
      throw err
    }
  }

  return {
    judges,
    loading,
    error,
    addJudge,
    assignJudge,
    disconnectJudge,
    deleteJudge,
  }
}
