import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600">AI Fitness</Link>
          <div className="flex space-x-4">
            {token ? (
              <>
                <Link to="/" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
                <Link to="/history" className="text-gray-700 hover:text-blue-600">History</Link>
                <Link to="/nutrition" className="text-gray-700 hover:text-blue-600">Nutrition</Link>
                <Link to="/leaderboard" className="text-gray-700 hover:text-blue-600">Leaderboard</Link>
                <button onClick={handleLogout} className="text-gray-700 hover:text-red-600">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600">Login</Link>
                <Link to="/register" className="text-gray-700 hover:text-blue-600">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;