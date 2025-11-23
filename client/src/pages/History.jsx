import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { logWorkoutOnChain } from '../utils/blockchain';

const History = () => {
  const [workouts, setWorkouts] = useState([]);
  const [analytics, setAnalytics] = useState({ adherence: 0, total: 0, completed: 0 });
  const [editWorkout, setEditWorkout] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchData = async () => {
    try {
      const [historyRes, analyticsRes] = await Promise.all([
        api.get('/workouts/history'),
        api.get('/workouts/analytics')
      ]);
      setWorkouts(historyRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBlockchainLog = async (workout) => {
    try {
      const txHash = await logWorkoutOnChain(workout.plan);
      if (txHash) {
        alert(`Workout logged! Tx: ${txHash}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to log to blockchain');
    }
  };

  const openEditor = (workout) => {
    try {
      const actual = workout.actual_data ? JSON.parse(workout.actual_data) : {};
      const plan = JSON.parse(workout.plan);
      
      // Ensure structure exists even if actual data was partial
      const initialData = {};
      plan.exercises.forEach((ex, i) => {
        initialData[i] = [];
        const actualSets = actual[i] || [];
        for(let s=0; s<ex.sets; s++) {
          initialData[i].push({ 
            weight: actualSets[s]?.weight || '', 
            reps: actualSets[s]?.reps || ex.reps 
          });
        }
      });
      
      setEditData(initialData);
      setEditWorkout({ ...workout, parsedPlan: plan });
    } catch (e) {
      console.error("Error parsing for edit", e);
    }
  };

  const updateEdit = (exIndex, setIndex, field, value) => {
    const newData = { ...editData };
    newData[exIndex][setIndex][field] = value;
    setEditData(newData);
  };

  const saveEdit = async () => {
    if (!editWorkout) return;
    try {
      await api.put(`/workouts/${editWorkout.id}`, {
        actual_data: editData
      });
      setEditWorkout(null);
      fetchData();
    } catch (error) {
      alert('Failed to update workout');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Workout History</h1>
        <div className="bg-blue-100 p-4 rounded-lg text-center">
          <p className="text-sm text-blue-600 font-bold">ADHERENCE</p>
          <p className="text-2xl font-bold text-blue-800">{analytics.adherence}%</p>
          <p className="text-xs text-blue-500">{analytics.completed} / {analytics.total} Workouts</p>
        </div>
      </div>

      <div className="grid gap-6">
        {workouts.map((workout) => {
          let plan, actual;
          try {
            plan = JSON.parse(workout.plan);
            actual = workout.actual_data ? JSON.parse(workout.actual_data) : null;
          } catch (e) {
            plan = { focus: 'Legacy', exercises: [] };
          }

          return (
            <div key={workout.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl">{plan.focus} Workout</h3>
                  <div className="text-gray-500 text-sm">
                    Completed: {new Date(workout.completed_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleBlockchainLog(workout)}
                    className="text-sm bg-orange-100 text-orange-600 px-3 py-1 rounded hover:bg-orange-200"
                  >
                    Log to Blockchain
                  </button>
                  <button 
                    onClick={() => openEditor(workout)}
                    className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {plan.exercises.map((ex, i) => (
                  <div key={i} className="border-b pb-2">
                    <div className="font-semibold">{ex.name}</div>
                    {actual && actual[i] ? (
                      <div className="text-sm text-gray-600 mt-1 grid grid-cols-3 gap-2">
                        {actual[i].map((set, sIndex) => (
                          <span key={sIndex} className="bg-gray-100 px-2 py-1 rounded">
                            Set {sIndex + 1}: {set.weight || 0}lbs x {set.reps}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Planned: {ex.sets} x {ex.reps}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {workouts.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            No completed workouts yet. Go to Dashboard to complete one!
          </div>
        )}
      </div>

      {editWorkout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Edit Workout: {editWorkout.parsedPlan.focus}</h2>
            
            <div className="space-y-6">
              {editWorkout.parsedPlan.exercises.map((ex, exIndex) => (
                <div key={exIndex} className="border p-4 rounded">
                  <h3 className="font-bold text-lg mb-2">{ex.name}</h3>
                  <div className="grid grid-cols-3 gap-4 mb-2 font-semibold text-sm text-gray-500">
                    <div>Set</div>
                    <div>Weight (lbs)</div>
                    <div>Reps</div>
                  </div>
                  {editData[exIndex]?.map((set, setIndex) => (
                    <div key={setIndex} className="grid grid-cols-3 gap-4 mb-2 items-center">
                      <div className="text-gray-600">Set {setIndex + 1}</div>
                      <input 
                        type="number" 
                        className="border p-1 rounded"
                        placeholder="Weight"
                        value={set.weight}
                        onChange={(e) => updateEdit(exIndex, setIndex, 'weight', e.target.value)}
                      />
                      <input 
                        type="number" 
                        className="border p-1 rounded"
                        placeholder="Reps"
                        value={set.reps}
                        onChange={(e) => updateEdit(exIndex, setIndex, 'reps', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setEditWorkout(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={saveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;