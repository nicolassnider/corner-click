import React, { useState } from 'react';
import type { Tournament } from '@corner-click/types';
import TournamentList from './TournamentList';
import TournamentForm from './TournamentForm';
import TournamentDetail from './TournamentDetail';

export default function Dashboard() {
  const [view, setView] = useState<'LIST' | 'FORM' | 'DETAIL'>('LIST');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const handleSelect = (t: Tournament) => {
    setSelectedTournament(t);
    setView('DETAIL');
  };

  const handleBackToList = () => {
    setSelectedTournament(null);
    setView('LIST');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Top Navbar */}
      <nav className="bg-gray-900 text-white shadow-xl py-4 px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={handleBackToList}>
            <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span className="text-2xl font-black tracking-tight">CORNER<span className="text-blue-500">CLICK</span></span>
            <span className="ml-4 pl-4 border-l border-gray-700 text-gray-400 font-semibold tracking-widest text-sm">JURY DASHBOARD</span>
          </div>
          <div>
            <span className="bg-gray-800 text-gray-300 py-2 px-4 rounded-full text-sm font-bold border border-gray-700">Admin</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pb-12">
        {view === 'LIST' && (
          <TournamentList 
            onSelect={handleSelect} 
            onCreateNew={() => setView('FORM')} 
          />
        )}
        
        {view === 'FORM' && (
          <TournamentForm 
            onCancel={() => setView('LIST')} 
            onCreated={() => setView('LIST')} 
          />
        )}

        {view === 'DETAIL' && selectedTournament && (
          <TournamentDetail 
            tournament={selectedTournament} 
            onBack={handleBackToList} 
          />
        )}
      </main>
    </div>
  );
}
