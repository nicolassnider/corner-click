import React from 'react';
import type { Tournament } from '@corner-click/types';
import JudgeManager from './JudgeManager';

interface Props {
  tournament: Tournament;
  onBack: () => void;
}

export default function TournamentDetail({ tournament, onBack }: Props) {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-6">
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 p-3 rounded-full shadow transition-colors"
          title="Back to List"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{tournament.name}</h1>
          <p className="text-gray-600 text-lg mt-1">{new Date(tournament.date).toLocaleDateString()} &mdash; {tournament.location}</p>
        </div>
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

        {/* Right Column: Manage Judges */}
        <div className="lg:col-span-2">
          <JudgeManager tournamentId={tournament.id!} tournamentAreas={tournament.areas || tournament.rings || 1} />
        </div>

      </div>
    </div>
  );
}
