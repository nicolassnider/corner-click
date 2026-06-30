import React, { useState } from "react";
import { toast } from "react-hot-toast";
import type { Competitor, Category } from "@corner-click/types";
import { trpc } from "@corner-click/api-client";
import { CompetitorForm } from "./CompetitorForm";
import { Button } from "@corner-click/ui";

interface CompetitorManagerProps {
  tournamentId: string;
  categoryId: string;
  categories: Category[];
  onCategoryChange: (id: string) => void;
  isReadOnly?: boolean;
  tournamentAreas?: number;
}

export const CompetitorManager: React.FC<CompetitorManagerProps> = ({
  tournamentId,
  categoryId,
  categories,
  onCategoryChange,
  isReadOnly = false,
  tournamentAreas = 1,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<
    Competitor | undefined
  >();
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [mockAmount, setMockAmount] = useState(tournamentAreas * 20);
  const [isGenerating, setIsGenerating] = useState(false);

  const utils = trpc.useUtils();
  const { data: competitors = [], isLoading: loading } =
    trpc.competitors.getAll.useQuery({
      tournamentId,
      categoryId: categoryId || undefined,
    });

  const createMutation = trpc.competitors.create.useMutation();
  const updateMutation = trpc.competitors.update.useMutation();
  const deleteMutation = trpc.competitors.delete.useMutation();

  const handleSave = async (
    competitorData: Omit<Competitor, "id" | "tournamentId">,
  ) => {
    try {
      if (editingCompetitor) {
        await updateMutation.mutateAsync({
          tournamentId,
          competitorId: editingCompetitor.id,
          ...competitorData,
        });
      } else {
        await createMutation.mutateAsync({
          tournamentId,
          firstName: competitorData.firstName,
          lastName: competitorData.lastName,
          club: competitorData.club,
          belt: competitorData.belt || "1º – 3º Dan",
          categoryId: competitorData.categoryId,
          birthDate: competitorData.birthDate,
          weight: competitorData.weight
            ? Number(competitorData.weight)
            : undefined,
        });
      }
      setIsFormOpen(false);
      setEditingCompetitor(undefined);

      utils.competitors.getAll.invalidate({ tournamentId });

      if (categoryId && competitorData.categoryId !== categoryId) {
        onCategoryChange(competitorData.categoryId);
      }
    } catch (error) {
      console.error("Failed to save competitor:", error);
    }
  };

  const handleDelete = async (competitorId: string) => {
    if (confirm("Are you sure you want to delete this competitor?")) {
      try {
        await deleteMutation.mutateAsync({
          tournamentId,
          competitorId,
        });
        utils.competitors.getAll.invalidate({ tournamentId });
      } catch (error) {
        console.error("Failed to delete competitor:", error);
      }
    }
  };

  const handleOpenMockModal = () => {
    setMockAmount(tournamentAreas * 20);
    setIsMockModalOpen(true);
  };

  const generateMockCompetitors = async () => {
    const amount = mockAmount;

    if (isNaN(amount) || amount <= 0) {
      alert("Por favor ingresa un número válido mayor a 0.");
      return;
    }

    setIsMockModalOpen(false);

    if (!categories || categories.length === 0) {
      alert("No hay categorías creadas para asignar competidores.");
      return;
    }

    setIsGenerating(true);

    const maleNames = [
      "Liam",
      "Noah",
      "Oliver",
      "Elijah",
      "Mateo",
      "Lucas",
      "Hugo",
      "Martin",
      "Benjamin",
      "James",
      "Alexander",
      "Daniel",
    ];
    const femaleNames = [
      "Emma",
      "Olivia",
      "Ava",
      "Charlotte",
      "Sophia",
      "Mia",
      "Lucia",
      "Martina",
      "Isabella",
      "Amelia",
      "Harper",
      "Evelyn",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Gomez",
      "Lopez",
      "Diaz",
      "Perez",
    ];
    const clubs = [
      "Tigers TKD",
      "Dragon Martial Arts",
      "Elite Fighters",
      "Kick Masters",
      "Do San",
      "Chon Ji",
    ];
    const countries = ["ARG", "BRA", "USA", "CAN", "CHI", "URU", "ESP"];

    const mockCompetitors = Array.from({ length: amount }).map(() => {
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];
      const targetGender = randomCategory.gender || "MALE";
      const namesList = targetGender === "FEMALE" ? femaleNames : maleNames;

      // Generar edad aproximada según categoría
      let age = 20;
      if (randomCategory.ageGroup.includes("Micro")) age = 6;
      else if (randomCategory.ageGroup.includes("Pre-Mini")) age = 8;
      else if (randomCategory.ageGroup.includes("Mini")) age = 10;
      else if (randomCategory.ageGroup.includes("Infantil")) age = 12;
      else if (randomCategory.ageGroup.includes("Cadete")) age = 14;
      else if (randomCategory.ageGroup.includes("Juvenil")) age = 16;
      else if (randomCategory.ageGroup.includes("Adulto")) age = 25;
      else if (randomCategory.ageGroup.includes("Senior")) age = 40;
      else if (randomCategory.ageGroup.includes("Veterano")) age = 50;

      // Añadir algo de variabilidad a la edad (+/- 1 año, excepto micro)
      age += Math.floor(Math.random() * 3) - 1;
      const birthYear = new Date().getFullYear() - age;
      const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(
        2,
        "0",
      );
      const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(
        2,
        "0",
      );

      // Peso aproximado
      let weight = 60 + Math.floor(Math.random() * 30);
      if (age < 18) weight = 20 + age * 2 + Math.floor(Math.random() * 10);

      return {
        categoryId: randomCategory.id,
        firstName: namesList[Math.floor(Math.random() * namesList.length)],
        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
        club: clubs[Math.floor(Math.random() * clubs.length)],
        belt: randomCategory.beltLevel || "1º – 3º Dan",
        birthDate: `${birthYear}-${birthMonth}-${birthDay}`,
        weight: weight,
      };
    });

    const toastId = toast.loading(
      `Generando ${amount} competidores aleatorios...`,
    );
    try {
      console.log(`Iniciando generación de ${amount} competidores...`);
      await Promise.all(
        mockCompetitors.map(async (comp, index) => {
          const result = await createMutation.mutateAsync({
            tournamentId,
            ...comp,
          });
          console.log(
            `Competidor ${index + 1}/${amount} creado: ${comp.firstName} ${comp.lastName}`,
          );
          return result;
        }),
      );
      console.log("¡Generación completada!");
      toast.success(`${amount} competidores generados con éxito`, {
        id: toastId,
      });
      utils.competitors.getAll.invalidate({ tournamentId });
    } catch (err) {
      console.error("Error generating mock data", err);
      toast.error("Hubo un error al generar los competidores", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {categoryId
            ? "Competidores en esta categoría"
            : "Todos los competidores"}{" "}
          ({competitors.length})
        </h2>
        {!isReadOnly && (
          <div className="flex space-x-2">
            <Button
              onClick={handleOpenMockModal}
              disabled={isGenerating}
              variant="primary"
              className={isGenerating ? "!bg-purple-400" : "!bg-purple-600"}
            >
              {isGenerating ? "Generando..." : "Generar Random [DEV]"}
            </Button>
            <Button
              onClick={() => setIsFormOpen(true)}
              disabled={loading}
              variant="primary"
            >
              Add Competitor
            </Button>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsFormOpen(false);
                setEditingCompetitor(undefined);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mt-2">
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
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading competitors...</p>
      ) : competitors.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-50 dark:bg-slate-800 rounded-lg">
          No competitors registered yet.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Club / Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Seeded
                </th>
                {!isReadOnly && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {competitors.map((comp) => (
                <tr
                  key={comp.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {comp.firstName} {comp.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-200 font-medium mb-1">
                      {categories.find((c) => c.id === comp.categoryId)?.name ||
                        "Sin categoría"}
                    </div>
                    <div className="flex gap-2 text-xs font-mono">
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold">
                        {comp.birthDate
                          ? `${new Date().getFullYear() - new Date(comp.birthDate).getFullYear()}y`
                          : "-"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${comp.gender === "MALE" ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400" : "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400"}`}
                      >
                        {comp.gender === "MALE" ? "M" : "F"}
                      </span>
                      <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md font-bold">
                        {comp.weight ? `${comp.weight}kg` : "-"}
                      </span>
                      <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 px-2 py-0.5 rounded-md font-bold truncate max-w-[100px]">
                        {comp.belt || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {comp.club}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {comp.country}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {comp.isSeeded ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        Seed
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">
                        -
                      </span>
                    )}
                  </td>
                  {!isReadOnly && (
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
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mock Generation Modal */}
      {isMockModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-2">
              Generar Competidores
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              ¿Cuántos competidores deseas generar en total? <br />
              (Recomendado para {tournamentAreas} área(s):{" "}
              {tournamentAreas * 20})
            </p>
            <label
              htmlFor="mockAmount"
              className="text-gray-400 text-sm mb-2 block"
            >
              Cantidad de competidores
            </label>
            <input
              id="mockAmount"
              type="number"
              min="1"
              value={mockAmount}
              onChange={(e) => setMockAmount(parseInt(e.target.value, 10))}
              className="w-full px-4 py-3 bg-[#121A2F] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mb-6"
            />
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => setIsMockModalOpen(false)}
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button onClick={generateMockCompetitors} variant="primary">
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
