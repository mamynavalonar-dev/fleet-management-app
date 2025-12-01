import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { AlertTriangle, Wrench, Calendar, DollarSign, Plus, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const MaintenancePage = () => {
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  
  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicle_id: '',
    rule_id: '',
    km_effectue: '',
    date_maintenance: new Date().toISOString().split('T')[0],
    notes: '',
    cout: ''
  });

  const [ruleForm, setRuleForm] = useState({
    type_maintenance: '',
    frequence_km: '',
    alerte_avant_km: '1000',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, rulesRes] = await Promise.all([
        client.get('/maintenance/alerts'),
        client.get('/maintenance/rules')
      ]);
      setAlerts(alertsRes.data);
      setRules(rulesRes.data);
    } catch (error) {
      console.error("Erreur chargement maintenance:", error);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleLogMaintenance = async (e) => {
    e.preventDefault();
    try {
      await client.post('/maintenance/log', maintenanceForm);
      toast.success('Maintenance enregistrée !');
      setIsModalOpen(false);
      setMaintenanceForm({
        vehicle_id: '',
        rule_id: '',
        km_effectue: '',
        date_maintenance: new Date().toISOString().split('T')[0],
        notes: '',
        cout: ''
      });
      fetchData();
    } catch (error) {
      toast.error("Erreur d'enregistrement");
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    try {
      await client.post('/maintenance/rules', ruleForm);
      toast.success('Règle ajoutée !');
      setIsRuleModalOpen(false);
      setRuleForm({
        type_maintenance: '',
        frequence_km: '',
        alerte_avant_km: '1000',
        description: ''
      });
      fetchData();
    } catch (error) {
      toast.error("Erreur d'ajout");
    }
  };

  return (
    <div className="p-8">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Wrench className="text-primary" size={32} />
            Maintenance & Alertes
          </h1>
          <p className="text-gray-500 mt-1">Gestion préventive de la flotte</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsRuleModalOpen(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 flex items-center gap-2"
          >
            <Plus size={18}/> Nouvelle Règle
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} /> Enregistrer Maintenance
          </button>
        </div>
      </div>

      {/* SECTION ALERTES */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="text-orange-500" size={24}/>
          Alertes Actives ({alerts.length})
        </h2>
        
        {loading ? (
          <div className="text-center py-10">Chargement...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            ✅ Aucune maintenance en retard
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={`${alert.vehicle_id}-${alert.rule_id}`}
                className="flex justify-between items-center p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{alert.immatriculation} - {alert.marque}</h3>
                  <p className="text-sm text-gray-600">{alert.type_maintenance}: {alert.description}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    📍 Dernier KM: {alert.dernier_km.toLocaleString()} | 
                    🔔 Prochain: {alert.prochain_km.toLocaleString()} km
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setMaintenanceForm({
                      ...maintenanceForm,
                      vehicle_id: alert.vehicle_id,
                      rule_id: alert.rule_id,
                      km_effectue: alert.dernier_km
                    });
                    setIsModalOpen(true);
                  }}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
                >
                  <Wrench size={16}/> Effectuer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION RÈGLES */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Règles de Maintenance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <h3 className="font-bold text-gray-800">{rule.type_maintenance}</h3>
              <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
              <div className="mt-3 text-xs text-gray-500">
                <p>📏 Fréquence: {rule.frequence_km.toLocaleString()} km</p>
                <p>🔔 Alerte: {rule.alerte_avant_km.toLocaleString()} km avant</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL ENREGISTRER MAINTENANCE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Enregistrer une Maintenance</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X size={24}/>
              </button>
            </div>

            <form onSubmit={handleLogMaintenance} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de Maintenance</label>
                  <select 
                    required
                    value={maintenanceForm.rule_id}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, rule_id: e.target.value})}
                    className="w-full p-3 border rounded-lg bg-gray-50"
                  >
                    <option value="">Sélectionner...</option>
                    {rules.map(rule => (
                      <option key={rule.id} value={rule.id}>{rule.type_maintenance}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">KM Effectué</label>
                  <input 
                    type="number"
                    required
                    value={maintenanceForm.km_effectue}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, km_effectue: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input 
                    type="date"
                    required
                    value={maintenanceForm.date_maintenance}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, date_maintenance: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coût (Ar)</label>
                  <input 
                    type="number"
                    value={maintenanceForm.cout}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, cout: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea 
                  rows="3"
                  value={maintenanceForm.notes}
                  onChange={(e) => setMaintenanceForm({...maintenanceForm, notes: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Détails de l'intervention..."
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-white shadow-md hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJOUTER RÈGLE */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Nouvelle Règle de Maintenance</h2>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X size={24}/>
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de Maintenance</label>
                <input 
                  type="text"
                  required
                  value={ruleForm.type_maintenance}
                  onChange={(e) => setRuleForm({...ruleForm, type_maintenance: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Ex: Vidange, Freins..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence (km)</label>
                  <input 
                    type="number"
                    required
                    value={ruleForm.frequence_km}
                    onChange={(e) => setRuleForm({...ruleForm, frequence_km: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alerte Avant (km)</label>
                  <input 
                    type="number"
                    required
                    value={ruleForm.alerte_avant_km}
                    onChange={(e) => setRuleForm({...ruleForm, alerte_avant_km: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea 
                  rows="3"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({...ruleForm, description: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Détails de la maintenance..."
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-white shadow-md hover:bg-blue-700"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;