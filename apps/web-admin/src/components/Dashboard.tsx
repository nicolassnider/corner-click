import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { Tournament } from '@corner-click/types';
import TournamentList from './TournamentList';
import TournamentForm from './TournamentForm';
import TournamentDetail from './TournamentDetail';
import AdminHeader from './AdminHeader';
import Footer from './Footer';
import { auth } from '../lib/firebase';

export default function Dashboard() {
  const [view, setView] = useState<'LIST' | 'FORM' | 'DETAIL'>('LIST');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = '/login';
        return;
      }
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  const handleSelect = (t: Tournament) => {
    setSelectedTournament(t);
    setView('DETAIL');
  };

  const handleBackToList = () => {
    setSelectedTournament(null);
    setView('LIST');
  };

  // Show nothing while checking auth to avoid flash of content
  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0A0F1C]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans">
      <AdminHeader onHomeClick={handleBackToList} user={user} />

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
