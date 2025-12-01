import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Droplet, Truck, Users, Settings, Wrench, Shield, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // 🆕

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth(); // 🆕

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Droplet, label: 'Suivi Carburant', path: '/fuel' },
    { icon: Truck, label: 'Gestion Véhicules', path: '/vehicles' },
    { icon: Users, label: 'Chauffeurs', path: '/drivers' },
    { icon: Wrench, label: 'Maintenance', path: '/maintenance', roles: ['gestionnaire', 'admin'] },
    { icon: Shield, label: 'Alertes Fraude', path: '/fraud-alerts', roles: ['gestionnaire', 'admin'] },
  ];

  // Filtrer les menus selon le rôle
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true; // Accessible à tous
    return item.roles.includes(user?.role);
  });

  return (
    <div className="h-screen w-64 bg-secondary text-white fixed left-0 top-0 flex flex-col shadow-2xl z-50">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          FleetManager
        </h1>
      </div>

      {/* Menu principal */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenuItems.map((item) => {
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

      {/* Footer avec infos utilisateur */}
      <div className="border-t border-gray-700">
        {/* Profil utilisateur */}
        <div className="border-b border-gray-700"> {/* Retirer le padding ici pour le mettre dans le Link */}
          <Link to="/profile" className="flex items-center gap-3 p-4 hover:bg-gray-800 transition-colors cursor-pointer group">
            <div className="bg-blue-500 p-2 rounded-full group-hover:scale-110 transition-transform">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate text-white">{user?.username}</p>
              <p className="text-xs text-gray-400 capitalize group-hover:text-blue-300">{user?.role}</p>
            </div>
          </Link>
        </div>

        {/* Paramètres et déconnexion */}
        <div className="p-4 space-y-2">
          {user?.role === 'admin' && (
            <Link 
              to="/settings" 
              className="flex items-center gap-3 p-3 text-gray-400 hover:text-white transition-colors hover:bg-gray-700 rounded-xl"
            >
              <Settings size={20} />
              <span>Paramètres</span>
            </Link>
          )}
          
          <button 
            onClick={logout}
            className="flex items-center gap-3 p-3 text-red-400 hover:text-red-300 transition-colors hover:bg-red-900/20 rounded-xl w-full"
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;