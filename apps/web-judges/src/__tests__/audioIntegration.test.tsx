// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import ScorePad from '../components/ScorePad'

// Mock Firebase RTDB
vi.mock('../lib/firebase', () => {
  return {
    database: {},
  }
})

vi.mock('firebase/database', () => {
  return {
    ref: vi.fn(),
    onValue: vi.fn(() => vi.fn()),
    set: vi.fn().mockResolvedValue(undefined),
  }
})

// Mock Socket client
vi.mock('../lib/socketClient', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
  }
  return {
    connectSocket: vi.fn(() => mockSocket),
    disconnectSocket: vi.fn(),
    getSocket: vi.fn(() => mockSocket),
  }
})

// Mock scoreService
vi.mock('../services/scoreService', () => {
  return {
    submitScores: vi.fn().mockResolvedValue({}),
  }
})

// Mock AudioService
vi.mock('@corner-click/audio', () => {
  return {
    AudioService: {
      playClick: vi.fn(),
    },
  }
})

import { AudioService } from '@corner-click/audio'

describe('ScorePad Audio Click Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should trigger AudioService.playClick when score buttons are clicked', () => {
    render(
      <ScorePad
        matchId="test-match"
        cornerId="red"
        isOffline={true} // Forces active/offline mode where buttons are interactive
      />
    )

    // Find the red corner points button
    // ScorePad renders button elements for adding scores, e.g. "+1", "+2", "+3" or similar
    const addScoreButtons = screen.getAllByRole('button')

    // Let's filter buttons containing "+" or warnings/deductions
    const plusOneButton = addScoreButtons.find((b) => b.textContent?.includes('+1'))
    expect(plusOneButton).toBeDefined()

    if (plusOneButton) {
      fireEvent.click(plusOneButton)
      expect(AudioService.playClick).toHaveBeenCalled()
    }
  })
})
