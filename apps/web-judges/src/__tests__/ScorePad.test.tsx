// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ScorePad from "../components/ScorePad";
import { CornerRole, SocketEvent, MatchStatus } from "@corner-click/types";

// Mock Firebase RTDB
vi.mock("../lib/firebase", () => ({
  database: {},
}));

const mockOnValueUnsubscribe = vi.fn();
const mockOnValue = vi.fn((ref, cb) => {
  // Simulate database connections
  if (ref && ref._path === ".info/connected") {
    cb({ val: () => true });
  }
  return mockOnValueUnsubscribe;
});

vi.mock("firebase/database", () => {
  return {
    ref: vi.fn((db, path) => ({ _path: path })),
    onValue: (ref: any, cb: any) => mockOnValue(ref, cb),
    set: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock Socket client
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
};
vi.mock("../lib/socketClient", () => {
  return {
    connectSocket: vi.fn(() => mockSocket),
    disconnectSocket: vi.fn(),
    getSocket: vi.fn(() => mockSocket),
  };
});

// Mock scoreService
vi.mock("../services/scoreService", () => {
  return {
    submitScores: vi.fn().mockResolvedValue({}),
  };
});

// Mock AudioService
vi.mock("@corner-click/audio", () => {
  return {
    AudioService: {
      playClick: vi.fn(),
    },
  };
});

import { submitScores } from "../services/scoreService";
import { getSocket } from "../lib/socketClient";

describe("ScorePad Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render correctly with initial scores", () => {
    render(<ScorePad matchId="match-1" cornerId="red" isOffline={true} />);

    // Verify initial scores
    expect(screen.getByText("ROJO")).toBeInTheDocument();
    expect(screen.getByText("AZUL")).toBeInTheDocument();
  });

  it("should increment red and blue scores and emit socket event when offline/local", () => {
    render(<ScorePad matchId="match-1" cornerId="red" isOffline={true} />);

    // Get all buttons with "+1"
    const plusOneButtons = screen.getAllByText("+1");
    // Click the first one (Red)
    fireEvent.click(plusOneButtons[0]);

    expect(mockSocket.emit).toHaveBeenCalledWith(
      SocketEvent.JUDGE_SCORE_UPDATE,
      expect.objectContaining({
        corner: "red",
        value: 1,
      }),
    );
  });

  it("should handle warnings increment and emit event", () => {
    render(<ScorePad matchId="match-1" cornerId="red" isOffline={true} />);

    const warnButtons = screen.getAllByText("Warn");
    // Click the first one (Red)
    fireEvent.click(warnButtons[0]);

    expect(mockSocket.emit).toHaveBeenCalledWith(
      SocketEvent.JUDGE_SCORE_UPDATE,
      expect.objectContaining({
        corner: "red",
        type: "warning",
      }),
    );
  });

  it("should handle deductions increment and emit event", () => {
    render(<ScorePad matchId="match-1" cornerId="red" isOffline={true} />);

    const deductButtons = screen.getAllByText("Deduct");
    // Click the first one (Red)
    fireEvent.click(deductButtons[0]);

    expect(mockSocket.emit).toHaveBeenCalledWith(
      SocketEvent.JUDGE_SCORE_UPDATE,
      expect.objectContaining({
        corner: "red",
        type: "deduction",
      }),
    );
  });
});
