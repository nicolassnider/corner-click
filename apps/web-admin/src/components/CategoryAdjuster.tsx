import React, { useState, useEffect, useMemo } from "react";
import type { Category, Competitor } from "@corner-click/types";
import { trpc } from "@corner-click/api-client";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  pointerWithin,
  Modifier,
} from "@dnd-kit/core";
import toast from "react-hot-toast";
import { Button, Card, Input } from "@corner-click/ui";

interface CategoryAdjusterProps {
  tournamentId: string;
  isReadOnly?: boolean;
}

const snapCenterToCursor: Modifier = ({
  transform,
  activatorEvent,
  draggingNodeRect,
}) => {
  if (activatorEvent && draggingNodeRect) {
    const isMouseEvent = "clientY" in activatorEvent;
    const clientY = isMouseEvent
      ? (activatorEvent as MouseEvent).clientY
      : (activatorEvent as TouchEvent).touches?.[0]?.clientY;
    const clientX = isMouseEvent
      ? (activatorEvent as MouseEvent).clientX
      : (activatorEvent as TouchEvent).touches?.[0]?.clientX;

    if (clientY !== undefined && clientX !== undefined) {
      const offsetY =
        clientY - (draggingNodeRect.top + draggingNodeRect.height / 2);
      const offsetX =
        clientX - (draggingNodeRect.left + draggingNodeRect.width / 2);

      return {
        ...transform,
        x: transform.x + offsetX,
        y: transform.y + offsetY,
      };
    }
  }
  return transform;
};

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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: competitor.id,
    data: { competitor },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 border rounded-lg shadow-sm cursor-grab active:cursor-grabbing ${
        isDragging
          ? "opacity-40 z-50 relative border-blue-500 bg-blue-900/40"
          : "bg-slate-700/50 border-slate-600 hover:border-blue-400 hover:bg-slate-700"
      }`}
    >
      <div className="font-medium text-sm text-slate-200">
        {competitor.firstName} {competitor.lastName}
      </div>
      <div className="text-xs text-slate-400 mt-1">
        {competitor.club || "Sin Club"}
        <span className="mx-1 text-slate-600">•</span>
        {competitor.weight ? `${competitor.weight}kg` : "N/A kg"}
        {calculateAge(competitor.birthDate) !== null && (
          <>
            <span className="mx-1 text-slate-600">•</span>
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
      className={`flex-shrink-0 w-80 p-4 rounded-xl border flex flex-col transition-colors ${
        isOver
          ? "bg-blue-950/40 border-blue-500 shadow-inner shadow-blue-900/20"
          : "bg-slate-800/80 border-slate-700"
      }`}
    >
      <div className="mb-4 pb-3 border-b border-slate-700/60">
        <h4
          className="font-bold text-slate-100 truncate text-sm uppercase tracking-wide"
          title={category.name}
        >
          {category.name}
        </h4>
        <div className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
          {category.ageGroup} | {category.beltLevel}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              competitors.length >= 4
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : competitors.length === 0
                  ? "bg-slate-800 text-slate-500 border-slate-700"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            {competitors.length} inscritos
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[150px] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pr-2 flex flex-col gap-2">
        {competitors.map((c) => (
          <DraggableCompetitor key={c.id} competitor={c} />
        ))}
        {competitors.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-700/60 rounded-lg opacity-50">
            <span className="text-2xl mb-2">📥</span>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Arrastra aquí
            </span>
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
  const [processing, setProcessing] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [activeDragCompetitor, setActiveDragCompetitor] =
    useState<Competitor | null>(null);

  const { data: categories = [], isLoading: loadingCategories } =
    trpc.categories.getAll.useQuery({
      tournamentId,
    });

  const { data: competitors = [], isLoading: loadingCompetitors } =
    trpc.competitors.getAll.useQuery({
      tournamentId,
    });

  const utils = trpc.useUtils();
  const mergeEmptyMutation = trpc.categories.mergeEmpty.useMutation();
  const updateCompetitorMutation = trpc.competitors.update.useMutation();

  const handleMergeEmpty = async () => {
    if (
      !confirm(
        "Esto eliminará categorías vacías y unirá automáticamente las que tengan menos de 4 competidores. ¿Proceder?",
      )
    ) {
      return;
    }
    setProcessing(true);
    try {
      await mergeEmptyMutation.mutateAsync({ tournamentId });
      utils.categories.getAll.invalidate({ tournamentId });
      utils.competitors.getAll.invalidate({ tournamentId });
      toast.success("Categorías ajustadas automáticamente.");
    } catch (err) {
      console.error(err);
      toast.error("Error al ajustar categorías.");
    } finally {
      setProcessing(false);
    }
  };

  const moveCompetitor = async (
    competitorId: string,
    newCategoryId: string,
  ) => {
    setProcessing(true);
    try {
      await updateCompetitorMutation.mutateAsync({
        tournamentId,
        competitorId,
        categoryId: newCategoryId,
      });
      utils.competitors.getAll.invalidate({ tournamentId });
      toast.success("Competidor movido con éxito.");
    } catch (err) {
      console.error(err);
      toast.error("Error al mover competidor.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((c: Category) => {
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
    const comp = competitors.find((c: Competitor) => c.id === active.id);
    if (comp) setActiveDragCompetitor(comp);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragCompetitor(null);
    const { active, over } = event;

    if (!over) return; // Dropped outside

    const competitorId = active.id as string;
    const newCategoryId = over.id as string;

    const competitor = competitors.find(
      (c: Competitor) => c.id === competitorId,
    );
    if (!competitor || competitor.categoryId === newCategoryId) return;

    // Optimistic UI update
    const previousCompetitors = utils.competitors.getAll.getData({
      tournamentId,
    });
    if (previousCompetitors) {
      utils.competitors.getAll.setData(
        { tournamentId },
        previousCompetitors.map((c: Competitor) =>
          c.id === competitorId ? { ...c, categoryId: newCategoryId } : c,
        ),
      );
    }

    try {
      if (isReadOnly) throw new Error("Solo lectura");
      await updateCompetitorMutation.mutateAsync({
        tournamentId,
        competitorId,
        categoryId: newCategoryId,
      });
      toast.success("Competidor movido con éxito");
    } catch (error) {
      console.error("Error updating competitor:", error);
      toast.error("No se pudo mover el competidor");
      // Revert on failure
      if (previousCompetitors) {
        utils.competitors.getAll.setData({ tournamentId }, previousCompetitors);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Ajuste Manual de Categorías
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Reorganiza a los competidores arrastrándolos entre categorías, o
            utiliza el algoritmo de fusión automática.
          </p>
        </div>
        {!isReadOnly && (
          <div>
            <Button
              onClick={handleMergeEmpty}
              disabled={processing || loadingCategories || loadingCompetitors}
              variant="primary"
            >
              {processing ? "Fusionando..." : "Fusión Automática (< 4)"}
            </Button>
          </div>
        )}
      </div>

      <Card
        padding="md"
        className="space-y-4 bg-slate-900/60 border-slate-800 backdrop-blur-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-100">
            Tablero de Categorías ({categories.length})
          </h3>
          <div className="w-full md:w-72">
            <Input
              type="text"
              placeholder="Buscar categoría..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>

        {loadingCategories || loadingCompetitors ? (
          <div className="py-12 text-center text-slate-500">
            Cargando tablero...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-800/50 rounded-lg">
            No se encontraron categorías.
          </div>
        ) : (
          <div className="relative mt-4">
            {processing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                  <span className="text-blue-400 font-semibold tracking-widest uppercase text-sm">
                    Procesando...
                  </span>
                </div>
              </div>
            )}

            <DndContext
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              autoScroll={false}
            >
              <div className="flex overflow-x-auto pb-6 pt-2 gap-4 snap-x">
                {filteredCategories.map((cat: Category) => (
                  <div key={cat.id} className="snap-start">
                    <CategoryDroppable
                      category={cat}
                      competitors={competitors.filter(
                        (c: Competitor) => c.categoryId === cat.id,
                      )}
                    />
                  </div>
                ))}
              </div>

              <DragOverlay modifiers={[snapCenterToCursor]}>
                {activeDragCompetitor ? (
                  <div className="p-3 w-[280px] bg-slate-700 border-2 border-blue-500 rounded-lg shadow-2xl opacity-95 cursor-grabbing m-0">
                    <div className="font-bold text-sm text-slate-100">
                      {activeDragCompetitor.firstName}{" "}
                      {activeDragCompetitor.lastName}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {activeDragCompetitor.club || "Sin Club"} •{" "}
                      {activeDragCompetitor.weight
                        ? `${activeDragCompetitor.weight}kg`
                        : "N/A kg"}
                      {calculateAge(activeDragCompetitor.birthDate) !== null &&
                        ` • ${calculateAge(activeDragCompetitor.birthDate)} años`}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </Card>
    </div>
  );
};
