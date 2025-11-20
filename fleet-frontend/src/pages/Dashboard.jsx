import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { TrendingUp, DollarSign, Activity, Droplet, Truck } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({ charts: [], kpis: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await client.get('/fuel/analytics/dashboard');
        setStats(res.data);
      } catch (error) {
        console.error("Erreur dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const { kpis, charts } = stats;

  // Composant Carte KPI
  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">
            {loading ? "..." : value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.replace('bg-', '')}`}>
          <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="text-gray-400 text-sm">{subtext}</span>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Tableau de Bord</h2>
        <p className="text-gray-500 mt-1">Vue d'ensemble de votre flotte en temps réel</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Dépenses Totales" 
          value={`${Number(kpis.total_depense || 0).toLocaleString()} Ar`} 
          icon={DollarSign} 
          color="bg-blue-500"
          subtext="Depuis le début"
        />
        <StatCard 
          title="Conso Moyenne" 
          value={`${Number(kpis.conso_globale || 0).toFixed(1)} L/100`} 
          icon={Droplet} 
          color="bg-purple-500"
          subtext="Moyenne globale flotte"
        />
        <StatCard 
          title="Distance Totale" 
          value={`${Number(kpis.km_total || 0).toLocaleString()} km`} 
          icon={Truck} 
          color="bg-green-500"
          subtext="Kilomètres parcourus"
        />
        <StatCard 
          title="Alertes Conso" 
          value="0" 
          icon={Activity} 
          color="bg-orange-500"
          subtext="Tout est normal"
        />
      </div>

      {/* Graphiques Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
        {/* Chart 1: Coûts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-700 mb-6">Évolution des Coûts (6 derniers mois)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={charts}>
              <defs>
                <linearGradient id="colorCout" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="mois" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} Ar`} />
              <Area type="monotone" dataKey="total_cout" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCout)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Consommation */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-700 mb-6">Moyenne Consommation (L/100km)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={charts}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="mois" axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f3f4f6'}} />
              <Bar dataKey="avg_conso" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;