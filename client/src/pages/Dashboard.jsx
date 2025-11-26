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

  // Manual Creation State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFocus, setManualFocus] = useState('');
  const [manualExercises, setManualExercises] = useState([]);
  const [manualNewExercise, setManualNewExercise] = useState({ name: '', sets: 3, reps: 10 });

  // Logging State
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [logData, setLogData] = useState({}); // { exerciseIndex: { setIndex: { weight: 0, reps: 0 } } }
  const [newExercise, setNewExercise] = useState({ name: '', sets: 3, reps: 10 });

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

  const handleAddExercise = () => {
    if (!newExercise.name) return;

    // 1. Update Plan
    const updatedExercises = [...activeWorkout.parsedPlan.exercises, { ...newExercise }];
    const updatedPlan = { ...activeWorkout.parsedPlan, exercises: updatedExercises };

    // 2. Update Log Data
    const newIndex = updatedExercises.length - 1;
    const newLogEntry = [];
    for(let s=0; s<newExercise.sets; s++) {
      newLogEntry.push({ weight: '', reps: newExercise.reps });
    }
    
    setLogData({ ...logData, [newIndex]: newLogEntry });
    setActiveWorkout({ ...activeWorkout, parsedPlan: updatedPlan });
    setNewExercise({ name: '', sets: 3, reps: 10 }); // Reset form
  };

  const handleRemoveExercise = (indexToRemove) => {
    if (!confirm('Remove this exercise?')) return;

    // 1. Update Plan
    const updatedExercises = activeWorkout.parsedPlan.exercises.filter((_, i) => i !== indexToRemove);
    const updatedPlan = { ...activeWorkout.parsedPlan, exercises: updatedExercises };

    // 2. Update Log Data (Re-indexing)
    const newLogData = {};
    Object.keys(logData).forEach(key => {
      const keyInt = parseInt(key);
      if (keyInt < indexToRemove) {
        newLogData[keyInt] = logData[keyInt];
      } else if (keyInt > indexToRemove) {
        newLogData[keyInt - 1] = logData[keyInt];
      }
    });

    setLogData(newLogData);
    setActiveWorkout({ ...activeWorkout, parsedPlan: updatedPlan });
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

  const handleManualAddExercise = () => {
    if (!manualNewExercise.name) return;
    setManualExercises([...manualExercises, { ...manualNewExercise }]);
    setManualNewExercise({ name: '', sets: 3, reps: 10 });
  };

  const handleManualRemoveExercise = (index) => {
    setManualExercises(manualExercises.filter((_, i) => i !== index));
  };

  const handleManualSubmit = async () => {
    if (!manualFocus || manualExercises.length === 0) {
      alert('Please add a focus and at least one exercise.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/workouts/manual', {
        plan: {
          focus: manualFocus,
          exercises: manualExercises
        }
      });
      setShowManualModal(false);
      setManualFocus('');
      setManualExercises([]);
      await fetchScheduled();
    } catch (error) {
      alert('Failed to create workout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Upcoming Workouts</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowManualModal(true)} 
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Create Custom Workout
          </button>
          <button 
            onClick={() => setShowGenModal(true)} 
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Generate New Workout
          </button>
        </div>
      </div>

      {/* Manual Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Custom Workout</h2>
            
            <div className="mb-4">
              <label className="block mb-2 font-bold">Workout Focus</label>
              <input 
                type="text" 
                className="w-full border p-2 rounded"
                placeholder="e.g. Upper Body Power"
                value={manualFocus}
                onChange={(e) => setManualFocus(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <h3 className="font-bold mb-2">Exercises</h3>
              {manualExercises.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {manualExercises.map((ex, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                      <span>{ex.name} ({ex.sets} x {ex.reps})</span>
                      <button 
                        onClick={() => handleManualRemoveExercise(i)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm mb-4">No exercises added yet.</p>
              )}

              <div className="border p-3 rounded bg-gray-50">
                <div className="grid grid-cols-4 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold mb-1">Name</label>
                    <input 
                      type="text" 
                      className="w-full border p-2 rounded"
                      placeholder="Exercise Name"
                      value={manualNewExercise.name}
                      onChange={(e) => setManualNewExercise({...manualNewExercise, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Sets</label>
                    <input 
                      type="number" 
                      className="w-full border p-2 rounded"
                      value={manualNewExercise.sets}
                      onChange={(e) => setManualNewExercise({...manualNewExercise, sets: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Reps</label>
                    <input 
                      type="number" 
                      className="w-full border p-2 rounded"
                      value={manualNewExercise.reps}
                      onChange={(e) => setManualNewExercise({...manualNewExercise, reps: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleManualAddExercise}
                  className="mt-2 w-full bg-blue-100 text-blue-600 py-1 rounded hover:bg-blue-200 font-bold text-sm"
                >
                  + Add to List
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleManualSubmit}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {loading ? 'Saving...' : 'Save Workout'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Manual Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create Workout Manually</h2>
            
            <div className="mb-4">
              <label className="block mb-2">Focus (e.g. Chest, Legs)</label>
              <input 
                type="text" 
                className="w-full border p-2 rounded"
                value={manualFocus}
                onChange={(e) => setManualFocus(e.target.value)}
              />
            </div>

            <div className="space-y-4 mb-4">
              {manualExercises.map((ex, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    className="border p-2 rounded flex-1"
                    placeholder="Exercise Name"
                    value={ex.name}
                    onChange={(e) => {
                      const updated = [...manualExercises];
                      updated[index].name = e.target.value;
                      setManualExercises(updated);
                    }}
                  />
                  <input 
                    type="number" 
                    className="border p-2 rounded w-20"
                    placeholder="Sets"
                    value={ex.sets}
                    onChange={(e) => {
                      const updated = [...manualExercises];
                      updated[index].sets = parseInt(e.target.value) || 1;
                      setManualExercises(updated);
                    }}
                  />
                  <input 
                    type="number" 
                    className="border p-2 rounded w-20"
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => {
                      const updated = [...manualExercises];
                      updated[index].reps = parseInt(e.target.value) || 1;
                      setManualExercises(updated);
                    }}
                  />
                  <button 
                    onClick={() => handleManualRemoveExercise(index)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                className="border p-2 rounded flex-1"
                placeholder="New Exercise Name"
                value={manualNewExercise.name}
                onChange={(e) => setManualNewExercise({ ...manualNewExercise, name: e.target.value })}
              />
              <input 
                type="number" 
                className="border p-2 rounded w-20"
                placeholder="Sets"
                value={manualNewExercise.sets}
                onChange={(e) => setManualNewExercise({ ...manualNewExercise, sets: parseInt(e.target.value) || 1 })}
              />
              <input 
                type="number" 
                className="border p-2 rounded w-20"
                placeholder="Reps"
                value={manualNewExercise.reps}
                onChange={(e) => setManualNewExercise({ ...manualNewExercise, reps: parseInt(e.target.value) || 1 })}
              />
              <button 
                onClick={handleManualAddExercise}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Add Exercise
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleManualSubmit}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {loading ? 'Creating...' : 'Create Workout'}
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
                <div key={exIndex} className="border p-4 rounded relative">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">{ex.name}</h3>
                    <button 
                      onClick={() => handleRemoveExercise(exIndex)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold"
                    >
                      Remove
                    </button>
                  </div>
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

              {/* Add Exercise Form */}
              <div className="border p-4 rounded bg-gray-50">
                <h3 className="font-bold text-lg mb-2">Add Exercise</h3>
                <div className="grid grid-cols-4 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold mb-1">Name</label>
                    <input 
                      type="text" 
                      className="w-full border p-2 rounded"
                      placeholder="e.g. Curls"
                      value={newExercise.name}
                      onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Sets</label>
                    <input 
                      type="number" 
                      className="w-full border p-2 rounded"
                      value={newExercise.sets}
                      onChange={(e) => setNewExercise({...newExercise, sets: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Reps</label>
                    <input 
                      type="number" 
                      className="w-full border p-2 rounded"
                      value={newExercise.reps}
                      onChange={(e) => setNewExercise({...newExercise, reps: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleAddExercise}
                  className="mt-2 w-full bg-blue-100 text-blue-600 py-2 rounded hover:bg-blue-200 font-bold"
                >
                  + Add Exercise
                </button>
              </div>
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