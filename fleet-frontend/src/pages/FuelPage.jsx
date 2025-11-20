import React, { useState } from 'react';
import client from '../api/client';
import FuelTable from '../components/FuelTable'; // On utilise le nouveau tableau
import { Fuel, Plus, Truck, User, X } from 'lucide-react';

const FuelPage = () => {
  // --- État du Modal uniquement ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Sert à recharger le tableau après un ajout
  
  // États du formulaire
  const [formData, setFormData] = useState({
    vehicle_id: '', driver_id: '', date: '', 
    km_depart: '', km_arrivee: '', litres: '', montant: ''
  });

  // Données pour les listes déroulantes (simulées ou à charger via useEffect si besoin)
  // Idéalement, chargez-les via API, mais pour l'instant on garde simple pour éviter les erreurs
  const [vehicles, setVehicles] = useState([]); 
  const [drivers, setDrivers] = useState([]);

  // Chargement des options du formulaire au montage
  React.useEffect(() => {
      client.get('/vehicles').then(res => setVehicles(res.data));
      client.get('/drivers').then(res => setDrivers(res.data));
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/fuel', formData);
      setRefreshTrigger(prev => prev + 1); // ⚡ Recharger le tableau FuelTable
      setIsModalOpen(false);
      setFormData({ vehicle_id: '', driver_id: '', date: '', km_depart: '', km_arrivee: '', litres: '', montant: '' });
      alert("Enregistré avec succès !");
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Fuel className="text-primary" size={32} />
            Suivi Carburant
          </h1>
          <p className="text-gray-500 mt-1">Tableau de données avancé (Tri, Recherche, Pagination).</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all"
        >
          <Plus size={20} /> Nouveau Plein
        </button>
      </div>

      {/* --- ICI : On appelle le composant tableau, plus de logique .filter() ici --- */}
      <FuelTable refreshTrigger={refreshTrigger} />

      {/* --- MODAL (Formulaire) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Ajouter un Plein</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Véhicule</label>
                <select name="vehicle_id" required onChange={handleInputChange} className="w-full p-3 bg-gray-50 rounded-lg border outline-none">
                    <option value="">Sélectionner...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Chauffeur</label>
                 <select name="driver_id" onChange={handleInputChange} className="w-full p-3 bg-gray-50 rounded-lg border outline-none">
                    <option value="">Sélectionner...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                 </select>
              </div>
              <input type="number" name="km_depart" placeholder="Km Départ" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              <input type="number" name="km_arrivee" placeholder="Km Arrivée" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              <input type="number" name="litres" placeholder="Litres" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              <input type="number" name="montant" placeholder="Montant (Ar)" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              <div className="col-span-2">
                <input type="date" name="date" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              </div>
              <div className="col-span-2 flex justify-end gap-4 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Annuler</button>
                <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-white shadow-md hover:bg-blue-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelPage;