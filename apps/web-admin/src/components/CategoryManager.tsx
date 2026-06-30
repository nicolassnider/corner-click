import { trpc } from '@corner-click/api-client'
import type { TournamentType } from '@corner-click/types'
import { Button, Card } from '@corner-click/ui'
import type React from 'react'
import { useState } from 'react'

interface CategoryManagerProps {
  tournamentId: string
  isReadOnly?: boolean
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  tournamentId,
  isReadOnly = false,
}) => {
  const [selectedType, setSelectedType] = useState<TournamentType>('LOCAL_OPEN')
  const [generating, setGenerating] = useState(false)

  const utils = trpc.useUtils()
  const { data: categories = [], isLoading: loading } = trpc.categories.getAll.useQuery({
    tournamentId,
  })

  const generateMutation = trpc.categories.generateOfficial.useMutation()

  const handleGenerate = async () => {
    if (categories.length > 0) {
      if (!confirm('Esto borrará las categorías actuales. ¿Estás seguro?')) {
        return
      }
    }

    setGenerating(true)
    try {
      await generateMutation.mutateAsync({
        tournamentId,
        type: selectedType,
      })
      utils.categories.getAll.invalidate({ tournamentId })
      alert('Categorías generadas exitosamente.')
    } catch (error) {
      console.error('Failed to generate categories:', error)
      alert('Error al generar categorías.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {!isReadOnly && (
        <Card padding="md" className="bg-slate-900/60 border-slate-800 backdrop-blur-xl">
          <h2 className="text-xl font-bold mb-4 text-slate-100 flex items-center gap-2">
            <span>⚙️</span> Generador de Categorías ITF
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <label
                htmlFor="tournament-type-select"
                className="block text-sm font-black tracking-widest text-slate-400 uppercase"
              >
                Tipo de Torneo
              </label>
              <select
                id="tournament-type-select"
                aria-label="Tipo de Torneo"
                title="Tipo de Torneo"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as TournamentType)}
                className="mt-1 block w-full pl-4 pr-10 py-3 text-sm font-medium bg-slate-950 text-slate-200 border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl border shadow-inner transition-all appearance-none cursor-pointer"
              >
                <option value="LOCAL_OPEN">Torneo Local / Abierto</option>
                <option value="WORLD_CUP">Copa del Mundo (World Cup)</option>
                <option value="WORLD_CHAMPIONSHIP">Campeonato Mundial (World Champ)</option>
              </select>

              <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl text-sm text-blue-200/80 shadow-inner">
                {selectedType === 'LOCAL_OPEN' ? (
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <span className="text-blue-300 font-bold">Edades:</span> Micro (4-5), Pre-Mini
                      (6-7), Mini (8-9), Infantil (10-11) y todas las edades mayores.
                    </li>
                    <li>
                      <span className="text-blue-300 font-bold">Cinturones:</span> Divisiones
                      detalladas de Gups (10-9, 8-7, 6-5, 4-1) y Danes.
                    </li>
                    <li>
                      <span className="text-blue-300 font-bold">Total:</span> ~250 categorías. Ideal
                      para academias y regionales.
                    </li>
                  </ul>
                ) : selectedType === 'WORLD_CUP' ? (
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <span className="text-blue-300 font-bold">Edades:</span> Pre-Junior (12-14),
                      Junior (15-17), Adulto (18-35), Senior (36+).
                    </li>
                    <li>
                      <span className="text-blue-300 font-bold">Cinturones:</span> Gups agrupados
                      (Azul a Rojo) y Danes.
                    </li>
                    <li>
                      <span className="text-blue-300 font-bold">Total:</span> ~130 categorías.
                    </li>
                  </ul>
                ) : (
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <span className="text-blue-300 font-bold">Edades:</span> Pre-Junior (12-14),
                      Junior (15-17), Adulto (18+).
                    </li>
                    <li>
                      <span className="text-blue-300 font-bold">Cinturones:</span> Solo Negros.
                    </li>
                    <li>
                      <span className="text-blue-300 font-bold">Total:</span> ~40 categorías.
                    </li>
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-4">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                variant="primary"
                className="w-full"
              >
                {generating ? 'Generando...' : 'Generar Categorías Oficiales'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card padding="md">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Categorías Actuales ({categories.length})
        </h3>

        {loading ? (
          <p>Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No hay categorías generadas. Usa el generador de arriba.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nombre de la Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Edad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cinturón
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {cat.ageGroup}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {cat.beltLevel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
