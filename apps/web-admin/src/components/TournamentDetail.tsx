import React, { useState, useEffect } from 'react';
import type { Tournament, Category } from '@corner-click/types';
import JudgeManager from './JudgeManager';
import { CompetitorManager } from './CompetitorManager';
import { BracketManager } from './BracketManager';
import { CategoryManager } from './CategoryManager';
import { getCategories } from '../services/categoryService';

interface Props {
  tournament: Tournament;
  onBack: () => void;
}

export default function TournamentDetail({ tournament, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'categories' | 'judges' | 'competitors' | 'brackets'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  const defaultArea = '1';

  useEffect(() => {
    // Load categories so we can select them in the dropdown
    getCategories(tournament.id!).then(data => {
      setCategories(data);
      if (data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id);
      }
    });
  }, [tournament.id, activeTab]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBack}
            className="text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 p-3 rounded-full shadow transition-colors shrink-0"
            title="Back to List"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{tournament.name}</h1>
            <p className="text-gray-600 text-lg mt-1">{new Date(tournament.date).toLocaleDateString()} &mdash; {tournament.location}</p>
          </div>
        </div>
        <a 
          href={`/live?tournament=${tournament.id}`}
          target="_blank"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 transition-colors shrink-0"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Abrir Live Control
        </a>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Quick Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide">Status</h3>
            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold uppercase tracking-wider">{tournament.status}</span>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg text-white">
            <h3 className="text-lg font-bold mb-2 uppercase tracking-wide opacity-90">Total Areas</h3>
            <p className="text-5xl font-extrabold">{tournament.areas || tournament.rings || 1}</p>
          </div>
        </div>

        {/* Right Column: Manage Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex space-x-4 border-b border-gray-200 mb-6 overflow-x-auto">
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === 'categories' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('categories')}
            >
              Categorías
            </button>
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === 'judges' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('judges')}
            >
              Jueces
            </button>
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === 'competitors' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('competitors')}
            >
              Competidores
            </button>
            <button
              className={`py-2 px-4 font-semibold whitespace-nowrap ${activeTab === 'brackets' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('brackets')}
            >
              Llaves
            </button>
          </div>

          {(activeTab === 'competitors' || activeTab === 'brackets') && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Categoría</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                <option value="" disabled>-- Selecciona una categoría --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'categories' && (
            <CategoryManager tournamentId={tournament.id!} />
          )}

          {activeTab === 'judges' && (
            <JudgeManager tournamentId={tournament.id!} tournamentAreas={tournament.areas || tournament.rings || 1} />
          )}

          {activeTab === 'competitors' && selectedCategoryId && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <CompetitorManager tournamentId={tournament.id!} categoryId={selectedCategoryId} categories={categories} onCategoryChange={setSelectedCategoryId} />
            </div>
          )}

          {activeTab === 'brackets' && selectedCategoryId && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <BracketManager tournamentId={tournament.id!} categoryId={selectedCategoryId} areaId={defaultArea} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
