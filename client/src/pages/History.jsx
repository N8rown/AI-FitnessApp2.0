import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { logWorkoutOnChain } from '../utils/blockchain';

const History = () => {
  const [workouts, setWorkouts] = useState([]);
  const [analytics, setAnalytics] = useState({ adherence: 0, total: 0, completed: 0 });
  const [editWorkout, setEditWorkout] = useState(null);
  const [editText, setEditText] = useState('');

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
    let initialText = '';
    try {
      // Try to parse as JSON first (legacy support)
      const actual = JSON.parse(workout.actual_data);
      if (typeof actual === 'string') {
        initialText = actual;
      } else if (actual && typeof actual === 'object') {
        // Convert legacy object format to text
        const plan = JSON.parse(workout.plan);
        initialText = `Focus: ${plan.focus}\n`;
        plan.exercises.forEach((ex, i) => {
          initialText += `${ex.name}\n`;
          const sets = actual[i] || [];
          sets.forEach((s, sIndex) => {
            initialText += `  Set ${sIndex+1}: ${s.weight}lbs x ${s.reps}\n`;
          });
        });
      }
    } catch (e) {
      // It's just text
      initialText = workout.actual_data || '';
    }
    setEditText(initialText);
    setEditWorkout(workout);
  };

  const saveEdit = async () => {
    if (!editWorkout) return;
    try {
      await api.put(`/workouts/${editWorkout.id}`, {
        actual_data: editText
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
          let displayText = '';
          let title = "Workout";
          
          try {
            const actual = JSON.parse(workout.actual_data);
            if (typeof actual === 'string') {
              displayText = actual;
              // Try to extract title from first line
              const firstLine = actual.split('\n')[0];
              if (firstLine.toLowerCase().includes('focus')) title = firstLine;
            } else {
              // Legacy JSON object
              const plan = JSON.parse(workout.plan);
              title = plan.focus + " Workout";
              displayText = plan.exercises.map((ex, i) => {
                const sets = actual[i] || [];
                const setStr = sets.map((s, si) => `S${si+1}: ${s.weight}x${s.reps}`).join(', ');
                return `• ${ex.name}: ${setStr}`;
              }).join('\n');
            }
          } catch (e) {
            displayText = workout.actual_data;
          }

          return (
            <div key={workout.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl">{title}</h3>
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
              
              <div className="text-gray-700 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-2 rounded">
                {displayText}
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
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl m-4 max-h-[90vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Edit Workout Log</h2>
            
            <textarea
              className="w-full h-96 border p-4 rounded font-mono text-sm"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />

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