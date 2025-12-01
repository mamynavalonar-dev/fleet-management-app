import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { AlertTriangle, Check, X, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const FraudAlertsPage = () => {
  const [frauds, setFrauds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFraud, setSelectedFraud] = useState(null);

  useEffect(() => {
    fetchFrauds();
  }, []);

  const fetchFrauds = async () => {
    setLoading(true);
    try {
      const res = await client.get('/fuel/frauds');
      setFrauds(res.data);
    } catch (error) {
      console.error("Erreur chargement fraudes:", error);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id, action) => {
    try {
      await client.put(`/fuel/frauds/${id}/validate`, { action });
      toast.success(action === 'approve' ? 'Alerte validée' : 'Ligne supprimée');
      fetchFrauds();
      setSelectedFraud(null);
    } catch (error) {
      toast.error("Erreur d'action");
    }
  };

  return (
    <div className="p-8">
      <Toaster position="top-right" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={32} />
          Alertes de Fraude
        </h1>
        <p className="text-gray-500 mt-1">Détection automatique des anomalies de consommation</p>
      </div>

      {loading ? (
        <div className="text-center py-10">Chargement...</div>
      ) : frauds.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-gray-700">Aucune anomalie détectée</h3>
          <p className="text-gray-500 mt-2">Tous les pleins sont conformes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {frauds.map((fraud) => {
            const warnings = fraud.warnings ? JSON.parse(fraud.warnings) : [];
            const severity = warnings.some(w => w.includes('FRAUDE PROBABLE')) ? 'high' : 'medium';
            
            return (
              <div 
                key={fraud.id}
                className={`bg-white rounded-xl shadow-sm border-l-4 ${
                  severity === 'high' ? 'border-red-500' : 'border-orange-500'
                } p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        severity === 'high' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {severity === 'high' ? '🚨 CRITIQUE' : '⚠️ SUSPECT'}
                      </span>
                      <span className="font-bold text-gray-800">{fraud.immatriculation}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">{fraud.chauffeur_nom || 'Non assigné'}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{new Date(fraud.date).toLocaleDateString()}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">KM Départ:</span>
                        <span className="ml-2 font-bold">{fraud.km_depart.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">KM Arrivée:</span>
                        <span className="ml-2 font-bold">{fraud.km_arrivee.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Litres:</span>
                        <span className="ml-2 font-bold">{fraud.litres} L</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Conso:</span>
                        <span className="ml-2 font-bold text-red-600">
                          {fraud.raw_consumption ? fraud.raw_consumption.toFixed(1) : 'N/A'} L/100
                        </span>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <h4 className="font-bold text-red-700 mb-2">Alertes:</h4>
                      <ul className="space-y-1">
                        {warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm text-red-600">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    <button 
                      onClick={() => setSelectedFraud(fraud)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Voir détails"
                    >
                      <Eye size={18}/>
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Valider cette alerte comme FAUX POSITIF ?')) {
                          handleValidate(fraud.id, 'approve');
                        }
                      }}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                      title="Valider (faux positif)"
                    >
                      <Check size={18}/>
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Confirmer la FRAUDE et supprimer cette ligne ?')) {
                          handleValidate(fraud.id, 'reject');
                        }
                      }}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Supprimer (fraude confirmée)"
                    >
                      <X size={18}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DÉTAILS */}
      {selectedFraud && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Détails de l'Anomalie</h2>
              <button onClick={() => setSelectedFraud(null)} className="text-gray-400 hover:text-red-500">
                <X size={24}/>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Véhicule</p>
                  <p className="font-bold text-gray-800">{selectedFraud.immatriculation}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Chauffeur</p>
                  <p className="font-bold text-gray-800">{selectedFraud.chauffeur_nom || 'Non assigné'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-bold text-gray-800">{new Date(selectedFraud.date).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Montant</p>
                  <p className="font-bold text-gray-800">{selectedFraud.montant.toLocaleString()} Ar</p>
                </div>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-bold text-red-700 mb-2">Anomalies Détectées:</h3>
                <ul className="space-y-2">
                  {JSON.parse(selectedFraud.warnings || '[]').map((warning, idx) => (
                    <li key={idx} className="text-red-600">{warning}</li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button 
                  onClick={() => {
                    handleValidate(selectedFraud.id, 'approve');
                  }}
                  className="px-6 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
                >
                  Faux Positif
                </button>
                <button 
                  onClick={() => {
                    handleValidate(selectedFraud.id, 'reject');
                  }}
                  className="px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                >
                  Confirmer Fraude
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudAlertsPage;