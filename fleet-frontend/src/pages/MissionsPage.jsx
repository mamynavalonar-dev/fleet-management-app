import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Map, Calendar, User, Truck, Plus } from 'lucide-react';

const MissionsPage = () => {
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    client.get('/missions').then(res => setMissions(res.data));
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'En cours': return 'bg-blue-100 text-blue-700';
      case 'Terminé': return 'bg-gray-100 text-gray-600';
      case 'Planifié': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Map className="text-primary" size={32} />
          Missions & Rotations
        </h1>
        <button className="bg-primary text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center gap-2">
          <Plus size={18} /> Nouvelle Mission
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {missions.length === 0 ? (
          <div className="text-center p-10 text-gray-500 bg-white rounded-xl">Aucune mission enregistrée.</div>
        ) : (
          missions.map((mission) => (
            <div key={mission.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center hover:shadow-md transition-shadow">
              
              {/* Info Gauche */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(mission.status)}`}>
                    {mission.status}
                  </span>
                  <h3 className="text-lg font-bold text-gray-800">{mission.destination}</h3>
                </div>
                <p className="text-gray-500 text-sm">{mission.description}</p>
              </div>

              {/* Info Centre (Dates & Ressources) */}
              <div className="flex items-center gap-8 my-4 md:my-0 mx-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary"/>
                  <span>{new Date(mission.date_debut).toLocaleDateString()} → {new Date(mission.date_fin).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-primary"/>
                  <span className="font-medium">{mission.immatriculation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-primary"/>
                  <span>{mission.chauffeur_nom}</span>
                </div>
              </div>

              {/* Actions */}
              <div>
                <button className="text-gray-400 hover:text-primary font-medium text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Détails
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MissionsPage;