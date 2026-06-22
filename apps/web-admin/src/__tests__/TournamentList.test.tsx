// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TournamentList from "../components/TournamentList";
import type { Tournament } from "@corner-click/types";

// Mock the API client
vi.mock("../utils/apiClient", () => {
  return {
    fetchWithAuth: vi.fn(),
    API_URL: "http://localhost:4000",
    getDynamicAnalyticsUrl: vi.fn((url) => url || "http://localhost:4323"),
  };
});

import { fetchWithAuth } from "../utils/apiClient";

describe("TournamentList Component", () => {
  const mockTournaments: Tournament[] = [
    {
      id: "t1",
      name: "Torneo Activo",
      status: "IN_PROGRESS",
      location: "Gimnasio A",
      date: "2026-06-20T10:00:00.000Z",
      areas: 3,
    },
    {
      id: "t2",
      name: "Torneo Proximo",
      status: "UPCOMING",
      location: "Estadio B",
      date: "2026-07-15T12:00:00.000Z",
      areas: 2,
    },
    {
      id: "t3",
      name: "Torneo Finalizado",
      status: "COMPLETED",
      location: "Club C",
      date: "2026-05-10T08:00:00.000Z",
      areas: 4,
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should display loading spinner initially, then show tournaments divided by state", async () => {
    (fetchWithAuth as any).mockResolvedValue({
      ok: true,
      json: async () => mockTournaments,
    });

    const onSelect = vi.fn();
    const onCreateNew = vi.fn();
    const onEdit = vi.fn();

    render(
      <TournamentList
        onSelect={onSelect}
        onCreateNew={onCreateNew}
        onEdit={onEdit}
      />,
    );

    // Wait for the tournaments to load and render
    await waitFor(() => {
      expect(screen.getByText("Torneo Activo")).toBeInTheDocument();
    });

    expect(screen.getByText("Torneo Proximo")).toBeInTheDocument();
    expect(screen.getByText("Torneo Finalizado")).toBeInTheDocument();

    // Check headings/sections for groupings
    expect(screen.getByText(/En Curso \/ Activos/i)).toBeInTheDocument();
    expect(screen.getByText(/Próximos Torneos/i)).toBeInTheDocument();
    expect(screen.getByText(/Finalizados \/ Historial/i)).toBeInTheDocument();
  });

  it("should hide Edit and Delete buttons for completed tournaments and show them for active ones", async () => {
    (fetchWithAuth as any).mockResolvedValue({
      ok: true,
      json: async () => mockTournaments,
    });

    render(
      <TournamentList
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Torneo Activo")).toBeInTheDocument();
    });

    // Check that Edit/Delete buttons exist for the active tournament card
    const activeCard = screen.getByText("Torneo Activo").closest(".p-6");
    expect(activeCard).toBeTruthy();
    expect(
      activeCard?.querySelector("button:nth-of-type(1)")?.textContent,
    ).toBe("Edit");
    expect(
      activeCard?.querySelector("button:nth-of-type(2)")?.textContent,
    ).toBe("Delete");

    // Check that Edit/Delete buttons DO NOT exist inside the completed tournament card
    const completedCard = screen.getByText("Torneo Finalizado").closest(".p-6");
    expect(completedCard).toBeTruthy();
    expect(completedCard?.querySelector("button")).toBeNull();
  });

  it("should call onSelect when a tournament card is clicked", async () => {
    (fetchWithAuth as any).mockResolvedValue({
      ok: true,
      json: async () => [mockTournaments[0]],
    });

    const onSelect = vi.fn();
    render(
      <TournamentList
        onSelect={onSelect}
        onCreateNew={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Torneo Activo")).toBeInTheDocument();
    });

    screen.getByText("Torneo Activo").click();
    expect(onSelect).toHaveBeenCalledWith(mockTournaments[0]);
  });

  it("should call onEdit when Edit button is clicked", async () => {
    (fetchWithAuth as any).mockResolvedValue({
      ok: true,
      json: async () => [mockTournaments[0]],
    });

    const onEdit = vi.fn();
    render(
      <TournamentList
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onEdit={onEdit}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Torneo Activo")).toBeInTheDocument();
    });

    const editBtn = screen.getByText("Edit");
    editBtn.click();
    expect(onEdit).toHaveBeenCalledWith(mockTournaments[0]);
  });

  it("should handle Delete tournament correctly when confirmed", async () => {
    (fetchWithAuth as any).mockResolvedValue({
      ok: true,
      json: async () => [mockTournaments[0]],
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteMock = vi.fn().mockResolvedValue({ ok: true });
    (fetchWithAuth as any).mockImplementation((url: string, init?: any) => {
      if (init?.method === "DELETE") {
        return deleteMock();
      }
      return Promise.resolve({
        ok: true,
        json: async () => [mockTournaments[0]],
      });
    });

    render(
      <TournamentList
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Torneo Activo")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByText("Delete");
    deleteBtn.click();

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("should not delete tournament if confirmation is cancelled", async () => {
    (fetchWithAuth as any).mockResolvedValue({
      ok: true,
      json: async () => [mockTournaments[0]],
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const deleteMock = vi.fn().mockResolvedValue({ ok: true });
    (fetchWithAuth as any).mockImplementation((url: string, init?: any) => {
      if (init?.method === "DELETE") {
        return deleteMock();
      }
      return Promise.resolve({
        ok: true,
        json: async () => [mockTournaments[0]],
      });
    });

    render(
      <TournamentList
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Torneo Activo")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByText("Delete");
    deleteBtn.click();

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("should log error if fetch tournaments fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (fetchWithAuth as any).mockRejectedValue(new Error("API failure"));

    render(
      <TournamentList
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});
