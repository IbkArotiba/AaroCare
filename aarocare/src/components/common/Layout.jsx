import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold text-primary-600">AaroCare</h2>
        </div>
        <nav className="mt-6">
          <ul>
            <li className="px-4 py-2 hover:bg-gray-100">
              <a href="/dashboard" className="block">Dashboard</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-100">
              <a href="/patients" className="block">Patients</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-100">
              <a href="/profile" className="block">Profile</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-100">
              <button onClick={logout} className="block text-red-500">Logout</button>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;