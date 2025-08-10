import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-brand-600 text-white grid place-items-center font-bold">TM</div>
          <span className="text-gray-900 font-semibold text-lg">Task Manager</span>
        </Link>
        <div className="flex items-center gap-3">
          {token ? (
            <>
              <Link className="text-sm text-gray-700 hover:text-brand-600" to="/dashboard">Dashboard</Link>
              <button onClick={handleLogout} className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md shadow-sm">Logout</button>
            </>
          ) : (
            <>
              <Link className="text-sm text-gray-700 hover:text-brand-600" to="/">Login</Link>
              <Link className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md shadow-sm" to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;