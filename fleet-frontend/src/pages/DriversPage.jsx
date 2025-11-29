import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { User, Phone, Award, Plus, X } from 'lucide-react';

const DriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ nom: '', telephone: '', status: 'Disponible' });

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = () => {
    client.get('/drivers').then(res => setDrivers(res.data));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await client.post('/drivers', newDriver);
    setIsModalOpen(false);
    fetchDrivers();
    setNewDriver({ nom: '', telephone: '', status: 'Disponible' });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <User className="text-primary" size={32} /> Équipe Chauffeurs
        </h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg flex gap-2 items-center shadow hover:bg-blue-700">
          <Plus size={18}/> Ajouter Chauffeur
        </button>
      </div>

      {/* Tableau existant ... (gardez votre tableau ici) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
           {/* ... Copiez l'intérieur du tableau de l'étape précédente ... */}
           <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-gray-600 font-semibold">Nom</th>
              <th className="p-4 text-gray-600 font-semibold">Contact</th>
              <th className="p-4 text-gray-600 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td className="p-4 font-bold">{driver.nom}</td>
                <td className="p-4">{driver.telephone}</td>
                <td className="p-4">{driver.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL AJOUT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-96">
            <h2 className="text-xl font-bold mb-4">Nouveau Chauffeur</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <input placeholder="Nom complet" className="w-full p-2 border rounded" required 
                onChange={e => setNewDriver({...newDriver, nom: e.target.value})} />
              <input placeholder="Téléphone" className="w-full p-2 border rounded" 
                onChange={e => setNewDriver({...newDriver, telephone: e.target.value})} />
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversPage;
