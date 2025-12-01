import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Mail, Clock } from 'lucide-react';

const UserProfilePage = () => {
  const { user } = useAuth();

  if (!user) return <div>Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Mon Profil</h1>
      
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white flex items-center gap-6">
          <div className="bg-white/20 p-4 rounded-full backdrop-blur-md">
            <User size={64} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user.username}</h2>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium uppercase tracking-wide">
              {user.role}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <Mail className="text-blue-500" size={24} />
            <div>
              <p className="text-sm text-gray-500">Adresse Email</p>
              <p className="font-semibold text-gray-800">{user.email || 'Non renseigné'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <Shield className="text-purple-500" size={24} />
            <div>
              <p className="text-sm text-gray-500">Niveau d'accès</p>
              <p className="font-semibold text-gray-800 capitalize">{user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <Clock className="text-green-500" size={24} />
            <div>
              <p className="text-sm text-gray-500">ID Utilisateur</p>
              <p className="font-semibold text-gray-800">#{user.id}</p>
            </div>
          </div>
        </div>
        
        {/* Suggestion d'amélioration future */}
        <div className="px-8 pb-8">
            <button className="text-blue-600 text-sm hover:underline">
                Changer de mot de passe (Bientôt disponible)
            </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;