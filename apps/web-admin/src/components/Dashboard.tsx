import React, { useState } from 'react';
import type { Tournament } from '@corner-click/types';
import TournamentList from './TournamentList';
import TournamentForm from './TournamentForm';
import TournamentDetail from './TournamentDetail';
import AdminHeader from './AdminHeader';
import Footer from './Footer';

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
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans">
      <AdminHeader onHomeClick={handleBackToList} />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
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

      <Footer />
    </div>
  );
}
