import React, { useState, useEffect } from 'react';
import type { Category, TournamentType } from '@corner-click/types';
import { getCategories, generateOfficialCategories, mergeCategoriesWithFewCompetitors } from '../services/categoryService';

interface CategoryManagerProps {
  tournamentId: string;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ tournamentId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selectedType, setSelectedType] = useState<TournamentType>('LOCAL_OPEN');

  useEffect(() => {
    loadCategories();
  }, [tournamentId]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories(tournamentId);
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (categories.length > 0) {
      if (!confirm('Esto borrará las categorías actuales. ¿Estás seguro?')) {
        return;
      }
    }

    setGenerating(true);
    try {
      await generateOfficialCategories(tournamentId, selectedType);
      await loadCategories();
      alert('Categorías generadas exitosamente.');
    } catch (error) {
      console.error('Failed to generate categories:', error);
      alert('Error al generar categorías.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMerge = async () => {
    if (!confirm('Esto moverá a los competidores de categorías con menos de 4 inscritos a la siguiente categoría de peso. ¿Estás seguro?')) {
      return;
    }

    setMerging(true);
    try {
      await mergeCategoriesWithFewCompetitors(tournamentId);
      await loadCategories();
      alert('Fusión completada.');
    } catch (error) {
      console.error('Failed to merge categories:', error);
      alert('Error al fusionar categorías.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Generador de Categorías ITF</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Tipo de Torneo</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as TournamentType)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="LOCAL_OPEN">Torneo Local / Abierto</option>
              <option value="WORLD_CUP">Copa del Mundo (World Cup)</option>
              <option value="WORLD_CHAMPIONSHIP">Campeonato Mundial (World Champ)</option>
            </select>

            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
              {selectedType === 'LOCAL_OPEN' ? (
                <ul className="list-disc pl-5 space-y-1">
                  <li>Edades: Micro (4-5), Pre-Mini (6-7), Mini (8-9), Infantil (10-11) y todas las edades mayores.</li>
                  <li>Cinturones: Divisiones detalladas de Gups (10-9, 8-7, 6-5, 4-1) y Danes.</li>
                  <li>Total aproximado: ~250 categorías. Ideal para academias y regionales.</li>
                </ul>
              ) : selectedType === 'WORLD_CUP' ? (
                <ul className="list-disc pl-5 space-y-1">
                  <li>Edades: Pre-Junior (12-14), Junior (15-17), Adulto (18-35), Senior (36-45), Veterano (46+).</li>
                  <li>Cinturones: Color (10-1 Gup) y Negros (1-6 Dan).</li>
                  <li>Total aproximado: ~130 categorías.</li>
                </ul>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  <li>Edades: Pre-Junior (12-14), Junior (15-17), Adulto (18+).</li>
                  <li>Cinturones: Solo Negros.</li>
                  <li>Total aproximado: ~40 categorías.</li>
                </ul>
              )}
            </div>
          </div>
          
          <div className="flex flex-col justify-center space-y-4">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {generating ? 'Generando...' : '1. Generar Categorías Oficiales'}
            </button>

            <button
              onClick={handleMerge}
              disabled={merging || categories.length === 0}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              title="Aplica la regla de fusionar categorías con < 4 competidores"
            >
              {merging ? 'Fusionando...' : '2. Fusionar Categorías (< 4 competidores)'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Categorías Actuales ({categories.length})
        </h3>
        
        {loading ? (
          <p>Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="text-gray-500">No hay categorías generadas. Usa el generador de arriba.</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de la Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cinturón</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cat.ageGroup}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cat.beltLevel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
