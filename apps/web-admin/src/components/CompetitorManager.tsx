import React, { useState, useEffect } from 'react';
import type { Competitor, Category } from '@corner-click/types';
import { getCompetitors, addCompetitor, updateCompetitor, deleteCompetitor } from '../services/competitorService';
import { CompetitorForm } from './CompetitorForm';

interface CompetitorManagerProps {
  tournamentId: string;
  categoryId: string;
  categories: Category[];
  onCategoryChange: (id: string) => void;
}

export const CompetitorManager: React.FC<CompetitorManagerProps> = ({ tournamentId, categoryId, categories, onCategoryChange }) => {
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
      
      if (competitorData.categoryId !== categoryId) {
        onCategoryChange(competitorData.categoryId);
      } else {
        await loadCompetitors();
      }
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

  const generateMockCompetitors = async () => {
    if (!confirm('Generar 8 competidores aleatorios para esta categoría?')) return;
    setLoading(true);
    const firstNames = ['Liam', 'Emma', 'Noah', 'Olivia', 'Oliver', 'Ava', 'Elijah', 'Charlotte', 'Mateo', 'Sophia', 'Lucas', 'Mia', 'Hugo', 'Lucia', 'Martin', 'Martina'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Gomez', 'Lopez', 'Diaz', 'Perez'];
    const clubs = ['Tigers TKD', 'Dragon Martial Arts', 'Elite Fighters', 'Kick Masters', 'Do San', 'Chon Ji'];
    const countries = ['ARG', 'BRA', 'USA', 'CAN', 'CHI', 'URU', 'ESP'];

    const mockCompetitors = Array.from({ length: 8 }).map(() => ({
      categoryId,
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      club: clubs[Math.floor(Math.random() * clubs.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      gender: 'MALE' as const,
      birthDate: '2005-05-15',
      weight: 70,
      belt: '1º – 3º Dan',
      isSeeded: Math.random() > 0.8
    }));

    try {
      console.log('Iniciando generación de 8 competidores...');
      await Promise.all(mockCompetitors.map(async (comp, index) => {
        const result = await addCompetitor(tournamentId, comp);
        console.log(`Competidor ${index + 1}/8 creado: ${comp.firstName} ${comp.lastName}`);
        return result;
      }));
      console.log('¡Generación completada!');
      alert('8 competidores generados con éxito');
      await loadCompetitors();
    } catch (err) {
      console.error('Error generating mock data', err);
      alert('Hubo un error al generar los competidores');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Competitors ({competitors.length})</h2>
        {!isFormOpen && (
          <div className="flex space-x-2">
            <button
              onClick={generateMockCompetitors}
              disabled={loading}
              className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {loading ? 'Generando...' : 'Generar Random'}
            </button>
            <button
              onClick={() => setIsFormOpen(true)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              Add Competitor
            </button>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="mb-8 border-b pb-8">
          <CompetitorForm
            categoryId={categoryId}
            categories={categories}
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
