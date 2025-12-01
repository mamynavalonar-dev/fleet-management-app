import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { DollarSign, Droplet, Truck, Activity, AlertOctagon, Calendar } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const Dashboard = () => {
  const [stats, setStats] = useState({ charts: [], kpis: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour le filtrage par date
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  // Effet pour charger les données au montage et lors du changement de date de fin
  useEffect(() => {
    fetchStats();
  }, [endDate]); 

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/fuel/analytics/dashboard';
      // Ajout des paramètres de date si une plage est sélectionnée
      if (startDate && endDate) {
        url += `?start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`;
      }
      
      const res = await client.get(url);
      setStats(res.data);
    } catch (error) {
      console.error("Erreur dashboard:", error);
      setError("Impossible de charger les données. Veuillez vérifier votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const { kpis, charts } = stats;

  // Composant interne pour les cartes de statistiques (KPI)
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

  if (error) {
    return (
      <div className="p-8 flex justify-center text-red-500 bg-red-50 rounded-lg m-4 border border-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* En-tête avec Titre et Sélecteur de Date */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Tableau de Bord</h2>
          <p className="text-gray-500 mt-1">Vue d'ensemble de la flotte et indicateurs clés</p>
        </div>
        
        <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-3 shadow-sm">
          <Calendar size={18} className="text-gray-500 ml-2"/>
          <DatePicker 
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            isClearable={true}
            placeholderText="Filtrer par période"
            className="outline-none text-sm text-gray-700 bg-transparent w-48"
            dateFormat="dd/MM/yyyy"
          />
        </div>
      </div>

      {/* Grille des Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Dépenses Totales" 
          value={`${Number(kpis?.total_depense || 0).toLocaleString()} Ar`} 
          icon={DollarSign} 
          color="bg-blue-500"
          subtext={startDate && endDate ? "Sur la période sélectionnée" : "Historique global"}
        />
        
        <StatCard 
          title="Conso Moyenne" 
          value={`${Number(kpis?.conso_globale || 0).toFixed(1)} L/100`} 
          icon={Droplet} 
          color="bg-purple-500"
          subtext="Moyenne de la flotte"
        />
        
        <StatCard 
          title="Distance Totale" 
          value={`${Number(kpis?.km_total || 0).toLocaleString()} km`} 
          icon={Truck} 
          color="bg-green-500"
          subtext="Kilomètres parcourus"
        />
        
        {/* KPI pour les Anomalies / Fraudes Potentielles */}
        <StatCard 
          title="Anomalies Détectées" 
          value={kpis?.total_anomalies || 0} 
          icon={AlertOctagon} 
          color="bg-red-500" 
          subtext="Fraudes potentielles ou erreurs"
        />
      </div>

      {/* Section des Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graphique 1: Évolution des Coûts (AreaChart) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col **h-96**">
          <h3 className="text-lg font-bold text-gray-700 mb-6">Évolution des Coûts (Ar)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts}>
                <defs>
                  <linearGradient id="colorCout" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mois" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}}
                  tickFormatter={(value) => `${(value / 1000)}k`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} Ar`, "Coût"]}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total_cout" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorCout)" 
                />
              </AreaChart>
            </ResponsiveContainer>
        </div>

        {/* Graphique 2: Consommation Moyenne (BarChart) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col **h-96**">
          <h3 className="text-lg font-bold text-gray-700 mb-6">Moyenne Consommation (L/100km)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mois" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}}
                />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}} 
                  formatter={(value) => [`${Number(value).toFixed(1)} L/100`, "Moyenne"]}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="avg_conso" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40} 
                />
              </BarChart>
            </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;