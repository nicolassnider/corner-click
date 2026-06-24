import React, { useState, useEffect, useMemo } from "react";
import type { Category, Competitor } from "@corner-click/types";
import {
  getCategories,
  mergeCategoriesWithFewCompetitors,
} from "../services/categoryService";
import { getCompetitors, updateCompetitor } from "../services/competitorService";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import toast from "react-hot-toast";

interface CategoryAdjusterProps {
  tournamentId: string;
  isReadOnly?: boolean;
}

function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function DraggableCompetitor({ competitor }: { competitor: Competitor }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: competitor.id,
      data: { competitor },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 mb-2 bg-white border rounded-lg shadow-sm cursor-grab active:cursor-grabbing ${
        isDragging
          ? "opacity-40 z-50 relative border-indigo-500"
          : "border-gray-200 hover:border-indigo-300"
      }`}
    >
      <div className="font-medium text-sm text-gray-800">
        {competitor.firstName} {competitor.lastName}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {competitor.club || "Sin Club"}
        <span className="mx-1">•</span>
        {competitor.weight ? `${competitor.weight}kg` : "N/A kg"}
        {calculateAge(competitor.birthDate) !== null && (
          <>
            <span className="mx-1">•</span>
            {calculateAge(competitor.birthDate)} años
          </>
        )}
      </div>
    </div>
  );
}

function CategoryDroppable({
  category,
  competitors,
}: {
  category: Category;
  competitors: Competitor[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 p-4 rounded-xl border-2 flex flex-col ${
        isOver
          ? "bg-indigo-50 border-indigo-400 shadow-inner"
          : "bg-gray-50/80 border-gray-200"
      }`}
    >
      <div className="mb-4 pb-3 border-b border-gray-200/60">
        <h4 className="font-bold text-gray-900 truncate" title={category.name}>{category.name}</h4>
        <div className="text-xs text-gray-500 mt-1">
          {category.ageGroup} | {category.beltLevel}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              competitors.length >= 4
                ? "bg-green-100 text-green-700"
                : competitors.length === 0
                  ? "bg-gray-200 text-gray-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >
            {competitors.length} inscritos
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[150px] scrollbar-thin scrollbar-thumb-gray-300">
        {competitors.map((c) => (
          <DraggableCompetitor key={c.id} competitor={c} />
        ))}
        {competitors.length === 0 && (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300/60 rounded-lg">
            <span className="text-sm text-gray-400 font-medium">Arrastra aquí</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const CategoryAdjuster: React.FC<CategoryAdjusterProps> = ({
  tournamentId,
  isReadOnly = false,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [activeDragCompetitor, setActiveDragCompetitor] = useState<Competitor | null>(null);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catsData, compsData] = await Promise.all([
        getCategories(tournamentId),
        getCompetitors(tournamentId),
      ]);
      setCategories(catsData);
      setCompetitors(compsData);
    } catch (error) {
      console.error("Failed to load data for adjuster:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (
      !confirm(
        "Esto moverá a los competidores de categorías con menos de 4 inscritos a la siguiente categoría de peso y eliminará las categorías vacías. ¿Estás seguro?",
      )
    ) {
      return;
    }

    setMerging(true);
    try {
      await mergeCategoriesWithFewCompetitors(tournamentId);
      await loadData();
      toast.success("Fusión y optimización completada.");
    } catch (error) {
      console.error("Failed to merge categories:", error);
      toast.error("Error al fusionar categorías.");
    } finally {
      setMerging(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (!filterText) return true;
      const search = filterText.toLowerCase();
      return (
        c.name.toLowerCase().includes(search) ||
        c.ageGroup.toLowerCase().includes(search) ||
        c.beltLevel.toLowerCase().includes(search)
      );
    });
  }, [categories, filterText]);

  // Drag and Drop Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const comp = competitors.find((c) => c.id === active.id);
    if (comp) setActiveDragCompetitor(comp);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragCompetitor(null);
    const { active, over } = event;

    if (!over) return; // Dropped outside
    
    const competitorId = active.id as string;
    const newCategoryId = over.id as string;
    
    const competitor = competitors.find((c) => c.id === competitorId);
    if (!competitor || competitor.categoryId === newCategoryId) return;

    // Optimistic UI update
    const previousCategoryId = competitor.categoryId;
    setCompetitors((prev) =>
      prev.map((c) =>
        c.id === competitorId ? { ...c, categoryId: newCategoryId } : c
      )
    );

    try {
      if (isReadOnly) throw new Error("Solo lectura");
      await updateCompetitor(tournamentId, competitorId, { categoryId: newCategoryId });
      toast.success("Competidor movido con éxito");
    } catch (error) {
      console.error("Error updating competitor:", error);
      toast.error("No se pudo mover el competidor");
      // Revert on failure
      setCompetitors((prev) =>
        prev.map((c) =>
          c.id === competitorId ? { ...c, categoryId: previousCategoryId } : c
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Ajuste Manual de Categorías
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Reorganiza a los competidores arrastrándolos entre categorías, o utiliza
            el algoritmo de fusión automática.
          </p>
        </div>
        {!isReadOnly && (
          <div>
            <button
              onClick={handleMerge}
              disabled={merging || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {merging ? "Fusionando..." : "Fusión Automática (< 4)"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-950">
            Tablero de Categorías ({categories.length})
          </h3>
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            Cargando tablero...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
            No se encontraron categorías.
          </div>
        ) : (
          <div className="relative mt-4">
            {merging && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                  <span className="text-indigo-800 font-semibold">Procesando...</span>
                </div>
              </div>
            )}
            
            <DndContext 
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex overflow-x-auto pb-6 pt-2 gap-4 snap-x">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="snap-start">
                    <CategoryDroppable 
                      category={cat} 
                      competitors={competitors.filter(c => c.categoryId === cat.id)} 
                    />
                  </div>
                ))}
              </div>
              
              <DragOverlay>
                {activeDragCompetitor ? (
                  <div className="p-3 bg-white border-2 border-indigo-500 rounded-lg shadow-xl opacity-90 scale-105 cursor-grabbing">
                    <div className="font-bold text-sm text-gray-800">
                      {activeDragCompetitor.firstName} {activeDragCompetitor.lastName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {activeDragCompetitor.club || "Sin Club"} • {activeDragCompetitor.weight ? `${activeDragCompetitor.weight}kg` : "N/A kg"}
                      {calculateAge(activeDragCompetitor.birthDate) !== null && ` • ${calculateAge(activeDragCompetitor.birthDate)} años`}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
};
