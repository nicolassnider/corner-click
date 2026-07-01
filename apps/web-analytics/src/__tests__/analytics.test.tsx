// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import AnalyticsManager from '../components/AnalyticsManager'

// Mock Firebase RTDB and bracket services
vi.mock('../lib/firebase', () => ({
  database: {},
}))

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  get: vi.fn(),
}))

vi.mock('../services/bracketService', () => ({
  getMatches: vi.fn().mockResolvedValue([
    {
      id: 'm1',
      tournamentId: 't1',
      categoryId: 'cat1',
      redCompetitorId: 'red-comp',
      blueCompetitorId: 'blue-comp',
      winnerId: 'red-comp',
      status: 'COMPLETED',
      round: 1,
    },
  ]),
}))

vi.mock('../services/competitorService', () => ({
  getCompetitors: vi.fn().mockResolvedValue([
    { id: 'red-comp', firstName: 'Nicolas', lastName: 'Snider' },
    { id: 'blue-comp', firstName: 'John', lastName: 'Doe' },
  ]),
}))

// Mock the API client
vi.mock('../utils/apiClient', () => ({
  fetchWithAuth: vi.fn(),
  API_URL: 'http://localhost:4000',
}))

import { fetchWithAuth } from '../utils/apiClient'

describe('AnalyticsManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate judge consistency rate and technique counts correctly', async () => {
    // Mock the scores endpoint return value
    ;(fetchWithAuth as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        scores: {
          'Juez Consistente': {
            redScore: 10,
            blueScore: 8,
            redWarnings: 0,
            blueWarnings: 0,
            redDeductions: 0,
            blueDeductions: 0,
          },
          'Juez Divergente': {
            redScore: 5,
            blueScore: 12,
            redWarnings: 0,
            blueWarnings: 0,
            redDeductions: 0,
            blueDeductions: 0,
          },
        },
      }),
    })

    render(<AnalyticsManager tournamentId="t1" categoryId="cat1" />)

    // Wait for the loader to finish and render results
    await waitFor(() => {
      expect(screen.getByText('Juez Consistente')).toBeInTheDocument()
    })

    expect(screen.getByText('Juez Divergente')).toBeInTheDocument()

    // Consistente matched the winner "red-comp" (10-8). Rate = 100%
    // Divergente voted blue (5-12). Consensus was red. Rate = 0%
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()

    // Total points scored = (10 + 8) + (5 + 12) = 35
    expect(screen.getByText('35')).toBeInTheDocument()
  })

  it('should trigger markdown file download when export button is clicked', async () => {
    ;(fetchWithAuth as any).mockResolvedValue({
      ok: true,
      json: async () => ({ scores: {} }),
    })

    // Mock global URL and document download elements
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
    global.URL.createObjectURL = createObjectURLMock

    render(<AnalyticsManager tournamentId="t1" categoryId="cat1" />)

    await waitFor(() => {
      expect(screen.getByText('Exportar Markdown (.md)')).toBeInTheDocument()
    })

    const exportBtn = screen.getByText('Exportar Markdown (.md)')
    fireEvent.click(exportBtn)

    expect(createObjectURLMock).toHaveBeenCalled()
  })
})
