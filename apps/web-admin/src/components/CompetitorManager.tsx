import React, { useState, useEffect } from "react";
import type { Competitor, Category } from "@corner-click/types";
import {
  getCompetitors,
  addCompetitor,
  updateCompetitor,
  deleteCompetitor,
} from "../services/competitorService";
import { CompetitorForm } from "./CompetitorForm";

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
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<
    Competitor | undefined
  >();
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
      console.error("Failed to load competitors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (
    competitorData: Omit<Competitor, "id" | "tournamentId">,
  ) => {
    try {
      if (editingCompetitor) {
        await updateCompetitor(
          tournamentId,
          editingCompetitor.id,
          competitorData,
        );
      } else {
        await addCompetitor(tournamentId, competitorData);
      }
      setIsFormOpen(false);
      setEditingCompetitor(undefined);

      if (categoryId && competitorData.categoryId !== categoryId) {
        onCategoryChange(competitorData.categoryId);
      } else {
        await loadCompetitors();
      }
    } catch (error) {
      console.error("Failed to save competitor:", error);
    }
  };

  const handleDelete = async (competitorId: string) => {
    if (confirm("Are you sure you want to delete this competitor?")) {
      try {
        await deleteCompetitor(tournamentId, competitorId);
        await loadCompetitors();
      } catch (error) {
        console.error("Failed to delete competitor:", error);
      }
    }
  };

  const generateMockCompetitors = async () => {
    const defaultAmount = tournamentAreas * 20;
    const input = prompt(
      `¿Cuántos competidores deseas generar en total? (Recomendado para ${tournamentAreas} área(s): ${defaultAmount})`,
      defaultAmount.toString(),
    );

    if (!input) return;

    const amount = parseInt(input, 10);
    if (isNaN(amount) || amount <= 0) {
      alert("Por favor ingresa un número válido mayor a 0.");
      return;
    }

    if (!categories || categories.length === 0) {
      alert("No hay categorías creadas para asignar competidores.");
      return;
    }

    setLoading(true);

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
        country: countries[Math.floor(Math.random() * countries.length)],
        gender: targetGender,
        birthDate: `${birthYear}-${birthMonth}-${birthDay}`,
        weight: weight,
        belt: randomCategory.beltLevel || "1º – 3º Dan",
        isSeeded: Math.random() > 0.8,
      };
    });

    const toastId = toast.loading(
      `Generando ${amount} competidores aleatorios...`,
    );
    try {
      console.log(`Iniciando generación de ${amount} competidores...`);
      await Promise.all(
        mockCompetitors.map(async (comp, index) => {
          const result = await addCompetitor(tournamentId, comp);
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
      await loadCompetitors();
    } catch (err) {
      console.error("Error generating mock data", err);
      toast.error("Hubo un error al generar los competidores", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {categoryId
            ? "Competidores en esta categoría"
            : "Todos los competidores"}{" "}
          ({competitors.length})
        </h2>
        {!isReadOnly && (
          <div className="flex space-x-2">
            <button
              onClick={generateMockCompetitors}
              disabled={loading}
              className={`px-4 py-2 text-white rounded-md ${loading ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}
            >
              {loading ? "Generando..." : "Generar Random [DEV]"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsFormOpen(false);
                setEditingCompetitor(undefined);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
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
        <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
          No competitors registered yet.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Club / Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seeded
                </th>
                {!isReadOnly && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitors.map((comp) => (
                <tr key={comp.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {comp.firstName} {comp.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium mb-1">
                      {categories.find((c) => c.id === comp.categoryId)?.name ||
                        "Sin categoría"}
                    </div>
                    <div className="flex gap-2 text-xs font-mono">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                        {comp.birthDate
                          ? `${new Date().getFullYear() - new Date(comp.birthDate).getFullYear()}y`
                          : "-"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${comp.gender === "MALE" ? "bg-cyan-50 text-cyan-700" : "bg-pink-50 text-pink-700"}`}
                      >
                        {comp.gender === "MALE" ? "M" : "F"}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-bold">
                        {comp.weight ? `${comp.weight}kg` : "-"}
                      </span>
                      <span className="bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded-md font-bold truncate max-w-[100px]">
                        {comp.belt || "-"}
                      </span>
                    </div>
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
    </div>
  );
};
