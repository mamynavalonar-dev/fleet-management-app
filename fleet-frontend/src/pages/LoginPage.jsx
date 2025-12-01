import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Truck, Lock, User, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await client.post('/auth/login', formData);
      
      // Stocker le token et les infos utilisateur
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      toast.success(`Bienvenue ${res.data.user.username} !`);
      
      // Redirection vers le dashboard
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err) {
      console.error("Erreur login:", err);
      
      if (err.response && err.response.status === 401) {
        setError("Nom d'utilisateur ou mot de passe incorrect.");
      } 
      else if (err.code === "ERR_NETWORK") {
        setError("Impossible de contacter le serveur. Vérifiez qu'il est démarré.");
      } 
      else {
        setError(err.response?.data?.error || 'Erreur de connexion.');
      }
      toast.error("Échec de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header avec logo */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
              <Truck size={48} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">FleetManager</h1>
          <p className="text-blue-100">Gestion de flotte intelligente</p>
        </div>

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom d'utilisateur
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl transform hover:-translate-y-0.5'
            }`}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {/* Info de test */}
          <div className="text-center text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-bold mb-1">Comptes de test :</p>
            <p>👤 Admin : <code className="bg-white px-2 py-0.5 rounded">admin / admin123</code></p>
            <p>👤 Gestionnaire : <code className="bg-white px-2 py-0.5 rounded">manager / manager123</code></p>
            <p>👤 Consultant : <code className="bg-white px-2 py-0.5 rounded">viewer / viewer123</code></p>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-500">
          © 2024 FleetManager - Tous droits réservés
        </div>
      </div>
    </div>
  );
};

export default LoginPage;