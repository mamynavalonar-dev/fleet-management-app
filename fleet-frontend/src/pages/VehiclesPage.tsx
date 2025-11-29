import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useNavigate } from 'react-router-dom'; // Pour la navigation
import { Truck, MapPin, Settings, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';

const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ immatriculation: '', marque: '', type: 'Leger', status: 'Actif' });
  const navigate = useNavigate(); // Hook de navigation

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = () => {
    client.get('/vehicles').then(res => setVehicles(res.data));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/vehicles', formData);
      fetchVehicles();
      setIsModalOpen(false);
      setFormData({ immatriculation: '', marque: '', type: 'Leger', status: 'Actif' });
    } catch (error) {
      alert("Erreur lors de l'ajout");
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Truck className="text-primary" size={32} />
          Gestion du Parc
        </h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 text-white px-5 py-2 rounded-lg shadow hover:bg-gray-800 flex items-center gap-2"
        >
          <Plus size={18}/> Ajouter Véhicule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Truck size={28} />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                vehicle.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {vehicle.status === 'Actif' ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                {vehicle.status}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-800">{vehicle.immatriculation}</h3>
            <p className="text-gray-500 text-sm mb-4">{vehicle.marque} - {vehicle.type}</p>
            
            <div className="mt-6 flex gap-2">
              <button 
                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Voir Détails & Historique
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL AJOUT VÉHICULE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl w-96 shadow-2xl">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold">Nouveau Véhicule</h2>
              <button onClick={() => setIsModalOpen(false)}><X/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                placeholder="Immatriculation (ex: 39963WWT)" 
                className="w-full p-3 border rounded-lg bg-gray-50"
                onChange={e => setFormData({...formData, immatriculation: e.target.value})}
                required
              />
              <input 
                placeholder="Marque (ex: Toyota)" 
                className="w-full p-3 border rounded-lg bg-gray-50"
                onChange={e => setFormData({...formData, marque: e.target.value})}
                required
              />
              <select 
                className="w-full p-3 border rounded-lg bg-gray-50"
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="Leger">Véhicule Léger</option>
                <option value="Pick-up">Pick-up 4x4</option>
                <option value="Camion">Camion</option>
              </select>
              <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-700">
                Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
