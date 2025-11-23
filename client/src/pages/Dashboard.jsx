import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const Dashboard = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Generation State
  const [showGenModal, setShowGenModal] = useState(false);
  const [genType, setGenType] = useState('single');
  const [genFocus, setGenFocus] = useState('');
  const [genDays, setGenDays] = useState(3);

  // Logging State
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [logData, setLogData] = useState({}); // { exerciseIndex: { setIndex: { weight: 0, reps: 0 } } }

  const fetchScheduled = async () => {
    try {
      const res = await api.get('/workouts/scheduled');
      setWorkouts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await api.post('/workouts/generate', {
        type: genType,
        focus: genFocus,
        days_per_week: genDays
      });
      setShowGenModal(false);
      await fetchScheduled();
    } catch (error) {
      alert('Failed to generate workout');
    } finally {
      setLoading(false);
    }
  };

  const startLogging = (workout) => {
    try {
      const plan = JSON.parse(workout.plan);
      setActiveWorkout({ ...workout, parsedPlan: plan });
      // Initialize log data structure
      const initialLog = {};
      plan.exercises.forEach((ex, i) => {
        initialLog[i] = [];
        for(let s=0; s<ex.sets; s++) {
          initialLog[i].push({ weight: '', reps: ex.reps });
        }
      });
      setLogData(initialLog);
    } catch (e) {
      console.error("Error parsing plan", e);
    }
  };

  const updateLog = (exIndex, setIndex, field, value) => {
    const newLog = { ...logData };
    newLog[exIndex][setIndex][field] = value;
    setLogData(newLog);
  };

  const submitLog = async () => {
    if (!activeWorkout) return;
    try {
      await api.post(`/workouts/complete/${activeWorkout.id}`, {
        actual_data: logData
      });
      setActiveWorkout(null);
      fetchScheduled();
    } catch (error) {
      alert('Failed to complete workout');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this workout?')) return;
    try {
      await api.delete(`/workouts/${id}`);
      fetchScheduled();
    } catch (error) {
      alert('Failed to delete workout');
    }
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Upcoming Workouts</h1>
        <button 
          onClick={() => setShowGenModal(true)} 
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Generate New Workout
        </button>
      </div>

      {/* Generation Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Generate Workout</h2>
            <div className="mb-4">
              <label className="block mb-2">Type</label>
              <select 
                className="w-full border p-2 rounded"
                value={genType}
                onChange={(e) => setGenType(e.target.value)}
              >
                <option value="single">Single Day</option>
                <option value="weekly">Weekly Plan</option>
              </select>
            </div>
            
            {genType === 'single' ? (
              <div className="mb-4">
                <label className="block mb-2">Focus (e.g. Chest, Legs)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded"
                  value={genFocus}
                  onChange={(e) => setGenFocus(e.target.value)}
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block mb-2">Days per Week</label>
                <input 
                  type="number" 
                  className="w-full border p-2 rounded"
                  value={genDays}
                  onChange={(e) => setGenDays(e.target.value)}
                  min="1" max="7"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowGenModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logging Modal */}
      {activeWorkout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Log Workout: {activeWorkout.parsedPlan.focus}</h2>
            
            <div className="space-y-6">
              {activeWorkout.parsedPlan.exercises.map((ex, exIndex) => (
                <div key={exIndex} className="border p-4 rounded">
                  <h3 className="font-bold text-lg mb-2">{ex.name}</h3>
                  <div className="grid grid-cols-3 gap-4 mb-2 font-semibold text-sm text-gray-500">
                    <div>Set</div>
                    <div>Weight (lbs)</div>
                    <div>Reps</div>
                  </div>
                  {logData[exIndex]?.map((set, setIndex) => (
                    <div key={setIndex} className="grid grid-cols-3 gap-4 mb-2 items-center">
                      <div className="text-gray-600">Set {setIndex + 1}</div>
                      <input 
                        type="number" 
                        className="border p-1 rounded"
                        placeholder="Weight"
                        value={set.weight}
                        onChange={(e) => updateLog(exIndex, setIndex, 'weight', e.target.value)}
                      />
                      <input 
                        type="number" 
                        className="border p-1 rounded"
                        placeholder="Reps"
                        value={set.reps}
                        onChange={(e) => updateLog(exIndex, setIndex, 'reps', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setActiveWorkout(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={submitLog}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Complete Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout List */}
      <div className="grid gap-6">
        {workouts.map((workout) => {
          let plan;
          try {
            plan = JSON.parse(workout.plan);
          } catch (e) {
            plan = { focus: 'Legacy', exercises: [] };
          }

          return (
            <div key={workout.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl">{plan.focus} Workout</h3>
                  <div className="text-gray-500 text-sm">
                    Scheduled: {new Date(workout.scheduled_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => startLogging(workout)}
                    className="text-sm bg-green-100 text-green-600 px-3 py-1 rounded hover:bg-green-200 font-bold"
                  >
                    Start Workout
                  </button>
                  <button 
                    onClick={() => handleDelete(workout.id)}
                    className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 font-bold"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="text-gray-700">
                {plan.exercises.map((ex, i) => (
                  <div key={i}>• {ex.name}: {ex.sets} sets x {ex.reps} reps</div>
                ))}
              </div>
            </div>
          );
        })}
        {workouts.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            No scheduled workouts. Generate one to get started!
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;