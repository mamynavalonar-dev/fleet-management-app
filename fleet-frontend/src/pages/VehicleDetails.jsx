import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, Car, Fuel } from 'lucide-react';

const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get(`/vehicles/${id}`).then(res => setData(res.data));
  }, [id]);

  if (!data) return <div className="p-10">Chargement...</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/vehicles')} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6">
        <ArrowLeft size={20}/> Retour
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{data.info.immatriculation}</h1>
        <div className="flex gap-4 text-gray-500">
          <span className="flex items-center gap-1"><Car size={18}/> {data.info.marque}</span>
          <span className="px-3 py-0.5 bg-green-100 text-green-700 rounded-full text-sm font-bold">{data.info.status}</span>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Fuel size={24} className="text-primary"/> Historique récent des pleins
      </h2>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Litres</th>
              <th className="p-4">Montant</th>
              <th className="p-4">Conso (L/100)</th>
            </tr>
          </thead>
          <tbody>
            {data.history.length === 0 ? (
               <tr><td colSpan="4" className="p-4 text-center text-gray-400">Aucun historique.</td></tr>
            ) : (
              data.history.map(log => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">{new Date(log.date).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">{log.litres} L</td>
                  <td className="p-4">{Number(log.montant).toLocaleString()} Ar</td>
                  <td className="p-4 text-blue-600">{Number(log.consumption_rate).toFixed(1)} %</td>
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