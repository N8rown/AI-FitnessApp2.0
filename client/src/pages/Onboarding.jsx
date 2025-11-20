import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Onboarding = () => {
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [goals, setGoals] = useState('');
  const [equipment, setEquipment] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', { 
        height_ft: heightFt, 
        height_in: heightIn, 
        weight_lbs: weightLbs, 
        goals,
        equipment 
      });
      navigate('/');
    } catch (error) {
      alert('Update failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Your Stats</h2>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-4 mb-4">
          <div className="w-1/2">
            <label className="block text-gray-700 mb-2">Height (Ft)</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
              required
            />
          </div>
          <div className="w-1/2">
            <label className="block text-gray-700 mb-2">Height (In)</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded"
              value={heightIn}
              onChange={(e) => setHeightIn(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Weight (Lbs)</label>
          <input 
            type="number" 
            className="w-full p-2 border rounded"
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Available Equipment</label>
          <input 
            type="text" 
            className="w-full p-2 border rounded"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="e.g., Dumbbells, Gym, None"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Fitness Goals</label>
          <textarea 
            className="w-full p-2 border rounded"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="e.g., Build muscle, Lose weight, Cardio"
          />
        </div>
        <button type="submit" className="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700">
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default Onboarding;