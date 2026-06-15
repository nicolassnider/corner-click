import React, { useState, useEffect } from 'react';
import type { Competitor } from '@corner-click/types';

interface CompetitorFormProps {
  initialData?: Competitor;
  categoryId: string;
  onSave: (competitor: Omit<Competitor, 'id' | 'tournamentId'>) => void;
  onCancel: () => void;
}

export const CompetitorForm: React.FC<CompetitorFormProps> = ({
  initialData,
  categoryId,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    club: '',
    country: '',
    isSeeded: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        club: initialData.club,
        country: initialData.country,
        isSeeded: initialData.isSeeded || false,
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      categoryId,
      ...formData
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-4">
      <h3 className="text-xl font-bold mb-4">{initialData ? 'Edit Competitor' : 'Add Competitor'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={formData.firstName}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={formData.lastName}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Club / School</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={formData.club}
              onChange={e => setFormData({ ...formData, club: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={formData.country}
              onChange={e => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="isSeeded"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={formData.isSeeded}
            onChange={e => setFormData({ ...formData, isSeeded: e.target.checked })}
          />
          <label htmlFor="isSeeded" className="ml-2 block text-sm text-gray-900">
            Seed (Top 3 from previous edition)
          </label>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save Competitor
          </button>
        </div>
      </form>
    </div>
  );
};
