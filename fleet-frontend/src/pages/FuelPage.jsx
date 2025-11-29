import React, { useState, useRef, useEffect , useMemo} from 'react';
import client from '../api/client';
import FuelTable from '../components/FuelTable'; // Assurez-vous que FuelTable.jsx utilise viewTrash
import { Fuel, Plus, Download, Upload, Loader2, X, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast'; // Ajoutez toast si ce n'est pas déjà fait

const FuelPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [importing, setImporting] = useState(false);
  
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const fileInputRef = useRef(null);

  // 🔴 NOUVEL ÉTAT POUR LA CORBEILLE
  const [viewTrash, setViewTrash] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
        try {
            const vRes = await client.get('/vehicles');
            setVehicles(vRes.data || []);
            const dRes = await client.get('/drivers');
            setDrivers(dRes.data || []);
        } catch (e) { console.error("Erreur chargement options", e); }
    };
    loadOptions();
  }, []);

  // 🔴 NOUVELLE FONCTIONS DE GESTION DE LA CORBEILLE
  const moveToTrash = async (fuelId) => {
    if(!window.confirm("Déplacer vers la corbeille ?")) return;
    try {
        await client.put(`/fuel/trash/${fuelId}`);
        toast.success("Mis à la corbeille");
        setRefreshTrigger(prev => prev + 1); // Déclenche le rechargement du tableau
    } catch (e) { toast.error("Erreur mise en corbeille"); }
  };

  const restoreFromTrash = async (fuelId) => {
    try {
        await client.put(`/fuel/restore/${fuelId}`);
        toast.success("Restauré !");
        setRefreshTrigger(prev => prev + 1);
    } catch (e) { toast.error("Erreur restauration"); }
  };

  const deleteForever = async (fuelId) => {
    if(!window.confirm("ATTENTION : Suppression définitive ! Continuer ?")) return;
    try {
        await client.delete(`/fuel/${fuelId}`);
        toast.success("Supprimé définitivement");
        setRefreshTrigger(prev => prev + 1);
    } catch (e) { toast.error("Erreur suppression définitive"); }
  };
  // FIN DES NOUVELLES FONCTIONS DE GESTION DE LA CORBEILLE

  // --- EXPORT ---
  const handleExport = async () => {
    try {
      const response = await client.get('/fuel/data/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Export_Carburant_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Erreur lors de l'exportation.");
    }
  };

  // --- IMPORT ---
  const handleImportClick = () => {
    if(fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const res = await client.post('/fuel/data/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message); // Utilisation de toast
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'importation."); // Utilisation de toast
    } finally {
      setImporting(false);
      e.target.value = null;
    }
  };

  // --- FORMULAIRE ---
  const [formData, setFormData] = useState({
    vehicle_id: '', driver_id: '', date: '', km_depart: '', km_arrivee: '', litres: '', montant: ''
  });

  const handleInputChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await client.post('/fuel', formData);
        setRefreshTrigger(prev => prev + 1);
        setIsModalOpen(false);
        setFormData({ vehicle_id: '', driver_id: '', date: '', km_depart: '', km_arrivee: '', litres: '', montant: '' });
        toast.success("Enregistré !"); // Utilisation de toast
    } catch (e) { toast.error("Erreur enregistrement"); } // Utilisation de toast
  };

  return (
    <div className="p-8">
      {/* Input File Caché */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Fuel className="text-primary" size={32} />
            Suivi Carburant
          </h1>
          <p className="text-gray-500 mt-1">{viewTrash ? "Éléments supprimés (Corbeille)" : "Gestion des données et historique."}</p>
        </div>

        <div className="flex gap-3">
            {/* 🔴 NOUVEAU BOUTON CORBEILLE */}
            <button 
                onClick={() => setViewTrash(!viewTrash)}
                className={`flex items-center gap-2 px-3 py-1 rounded-xl text-sm font-bold transition-colors ${viewTrash ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                title={viewTrash ? "Voir les éléments actifs" : "Voir la Corbeille"}
            >
                <Trash2 size={18}/> {viewTrash ? "Quitter la Corbeille" : "Corbeille"}
            </button>
          
          <button 
            onClick={handleExport} 
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all"
          >
            <Download size={18} /> Exporter
          </button>
          
          <button 
            onClick={handleImportClick} 
            disabled={importing} 
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {importing ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />}
            {importing ? 'Envoi...' : 'Importer'}
          </button>

          {!viewTrash && ( // Cacher le bouton Nouveau en mode Corbeille
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-primary hover:bg-blue-700 text-white px-5 py-2 rounded-xl shadow-lg flex items-center gap-2 transition-all"
              >
                <Plus size={20} /> Nouveau
              </button>
          )}
        </div>
      </div>

      {/* 🔴 MISE À JOUR : Passage de l'état Corbeille et des fonctions au FuelTable */}
      <FuelTable 
        refreshTrigger={refreshTrigger} 
        viewTrash={viewTrash} 
        actions={{ moveToTrash, restoreFromTrash, deleteForever }}
      />

      {/* MODAL AJOUT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Nouveau Plein</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X/></button>
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
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Km Départ</label>
                <input type="number" name="km_depart" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Km Arrivée</label>
                <input type="number" name="km_arrivee" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Litres</label>
                <input type="number" step="0.01" name="litres" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant (Ar)</label>
                <input type="number" name="montant" required onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
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
