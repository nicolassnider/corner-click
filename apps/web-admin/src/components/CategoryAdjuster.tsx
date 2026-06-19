import React, { useState, useEffect } from 'react';
import type { Category, Competitor } from '@corner-click/types';
import { getCategories, mergeCategoriesWithFewCompetitors } from '../services/categoryService';
import { getCompetitors } from '../services/competitorService';

interface CategoryAdjusterProps {
  tournamentId: string;
}

export const CategoryAdjuster: React.FC<CategoryAdjusterProps> = ({ tournamentId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catsData, compsData] = await Promise.all([
        getCategories(tournamentId),
        getCompetitors(tournamentId)
      ]);
      setCategories(catsData);
      setCompetitors(compsData);
    } catch (error) {
      console.error('Failed to load data for adjuster:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!confirm('Esto moverá a los competidores de categorías con menos de 4 inscritos a la siguiente categoría de peso y eliminará las categorías vacías. ¿Estás seguro?')) {
      return;
    }

    setMerging(true);
    try {
      await mergeCategoriesWithFewCompetitors(tournamentId);
      await loadData();
      alert('Fusión y optimización de categorías completada con éxito.');
    } catch (error) {
      console.error('Failed to merge categories:', error);
      alert('Error al fusionar categorías.');
    } finally {
      setMerging(false);
    }
  };

  // Calculate competitor counts per category
  const competitorCounts = categories.reduce((acc, cat) => {
    acc[cat.id] = competitors.filter(c => c.categoryId === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(filterText.toLowerCase()) ||
    cat.ageGroup.toLowerCase().includes(filterText.toLowerCase()) ||
    cat.beltLevel.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ajuste y Fusión de Categorías</h2>
          <p className="text-sm text-gray-500 mt-1">
            Revisa la distribución de competidores. Fusiona automáticamente categorías con menos de 4 inscritos para asegurar llaves competitivas.
          </p>
        </div>
        <button
          onClick={handleMerge}
          disabled={merging || categories.length === 0}
          className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {merging ? 'Fusionando...' : 'Fusionar Categorías (< 4 competidores)'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-950">
            Categorías Actuales ({categories.length})
          </h3>
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar por nombre, edad o cinturón..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Cargando categorías y competidores...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
            No se encontraron categorías.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre de la Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Edad y Cinturón</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Competidores</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategories.map((cat) => {
                  const count = competitorCounts[cat.id] || 0;
                  let statusBadge = (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                      Listo (4+)
                    </span>
                  );
                  if (count === 0) {
                    statusBadge = (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        Vacía
                      </span>
                    );
                  } else if (count < 4) {
                    statusBadge = (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Pocos ({count})
                      </span>
                    );
                  }

                  return (
                    <tr key={cat.id} className={count === 0 ? 'bg-gray-50/50' : count < 4 ? 'bg-amber-50/10' : undefined}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cat.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="font-medium text-gray-700">{cat.ageGroup}</div>
                        <div className="text-xs text-gray-400">{cat.beltLevel}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-800">
                        {count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {statusBadge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
