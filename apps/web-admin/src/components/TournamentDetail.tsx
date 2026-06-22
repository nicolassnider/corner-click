import React, { useState, useEffect } from "react";
import type { Tournament, Category } from "@corner-click/types";
import JudgeManager from "./JudgeManager";
import { CompetitorManager } from "./CompetitorManager";
import { BracketManager } from "./BracketManager";
import { CategoryManager } from "./CategoryManager";
import { CategoryAdjuster } from "./CategoryAdjuster";
import { getCategories } from "../services/categoryService";

interface Props {
  tournament: Tournament;
  onBack: () => void;
}

export default function TournamentDetail({ tournament, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<
    "categories" | "competitors" | "adjust-categories" | "judges" | "brackets"
  >("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const defaultArea = "1";

  useEffect(() => {
    // Load categories so we can select them in the dropdown
    getCategories(tournament.id!).then((data) => {
      setCategories(data);
      if (data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id);
      }
    });
  }, [tournament.id, activeTab]);

  const renderNavigation = () => {
    const tabs: (typeof activeTab)[] = [
      "categories",
      "competitors",
      "adjust-categories",
      "judges",
      "brackets",
    ];
    const currentIndex = tabs.indexOf(activeTab);

    return (
      <div className="flex justify-between items-center w-full">
        <button
          disabled={activeTab === "categories"}
          onClick={() => {
            if (currentIndex > 0) {
              setActiveTab(tabs[currentIndex - 1]);
            }
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2 -ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            ></path>
          </svg>
          Anterior
        </button>

        <button
          disabled={activeTab === "brackets"}
          onClick={() => {
            if (currentIndex < tabs.length - 1) {
              setActiveTab(tabs[currentIndex + 1]);
            }
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente
          <svg
            className="w-5 h-5 ml-2 -mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            ></path>
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[95vw] 2xl:max-w-[1700px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-6">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 p-3 rounded-full shadow transition-colors shrink-0"
            title="Back to List"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
          </button>
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {tournament.name}
            </h1>
            <p className="text-gray-600 text-lg mt-1">
              {new Date(tournament.date).toLocaleDateString()} &mdash;{" "}
              {tournament.location}
            </p>
          </div>
        </div>
        <a
          href={`/live?tournament=${tournament.id}`}
          target="_blank"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 transition-colors shrink-0"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            ></path>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          Abrir Live Control
        </a>
      </div>

      {tournament.status === "COMPLETED" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm mb-4">
          <span className="text-xl">⚠️</span>
          <span className="font-semibold text-sm">
            Este torneo ha finalizado y está en modo de solo lectura. No se
            permiten realizar modificaciones en las categorías, competidores,
            jueces o llaves.
          </span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide">
              Status
            </h3>
            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold uppercase tracking-wider">
              {tournament.status}
            </span>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg text-white">
            <h3 className="text-lg font-bold mb-2 uppercase tracking-wide opacity-90">
              Total Areas
            </h3>
            <p className="text-5xl font-extrabold">{tournament.areas || 1}</p>
          </div>
        </div>

        {/* Right Column: Manage Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex space-x-4 border-b border-gray-200 mb-6 overflow-x-auto">
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === "categories" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("categories")}
            >
              1. Generar Categorías
            </button>
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === "competitors" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("competitors")}
            >
              2. Competidores
            </button>
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === "adjust-categories" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("adjust-categories")}
            >
              3. Ajustar Categorías
            </button>
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === "judges" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("judges")}
            >
              4. Jueces
            </button>
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === "brackets" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("brackets")}
            >
              5. Llaves
            </button>
          </div>

          {/* Navigation (Top) */}
          <div className="mb-6">{renderNavigation()}</div>

          {(activeTab === "competitors" || activeTab === "brackets") && (
            <div className="mb-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex-1">
                <label
                  htmlFor="category-select"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Seleccionar Categoría
                </label>
                <select
                  id="category-select"
                  aria-label="Seleccionar Categoría"
                  title="Seleccionar Categoría"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                >
                  <option value="" disabled>
                    -- Selecciona una categoría --
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedCategoryId && (
                <a
                  href={`http://localhost:4323/?tournament=${tournament.id}&category=${selectedCategoryId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shrink-0 shadow-sm"
                >
                  Ver Estadísticas Públicas ↗
                </a>
              )}
            </div>
          )}

          {activeTab === "categories" && (
            <CategoryManager
              tournamentId={tournament.id!}
              isReadOnly={tournament.status === "COMPLETED"}
            />
          )}

          {activeTab === "adjust-categories" && (
            <CategoryAdjuster
              tournamentId={tournament.id!}
              isReadOnly={tournament.status === "COMPLETED"}
            />
          )}

          {activeTab === "judges" && (
            <JudgeManager
              tournamentId={tournament.id!}
              tournamentAreas={tournament.areas || 1}
              isReadOnly={tournament.status === "COMPLETED"}
            />
          )}

          {activeTab === "competitors" && selectedCategoryId && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <CompetitorManager
                tournamentId={tournament.id!}
                categoryId={selectedCategoryId}
                categories={categories}
                onCategoryChange={setSelectedCategoryId}
                isReadOnly={tournament.status === "COMPLETED"}
              />
            </div>
          )}

          {activeTab === "brackets" && selectedCategoryId && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <BracketManager
                tournamentId={tournament.id!}
                categoryId={selectedCategoryId}
                areaId={defaultArea}
                isReadOnly={tournament.status === "COMPLETED"}
              />
            </div>
          )}

          {/* Navigation (Bottom) */}
          <div className="pt-6 border-t border-gray-200 mt-8">
            {renderNavigation()}
          </div>
        </div>
      </div>
    </div>
  );
}
