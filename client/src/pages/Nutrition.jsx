import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const Nutrition = () => {
  const [logs, setLogs] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [form, setForm] = useState({ food_item: '', calories: '', protein: '', carbs: '', fats: '' });

  const fetchLogs = async () => {
    try {
      const res = await api.get('/nutrition');
      setLogs(res.data.logs);
      setTotals(res.data.totals);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/nutrition', form);
      setForm({ food_item: '', calories: '', protein: '', carbs: '', fats: '' });
      fetchLogs();
    } catch (error) {
      alert('Failed to log food');
    }
  };

  const handleAutoFill = async () => {
    if (!form.food_item) return alert("Please enter a food item first.");
    try {
      const res = await api.post('/nutrition/analyze', { food_item: form.food_item });
      if (res.data.success) {
        const { calories, protein, carbs, fats } = res.data.data;
        setForm(prev => ({ ...prev, calories, protein, carbs, fats }));
      } else {
        alert(res.data.message || "Could not auto-fill.");
      }
    } catch (error) {
      console.error(error);
      alert("Auto-fill failed.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Nutrition Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4">Log Food</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Food Item</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="w-full p-2 border rounded"
                  value={form.food_item}
                  onChange={(e) => setForm({...form, food_item: e.target.value})}
                  required
                  placeholder="e.g. 1 cup of rice"
                />
                <button 
                  type="button"
                  onClick={handleAutoFill}
                  className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm whitespace-nowrap"
                >
                  Auto-Fill
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Calories</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded"
                  value={form.calories}
                  onChange={(e) => setForm({...form, calories: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Protein (g)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded"
                  value={form.protein}
                  onChange={(e) => setForm({...form, protein: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Carbs (g)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded"
                  value={form.carbs}
                  onChange={(e) => setForm({...form, carbs: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fats (g)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded"
                  value={form.fats}
                  onChange={(e) => setForm({...form, fats: e.target.value})}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
              Add Entry
            </button>
          </form>
        </div>

        {/* Summary & List */}
        <div className="space-y-6">
          {/* Daily Summary */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Daily Summary</h2>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-500">Calories</div>
                <div className="font-bold">{totals.calories}</div>
              </div>
              <div className="bg-blue-50 p-2 rounded">
                <div className="text-xs text-blue-500">Protein</div>
                <div className="font-bold text-blue-700">{totals.protein}g</div>
              </div>
              <div className="bg-orange-50 p-2 rounded">
                <div className="text-xs text-orange-500">Carbs</div>
                <div className="font-bold text-orange-700">{totals.carbs}g</div>
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <div className="text-xs text-yellow-500">Fats</div>
                <div className="font-bold text-yellow-700">{totals.fats}g</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Feedback:</strong> {totals.protein > 100 ? "Great protein intake!" : "Try to increase protein for muscle recovery."}</p>
            </div>
          </div>

          {/* Log List */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Today's Logs</h2>
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">{log.food_item}</div>
                    <div className="text-xs text-gray-500">P: {log.protein}g | C: {log.carbs}g | F: {log.fats}g</div>
                  </div>
                  <div className="font-bold text-gray-700">{log.calories} kcal</div>
                </div>
              ))}
              {logs.length === 0 && <div className="text-gray-500 text-center">No logs today.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nutrition;