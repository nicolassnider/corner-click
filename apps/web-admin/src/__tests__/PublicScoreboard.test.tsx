// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PublicScoreboard from "../components/PublicScoreboard";
import { MatchStatus, SocketEvent } from "@corner-click/types";

// Mock Firebase RTDB
vi.mock("../lib/firebase", () => {
  return {
    auth: { currentUser: null },
    database: {},
  };
});

let mockCallbacks: Record<string, any> = {};

vi.mock("firebase/database", () => {
  return {
    ref: vi.fn((db, path) => ({ _path: path })),
    onValue: vi.fn((reference, callback) => {
      const path = reference._path;
      mockCallbacks[path] = callback;
      return vi.fn();
    }),
    get: vi.fn().mockImplementation((reference) => {
      const path = reference._path;
      if (path.includes("categories")) {
        return Promise.resolve({
          exists: () => true,
          val: () => ({ name: "Test Category 1" }),
        });
      }
      if (path.includes("competitors")) {
        return Promise.resolve({
          exists: () => true,
          val: () => ({
            "c-red": { firstName: "Lionel", lastName: "Messi", club: "Inter" },
            "c-blue": { firstName: "Cristiano", lastName: "Ronaldo", club: "Al" },
          }),
        });
      }
      return Promise.resolve({ exists: () => false });
    }),
  };
});

// Mock Socket client
const mockSocketOnCallbacks: Record<string, any> = {};
const mockSocket = {
  on: vi.fn((event, callback) => {
    mockSocketOnCallbacks[event] = callback;
  }),
  emit: vi.fn(),
};
vi.mock("../lib/socketClient", () => {
  return {
    connectSocket: vi.fn(() => mockSocket),
    disconnectSocket: vi.fn(),
    getSocket: vi.fn(() => mockSocket),
  };
});

// Mock AudioService
vi.mock("@corner-click/audio", () => {
  return {
    AudioService: {
      playGong: vi.fn(),
      playBuzzer: vi.fn(),
    },
  };
});

describe("PublicScoreboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCallbacks = {};
  });

  it("should render waiting screen initially", () => {
    render(<PublicScoreboard areaId="1" />);
    expect(
      screen.getByText(/Esperando inicio de combate/i)
    ).toBeInTheDocument();
  });

  it("should render match details and scores when activeMatch is set via Firebase", async () => {
    render(<PublicScoreboard areaId="1" />);

    // Trigger info/connected to be true
    if (mockCallbacks[".info/connected"]) {
      act(() => {
        mockCallbacks[".info/connected"]({
          exists: () => true,
          val: () => true,
        });
      });
    }

    // Trigger active match update
    if (mockCallbacks["live_matches_by_area/1"]) {
      await act(async () => {
        await mockCallbacks["live_matches_by_area/1"]({
          exists: () => true,
          val: () => ({
            matchId: "match-123",
            tournamentId: "t-1",
            categoryId: "cat-1",
            redCompetitorId: "c-red",
            blueCompetitorId: "c-blue",
            round: 1,
          }),
        });
      });
    }

    // Trigger live match stats update
    if (mockCallbacks["live_matches/match-123"]) {
      act(() => {
        mockCallbacks["live_matches/match-123"]({
          exists: () => true,
          val: () => ({
            status: MatchStatus.ACTIVE,
            timeRemaining: 95,
            scores: {
              "judge-1": {
                redScore: 3,
                blueScore: 1,
                redWarnings: 1,
                blueWarnings: 0,
                redDeductions: 0,
                blueDeductions: 0,
              },
            },
          }),
        });
      });
    }

    // Verify category and competitor names are rendered
    await waitFor(() => {
      expect(screen.getByText("Test Category 1")).toBeInTheDocument();
    });
    expect(screen.getByText("Lionel Messi")).toBeInTheDocument();
    expect(screen.getByText("Cristiano Ronaldo")).toBeInTheDocument();
    expect(screen.getByText("01:35")).toBeInTheDocument(); // 95 seconds
  });

  it("should fallback to socket connections when offline", async () => {
    render(<PublicScoreboard areaId="1" />);

    // Trigger info/connected to be false
    if (mockCallbacks[".info/connected"]) {
      act(() => {
        mockCallbacks[".info/connected"]({
          exists: () => true,
          val: () => false,
        });
      });
    }

    // Socket message callback trigger
    if (mockSocketOnCallbacks[SocketEvent.MATCH_STATE]) {
      act(() => {
        mockSocketOnCallbacks[SocketEvent.MATCH_STATE]({
          match: {
            id: "match-socket",
            tournamentId: "t-1",
            categoryId: "cat-1",
            redCompetitorId: "c-red",
            blueCompetitorId: "c-blue",
            redCompetitorName: "Leo Socket",
            blueCompetitorName: "Cris Socket",
            status: MatchStatus.ACTIVE,
          },
          timer: 80,
          scores: {
            "judge-1": {
              redScore: 2,
              blueScore: 2,
            },
          },
        });
      });
    }

    expect(screen.getByText("Leo Socket")).toBeInTheDocument();
    expect(screen.getByText("Cris Socket")).toBeInTheDocument();
    expect(screen.getByText("01:20")).toBeInTheDocument(); // 80 seconds
  });
});
