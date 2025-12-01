import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, Car, Fuel, BookOpen } from 'lucide-react'; // Ajout de l'icône BookOpen

const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get(`/vehicles/${id}`).then(res => setData(res.data));
  }, [id]);

  if (!data) return <div className="p-10 text-center">Chargement...</div>;

  return (
    <div className="p-8">
      {/* En-tête avec Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button 
            onClick={() => navigate('/vehicles')} 
            className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
        >
            <ArrowLeft size={20}/> Retour à la liste
        </button>

        {/* 🆕 NOUVEAU BOUTON : Vers Journal de Bord */}
        <button 
            onClick={() => navigate(`/vehicles/${id}/logbook`)}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl shadow-md hover:bg-blue-700 flex items-center gap-2 transition-all transform hover:scale-105"
        >
            <BookOpen size={20} />
            Accéder au Journal de Bord & Trajets
        </button>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{data.info.immatriculation}</h1>
        <div className="flex gap-4 text-gray-500">
          <span className="flex items-center gap-1"><Car size={18}/> {data.info.marque}</span>
          <span className={`px-3 py-0.5 rounded-full text-sm font-bold ${
              data.info.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
              {data.info.status}
          </span>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Fuel size={24} className="text-primary"/> Historique récent des pleins
      </h2>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-sm">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Litres</th>
              <th className="p-4">Montant</th>
              <th className="p-4">Conso (L/100)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.history.length === 0 ? (
               <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Aucun historique de carburant.</td></tr>
            ) : (
              data.history.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-700">{new Date(log.date).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">{log.litres} L</td>
                  <td className="p-4 text-gray-600">{Number(log.montant).toLocaleString()} Ar</td>
                  <td className={`p-4 font-bold ${log.consumption_rate > 16 ? 'text-red-500' : 'text-green-600'}`}>
                      {Number(log.consumption_rate).toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleDetails;