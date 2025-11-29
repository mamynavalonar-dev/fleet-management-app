import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Droplet, Truck, Users, Settings } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Droplet, label: 'Suivi Carburant', path: '/fuel' },
    { icon: Truck, label: 'Gestion Véhicules', path: '/vehicles' },
    { icon: Users, label: 'Chauffeurs', path: '/drivers' },
  ];

  return (
    <div className="h-screen w-64 bg-secondary text-white fixed left-0 top-0 flex flex-col shadow-2xl z-50">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          FleetManager
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary shadow-lg translate-x-2' 
                  : 'hover:bg-gray-700 hover:translate-x-1'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <Link to="/settings" className="flex items-center gap-3 p-3 text-gray-400 hover:text-white transition-colors hover:bg-gray-700 rounded-xl">
          <Settings size={20} />
          <span>Paramètres</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
