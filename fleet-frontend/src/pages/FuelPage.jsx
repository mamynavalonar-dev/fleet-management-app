import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Search, Plus, FileText, Fuel, Calendar, Truck, User } from 'lucide-react';
import { Trash2 } from 'lucide-react';

const FuelPage = () => {
  // --- ÉTATS (States) ---
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]); // Pour le dropdown
  const [drivers, setDrivers] = useState([]);   // Pour le dropdown
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // État du Formulaire
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '', driver_id: '', date: '', 
    km_depart: '', km_arrivee: '', litres: '', montant: ''
  });

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Récupérer l'historique carburant
      const logsRes = await client.get('/fuel');
      setLogs(logsRes.data);

      // 2. Récupérer véhicules et chauffeurs pour les formulaires
      // Note: Assurez-vous d'avoir créé ces routes ou utilisez des données factices si la DB est vide
      const vehiclesRes = await client.get('/vehicles'); 
      setVehicles(vehiclesRes.data);
      
      // Pour l'exemple, on simule les chauffeurs si la route n'existe pas encore
      setDrivers([{id: 1, nom: 'Mr Alain'}, {id: 2, nom: 'Mr Njaka'}]);
      
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- GESTION DU FORMULAIRE ---
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Envoi au backend
      await client.post('/fuel', formData);
      
      // Recharger la liste et fermer
      fetchData();
      setIsModalOpen(false);
      setFormData({ vehicle_id: '', driver_id: '', date: '', km_depart: '', km_arrivee: '', litres: '', montant: '' });
      alert("Consommation ajoutée avec succès !");
    } catch (error) {
      console.error("Erreur d'ajout:", error);
      alert("Erreur lors de l'enregistrement.");
    }
  };

  // --- FILTRAGE (Recherche Instantanée) ---
  const filteredLogs = logs.filter(log => 
    log.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.chauffeur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.date?.includes(searchTerm)
  );

  // --- RENDER ---
  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Fuel className="text-primary" size={32} />
            Suivi Carburant
          </h1>
          <p className="text-gray-500 mt-1">Gérez les consommations et les tickets de votre flotte.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
        >
          <Plus size={20} />
          Nouveau Plein
        </button>
      </div>

      {/* Barre de Recherche & Filtres */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher par véhicule, chauffeur ou date..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all outline-none"
          />
        </div>
        <select className="p-3 rounded-lg bg-gray-50 border-transparent outline-none cursor-pointer hover:bg-gray-100">
          <option>Tous les mois</option>
          <option>Novembre 2025</option>
          <option>Octobre 2025</option>
        </select>
      </div>

      {/* Tableau de Données */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Véhicule</th>
                <th className="p-4 font-semibold">Chauffeur</th>
                <th className="p-4 font-semibold">Km Parcours</th>
                <th className="p-4 font-semibold">Litres</th>
                <th className="p-4 font-semibold">Montant</th>
                <th className="p-4 font-semibold">Conso (L/100)</th>
                <th className="p-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500">Chargement des données...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500">Aucune donnée trouvée.</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50 transition-colors group">
                    <td className="p-4 text-gray-700 font-medium flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400"/>
                      {new Date(log.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold">
                        {log.immatriculation}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{log.chauffeur_nom || '-'}</td>
                    <td className="p-4 text-gray-600">
                      <div className="flex flex-col text-xs">
                        <span className="text-gray-400">Départ: {log.km_depart}</span>
                        <span className="font-bold text-gray-700">Dist: {log.distance_daily} km</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{log.litres} L</td>
                    <td className="p-4 font-bold text-gray-800">
                      {Number(log.montant).toLocaleString('fr-MG')} Ar
                    </td>
                    <td className="p-4">
                      <div className={`flex items-center gap-1 font-bold ${
                        log.consumption_rate > 15 ? 'text-red-500' : 'text-green-600'
                      }`}>
                        {log.consumption_rate ? Number(log.consumption_rate).toFixed(1) : '-'} %
                      </div>
                    </td>
                    <td className="p-4 text-center">
                        <button 
                            onClick={async () => {
                            if(window.confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
                                await client.delete(`/fuel/${log.id}`);
                                fetchData(); // Rafraîchir le tableau
                            }
                            }}
                            className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all"
                            title="Supprimer"
                        >
                            <Trash2 size={18} />
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL D'AJOUT (Formulaire) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Ajouter un Plein</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
              {/* Ligne 1 */}
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Véhicule</label>
                <div className="relative">
                  <Truck className="absolute left-3 top-3 text-gray-400" size={18}/>
                  <select 
                    name="vehicle_id" 
                    required
                    onChange={handleInputChange}
                    className="w-full pl-10 p-3 bg-gray-50 rounded-lg border focus:ring-2 ring-primary outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} - {v.marque}</option>)}
                  </select>
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chauffeur</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={18}/>
                  <select 
                    name="driver_id"
                    onChange={handleInputChange}
                    className="w-full pl-10 p-3 bg-gray-50 rounded-lg border focus:ring-2 ring-primary outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </div>
              </div>

              {/* Ligne 2 : Kilométrage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Km Compteur Départ</label>
                <input 
                  type="number" name="km_depart" required placeholder="Ex: 44500"
                  onChange={handleInputChange}
                  className="w-full p-3 bg-gray-50 rounded-lg border outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Km Compteur Arrivée</label>
                <input 
                  type="number" name="km_arrivee" required placeholder="Ex: 44650"
                  onChange={handleInputChange}
                  className="w-full p-3 bg-gray-50 rounded-lg border outline-none focus:border-primary"
                />
              </div>

              {/* Ligne 3 : Carburant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Litres</label>
                <input 
                  type="number" step="0.01" name="litres" required placeholder="Ex: 50.5"
                  onChange={handleInputChange}
                  className="w-full p-3 bg-gray-50 rounded-lg border outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant (Ar)</label>
                <input 
                  type="number" name="montant" required placeholder="Ex: 250000"
                  onChange={handleInputChange}
                  className="w-full p-3 bg-gray-50 rounded-lg border outline-none focus:border-primary"
                />
              </div>

               {/* Ligne 4 : Date */}
               <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date du ticket</label>
                <input 
                  type="date" name="date" required
                  onChange={handleInputChange}
                  className="w-full p-3 bg-gray-50 rounded-lg border outline-none focus:border-primary"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-4 mt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-white shadow-md hover:bg-blue-700 transition-transform active:scale-95"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelPage;