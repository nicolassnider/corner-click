import { trpc } from '@corner-click/api-client'
import type { Tournament } from '@corner-click/types'
import { Button, Card, Input } from '@corner-click/ui'
import type React from 'react'
import { useEffect, useState } from 'react'

const _API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000'

interface Props {
  initialData?: Tournament | null
  onCancel: () => void
  onCreated: () => void
}

export default function TournamentForm({ initialData, onCancel, onCreated }: Props) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [areas, setAreas] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setDate(initialData.date ? initialData.date.substring(0, 10) : '')
      setLocation(initialData.location || '')
      setAreas(initialData.areas || (initialData as any).rings || 1)
    } else {
      setName('')
      setDate('')
      setLocation('')
      setAreas(1)
    }
  }, [initialData])

  const utils = trpc.useUtils()
  const createMutation = trpc.tournaments.create.useMutation()
  const updateMutation = trpc.tournaments.update.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          name,
          date,
          location,
          areas: Number(areas),
        })
      } else {
        await createMutation.mutateAsync({
          name,
          date,
          location,
          areas: Number(areas),
        })
      }
      utils.tournaments.getAll.invalidate()
      onCreated()
    } catch (err) {
      console.error('Failed to save tournament:', err)
    }
    setLoading(false)
  }

  return (
    <Card className="max-w-2xl mx-auto mt-12" padding="lg">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">
          {initialData ? 'Edit Tournament' : 'Create New Tournament'}
        </h2>
        <p className="text-gray-500 mt-2">
          {initialData
            ? 'Update the details for this event.'
            : 'Set up the basic details for your upcoming event.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Tournament Name"
          id="tournament-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Copa America ITF 2026"
        />

        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Date"
            id="tournament-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Location"
            id="tournament-location"
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Stadium"
          />
        </div>

        <Input
          label="Number of Areas"
          id="tournament-areas"
          type="number"
          min={1}
          max={20}
          required
          value={areas}
          onChange={(e) => setAreas(Number(e.target.value))}
        />

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} variant="primary">
            {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Create Tournament'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
