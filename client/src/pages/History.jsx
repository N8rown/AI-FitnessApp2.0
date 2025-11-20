import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { logWorkoutOnChain } from '../utils/blockchain';

const History = () => {
  const [workouts, setWorkouts] = useState([]);
  const [analytics, setAnalytics] = useState({ adherence: 0, total: 0, completed: 0 });

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
                <button 
                  onClick={() => handleBlockchainLog(workout)}
                  className="text-sm bg-orange-100 text-orange-600 px-3 py-1 rounded hover:bg-orange-200"
                >
                  Log to Blockchain
                </button>
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
    </div>
  );
};

export default History;