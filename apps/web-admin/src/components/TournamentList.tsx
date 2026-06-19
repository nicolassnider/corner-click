import React, { useState, useEffect } from 'react';
import type { Tournament } from '@corner-click/types';
import { fetchWithAuth } from '../utils/apiClient';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

interface Props {
  onSelect: (t: Tournament) => void;
  onCreateNew: () => void;
  onEdit: (t: Tournament) => void;
}

export default function TournamentList({ onSelect, onCreateNew, onEdit }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth(`${API_URL}/api/tournaments`)
      .then(res => res.json())
      .then(data => {
        setTournaments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament? This will erase all its categories, competitors, matches and judges.')) {
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_URL}/api/tournaments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTournaments(prev => prev.filter(t => t.id !== id));
      } else {
        alert('Failed to delete tournament');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Tournaments</h1>
        <button 
          onClick={onCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:-translate-y-1"
        >
          + New Tournament
        </button>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-500 text-xl">No tournaments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(t => (
            <div 
              key={t.id} 
              onClick={() => onSelect(t)}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-shadow cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 leading-tight">{t.name}</h2>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shrink-0 ml-2">
                    {t.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  {t.location}
                </p>
                <p className="text-gray-600 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  {new Date(t.date).toLocaleDateString()}
                </p>
              </div>
              <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-500">{t.areas || t.rings || 1} Areas Setup</p>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(t);
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded text-xs transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(t.id!);
                    }}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded text-xs transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
