import React, { useState, useEffect } from 'react';
import type { Competitor } from '@corner-click/types';
import { getCompetitors, addCompetitor, updateCompetitor, deleteCompetitor } from '../services/competitorService';
import { CompetitorForm } from './CompetitorForm';

interface CompetitorManagerProps {
  tournamentId: string;
  categoryId: string;
}

export const CompetitorManager: React.FC<CompetitorManagerProps> = ({ tournamentId, categoryId }) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompetitors();
  }, [tournamentId, categoryId]);

  const loadCompetitors = async () => {
    setLoading(true);
    try {
      const data = await getCompetitors(tournamentId, categoryId);
      setCompetitors(data);
    } catch (error) {
      console.error('Failed to load competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (competitorData: Omit<Competitor, 'id' | 'tournamentId'>) => {
    try {
      if (editingCompetitor) {
        await updateCompetitor(tournamentId, editingCompetitor.id, competitorData);
      } else {
        await addCompetitor(tournamentId, competitorData);
      }
      setIsFormOpen(false);
      setEditingCompetitor(undefined);
      await loadCompetitors();
    } catch (error) {
      console.error('Failed to save competitor:', error);
    }
  };

  const handleDelete = async (competitorId: string) => {
    if (confirm('Are you sure you want to delete this competitor?')) {
      try {
        await deleteCompetitor(tournamentId, competitorId);
        await loadCompetitors();
      } catch (error) {
        console.error('Failed to delete competitor:', error);
      }
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Competitors ({competitors.length})</h2>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Competitor
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="mb-8 border-b pb-8">
          <CompetitorForm
            categoryId={categoryId}
            initialData={editingCompetitor}
            onSave={handleSave}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingCompetitor(undefined);
            }}
          />
        </div>
      )}

      {loading ? (
        <p>Loading competitors...</p>
      ) : competitors.length === 0 ? (
        <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No competitors registered yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club / Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seeded</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitors.map((comp) => (
                <tr key={comp.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{comp.firstName} {comp.lastName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{comp.club}</div>
                    <div className="text-sm text-gray-500">{comp.country}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {comp.isSeeded ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Seed
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingCompetitor(comp);
                        setIsFormOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
