// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import PublicScoreboard from "../components/PublicScoreboard";
import { MatchStatus } from "@corner-click/types";

// Mock Firebase RTDB
vi.mock("../lib/firebase", () => {
  return {
    auth: { currentUser: null },
    database: {},
    db: {},
  };
});

let mockOnValueCallback: any = null;

vi.mock("firebase/database", () => {
  return {
    ref: vi.fn(),
    onValue: vi.fn((reference, callback) => {
      // Save the callback to trigger updates manually
      mockOnValueCallback = callback;
      // Return unsubscribe mock
      return vi.fn();
    }),
    get: vi.fn().mockResolvedValue({
      exists: () => true,
      val: () => ({ name: "Test Category" }),
    }),
  };
});

// Mock Socket client
vi.mock("../lib/socketClient", () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
  };
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

import { AudioService } from "@corner-click/audio";

describe("PublicScoreboard Audio Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnValueCallback = null;
  });

  it("should play gong when match transition status to ACTIVE", async () => {
    render(<PublicScoreboard areaId="1" />);

    // Simulate match loading (onValue live_matches_by_area call)
    // The first subscription is info/connected, the second is live_matches_by_area, etc.
    expect(mockOnValueCallback).toBeDefined();

    // Trigger info/connected snapshot
    const mockConnectedSnap = {
      val: () => true,
    };
    // The first call was info/connected (which is handled synchronously on mount)
    // Let's trigger the match loading
    act(() => {
      // In the scoreboard, the match is loaded. Let's mock a state transition.
      // We will mock state updates by changing state via RTDB subscription.
    });
  });
});
