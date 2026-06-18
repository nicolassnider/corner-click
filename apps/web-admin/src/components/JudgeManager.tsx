import React, { useState } from 'react';
import type { Judge } from '@corner-click/types';
import { JudgeStatus } from '@corner-click/types';
import { useJudges } from '../hooks/useJudges';
import AssignJudgeModal from './AssignJudgeModal';

interface Props {
  tournamentId: string;
  tournamentAreas: number;
}

export default function JudgeManager({ tournamentId, tournamentAreas }: Props) {
  const { judges, loading, error, addJudge, assignJudge, disconnectJudge, deleteJudge } = useJudges(tournamentId);
  const [newJudgeName, setNewJudgeName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);

  const handleAddJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudgeName.trim()) return;
    
    setSubmitting(true);
    try {
      await addJudge(newJudgeName);
      setNewJudgeName('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-extrabold text-gray-900">Judges Management</h3>
        {loading && <span className="text-sm font-bold text-gray-400 animate-pulse">Syncing...</span>}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm font-bold border border-red-200">
          Error: {error}
        </div>
      )}
      
      <form onSubmit={handleAddJudge} className="flex gap-4 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <input 
          type="text" 
          placeholder="Enter Judge Full Name"
          value={newJudgeName}
          onChange={e => setNewJudgeName(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-gray-900 font-medium"
          required
        />
        <button 
          type="submit" 
          disabled={submitting}
          className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-lg shadow disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Adding...' : 'Register Judge'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-100 uppercase tracking-wider font-bold text-gray-600">
            <tr>
              <th className="px-6 py-4 rounded-tl-lg">Name</th>
              <th className="px-6 py-4">Personal PIN</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Assignment</th>
              <th className="px-6 py-4 rounded-tr-lg text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {judges.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500 italic">No judges registered yet.</td>
              </tr>
            ) : (
              judges.map(j => (
                <tr key={j.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{j.name}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-lg tracking-widest bg-gray-900 text-white px-3 py-1 rounded-md">{j.pin}</span>
                  </td>
                  <td className="px-6 py-4">
                    {j.status === JudgeStatus.ONLINE 
                      ? <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold bg-green-100 text-green-800"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>
                      : <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold bg-gray-100 text-gray-600"><span className="w-2 h-2 rounded-full bg-gray-400"></span> Offline</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    {j.currentAssignment ? (
                      <div className="flex flex-col">
                        <span className="text-blue-700 font-bold">Area {j.currentAssignment.areaId} &bull; <span className="capitalize">{j.currentAssignment.cornerId}</span></span>
                        <span className="text-xs font-mono text-gray-500">{j.currentAssignment.matchId}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic font-medium">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {j.status === JudgeStatus.ONLINE && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Force disconnect ${j.name}?`)) {
                              disconnectJudge(j.id!);
                            }
                          }}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold py-2 px-3 rounded-lg transition-colors text-xs uppercase tracking-wide"
                        >
                          Disconnect
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedJudge(j)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-2 px-4 rounded-lg transition-colors text-xs uppercase tracking-wide"
                      >
                        {j.currentAssignment ? 'Re-Assign' : 'Assign'}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${j.name}?`)) {
                            deleteJudge(j.id!);
                          }
                        }}
                        className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-3 rounded-lg transition-colors text-xs uppercase tracking-wide"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AssignJudgeModal 
        isOpen={!!selectedJudge}
        onClose={() => setSelectedJudge(null)}
        judge={selectedJudge}
        judges={judges}
        tournamentAreas={tournamentAreas}
        tournamentId={tournamentId}
        onAssign={assignJudge}
      />
    </div>
  );
}
