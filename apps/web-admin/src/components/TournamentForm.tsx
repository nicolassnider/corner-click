import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/apiClient';
import type { Tournament } from '@corner-click/types';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

interface Props {
  initialData?: Tournament | null;
  onCancel: () => void;
  onCreated: () => void;
}

export default function TournamentForm({ initialData, onCancel, onCreated }: Props) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [areas, setAreas] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDate(initialData.date ? initialData.date.substring(0, 10) : '');
      setLocation(initialData.location || '');
      setAreas(initialData.areas || (initialData as any).rings || 1);
    } else {
      setName('');
      setDate('');
      setLocation('');
      setAreas(1);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = initialData 
        ? `${API_URL}/api/tournaments/${initialData.id}` 
        : `${API_URL}/api/tournaments`;
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({ name, date, location, areas: Number(areas) })
      });
      if (res.ok) {
        onCreated();
      } else {
        console.error(initialData ? 'Failed to update tournament' : 'Failed to create tournament');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-100 mt-12">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">
          {initialData ? 'Edit Tournament' : 'Create New Tournament'}
        </h2>
        <p className="text-gray-500 mt-2">
          {initialData ? 'Update the details for this event.' : 'Set up the basic details for your upcoming event.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="tournament-name" className="block text-sm font-bold text-gray-700 mb-2">Tournament Name</label>
          <input 
            id="tournament-name"
            type="text" 
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900"
            placeholder="e.g., Copa America ITF 2026"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="tournament-date" className="block text-sm font-bold text-gray-700 mb-2">Date</label>
            <input 
              id="tournament-date"
              type="date" 
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="tournament-location" className="block text-sm font-bold text-gray-700 mb-2">Location</label>
            <input 
              id="tournament-location"
              type="text" 
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900"
              placeholder="City, Stadium"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tournament-areas" className="block text-sm font-bold text-gray-700 mb-2">Number of Areas</label>
          <input 
            id="tournament-areas"
            type="number" 
            min="1" max="20"
            required
            value={areas}
            onChange={e => setAreas(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900"
          />
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-6 py-3 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-8 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg disabled:opacity-50 transition-transform transform hover:-translate-y-1"
          >
            {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </div>
  );
}
