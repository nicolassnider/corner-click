import React, { useState, useEffect } from "react";
import type { Judge } from "@corner-click/types";
import { CornerRole } from "@corner-click/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  judge: Judge | null;
  judges: Judge[];
  tournamentAreas: number;
  tournamentId: string;
  onAssign: (
    judgeId: string,
    assignment: { areaId: string; cornerId: string },
  ) => Promise<void>;
}

export default function AssignJudgeModal({
  isOpen,
  onClose,
  judge,
  judges,
  tournamentAreas,
  tournamentId,
  onAssign,
}: Props) {
  const [areaId, setAreaId] = useState("1");
  const [cornerId, setCornerId] = useState(CornerRole.CORNER_1 as string);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when opened with a new judge
  useEffect(() => {
    if (judge) {
      setAreaId(judge.currentAssignment?.areaId || "1");
      setCornerId(judge.currentAssignment?.cornerId || CornerRole.CORNER_1);
    }
  }, [judge]);

  if (!isOpen || !judge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const existingAssignment = judges.find(
      (j) =>
        j.id !== judge.id &&
        j.currentAssignment?.areaId === areaId &&
        j.currentAssignment?.cornerId === cornerId,
    );

    if (existingAssignment) {
      alert(
        `Cannot assign: ${existingAssignment.name} is already assigned to Area ${areaId} as ${cornerId}. Please unassign them first.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await onAssign(judge.id!, { areaId, cornerId });
      onClose();
    } catch (error) {
      console.error("Failed to assign", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white tracking-wide">
            Assign Judge
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="text-gray-400 hover:text-white transition-colors"
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
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xl uppercase">
              {judge.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">
                {judge.name}
              </h3>
              <p className="text-sm font-mono text-gray-500 dark:text-gray-400 tracking-widest">
                PIN: {judge.pin}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="area-select"
                className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1"
              >
                Area / Tatami
              </label>
              <select
                id="area-select"
                aria-label="Area / Tatami"
                title="Area / Tatami"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 font-medium"
              >
                {Array.from({ length: tournamentAreas }).map((_, i) => (
                  <option key={i} value={String(i + 1)}>
                    Area {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="corner-select"
                className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1"
              >
                Corner / Role
              </label>
              <select
                id="corner-select"
                aria-label="Corner / Role"
                title="Corner / Role"
                value={cornerId}
                onChange={(e) => setCornerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 font-medium"
              >
                <option value={CornerRole.CORNER_1}>Corner 1</option>
                <option value={CornerRole.CORNER_2}>Corner 2</option>
                <option value={CornerRole.CORNER_3}>Corner 3</option>
                <option value={CornerRole.CORNER_4}>Corner 4</option>
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-200 font-bold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                {submitting ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
