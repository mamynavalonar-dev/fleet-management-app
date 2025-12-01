import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, Printer, Plus, MapPin, Fuel, X, Trash2, RefreshCw, Save, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';


const LogbookPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [vehicle, setVehicle] = useState(null);
    const [trips, setTrips] = useState([]);
    const [fuels, setFuels] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // États UI
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewTrash, setViewTrash] = useState(false); // Mode Corbeille
    const [editingCell, setEditingCell] = useState(null); // { id, field }

    // Dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });

    // Formulaire nouveau trajet
    const initialTripData = { date: today.toISOString().split('T')[0], heure_depart: '', km_depart: '', lieu_depart: '', lieu_arrivee: '', heure_arrivee: '', km_arrivee: '', motif: '' };
    const [newTripData, setNewTripData] = useState(initialTripData);

    useEffect(() => {
        fetchLogbook();
    }, [id, dateRange, viewTrash]);

    const fetchLogbook = async () => {
        setLoading(true);
        try {
            // FIX BACKEND DÉJÀ APPLIQUÉ: La route /trips/:id renvoie désormais { vehicle, trips, fuels }
            const res = await client.get(`/trips/${id}`, {
                params: { startDate: dateRange.start, endDate: dateRange.end, deleted: viewTrash }
            });
            // Ces lignes fonctionnent maintenant grâce à la correction de trips.js
            setVehicle(res.data.vehicle);
            setTrips(res.data.trips);
            setFuels(res.data.fuels);
        } catch (error) {
            console.error("Erreur logbook:", error);
            // C'est cette erreur qui apparaissait à cause du 404
            toast.error("Erreur de chargement. (Vérifiez votre serveur backend)");
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIQUE ÉDITION EN LIGNE ---
    const saveEdit = async (tripId, field, newValue) => {
        try {
            // 1. Appel API
            await client.put(`/trips/${tripId}`, { field, value: newValue });
            
            // 2. Mise à jour locale (pour affichage immédiat)
            setTrips(prev => prev.map(t => t.id === tripId ? { ...t, [field]: newValue } : t));
            
            toast.success('Modifié', { duration: 1000, icon: '✅' });
            setEditingCell(null); // Fermer l'édition
        } catch (error) {
            console.error(error);
            toast.error("Erreur de sauvegarde");
        }
    };

    // Composant Cellule Éditable
    const EditableCell = ({ row, field, value, type = "text" }) => {
        const isEditing = editingCell?.id === row.id && editingCell?.field === field;
        const [tempValue, setTempValue] = useState(value); // Valeur temporaire pendant la frappe

        // Si on change de ligne, on remet la valeur temporaire à jour
        useEffect(() => {
            if (!isEditing) setTempValue(value);
        }, [isEditing, value]);

        if (viewTrash) return <span>{value}</span>;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1 absolute z-50 bg-white border border-blue-500 rounded shadow-lg p-1 min-w-[150px] -translate-y-1/2">
                    <input
                        autoFocus
                        type={type}
                        value={tempValue || ''}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="w-full p-1 text-sm outline-none bg-gray-50 rounded"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(row.id, field, tempValue);
                            if (e.key === 'Escape') setEditingCell(null);
                        }}
                    />
                    <button 
                        onClick={() => saveEdit(row.id, field, tempValue)} 
                        className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                        title="Valider"
                    >
                        <Check size={12} />
                    </button>
                    <button 
                        onClick={() => setEditingCell(null)} 
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        title="Annuler"
                    >
                        <X size={12} />
                    </button>
                </div>
            );
        }

        return (
            <div 
                onDoubleClick={() => setEditingCell({ id: row.id, field })}
                className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 p-1 rounded min-h-[20px] transition-colors relative"
                title="Double-clic pour modifier"
            >
                {value || <span className="text-gray-300 text-[10px] italic">Vide</span>}
            </div>
        );
    };

    // --- LOGIQUE SUPPRESSION / RESTAURATION ---
    const moveToTrash = async (tripId) => {
        if(!window.confirm("Déplacer vers la corbeille ?")) return;
        try {
            await client.put(`/trips/trash/${tripId}`);
            toast.success("Mis à la corbeille");
            fetchLogbook();
        } catch (e) { toast.error("Erreur"); }
    };

    const restoreFromTrash = async (tripId) => {
        try {
            await client.put(`/trips/restore/${tripId}`);
            toast.success("Restauré !");
            fetchLogbook();
        } catch (e) { toast.error("Erreur"); }
    };

    const deleteForever = async (tripId) => {
        if(!window.confirm("ATTENTION : Suppression définitive ! Continuer ?")) return;
        try {
            await client.delete(`/trips/${tripId}`);
            toast.success("Supprimé définitivement");
            fetchLogbook();
        } catch (e) { toast.error("Erreur"); }
    };

    const handleNewTrip = async (e) => {
        e.preventDefault();
        try {
            await client.post('/trips', { 
                ...newTripData, 
                vehicle_id: id, 
                // Assurez-vous que ces valeurs sont converties si elles sont des chaînes vides
                km_depart: newTripData.km_depart ? parseFloat(newTripData.km_depart) : null, 
                km_arrivee: newTripData.km_arrivee ? parseFloat(newTripData.km_arrivee) : null
            });
            toast.success('Trajet ajouté');
            setNewTripData(initialTripData);
            setIsModalOpen(false);
            fetchLogbook();
        } catch (error) { toast.error('Erreur ajout'); }
    };

    if (loading) return <div className="p-10 text-center">Chargement...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <Toaster position="top-right" />
            
            {/* HEADER NAVIGATION (Caché à l'impression) */}
            <div className="flex justify-between items-center mb-6 no-print">
                <div className="flex gap-4">
                    <button onClick={() => navigate('/fuel')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600">
                    <ArrowLeft size={20}/> Retour
                    </button>
                    <button 
                        onClick={() => setViewTrash(!viewTrash)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold transition-colors ${viewTrash ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    >
                        <Trash2 size={16}/> {viewTrash ? "Quitter la Corbeille" : "Corbeille"}
                    </button>
                </div>

                <div className="flex gap-3">
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="border p-2 rounded-lg text-sm"/>
                    <span className="self-center">au</span>
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="border p-2 rounded-lg text-sm"/>
                    
                    <button onClick={() => window.print()} className="bg-white border text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 shadow-sm">
                        <Printer size={18}/> Imprimer
                    </button>
                    
                    {!viewTrash && (
                        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md">
                            <Plus size={18}/> Nouveau
                        </button>
                    )}
                </div>
            </div>

            {/* --- ZONE IMPRIMABLE --- */}
            <div className={`printable-area bg-white shadow-xl max-w-[297mm] mx-auto p-8 min-h-[210mm] border border-gray-200 text-sm ${viewTrash ? 'border-red-400 bg-red-50' : ''}`}>
                
                {viewTrash && <div className="text-center bg-red-600 text-white p-2 mb-4 font-bold uppercase tracking-widest rounded">Mode Corbeille - Éléments supprimés</div>}

                {/* En-tête Document */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider text-gray-800">Journal de Bord Voiture</h1>
                        <p className="text-gray-500 mt-1">Période du {new Date(dateRange.start).toLocaleDateString()} au {new Date(dateRange.end).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{vehicle?.immatriculation}</div>
                        <div className="text-gray-600 font-medium">{vehicle?.marque} - {vehicle?.type}</div>
                    </div>
                </div>

                {/* TABLEAU TRAJETS */}
                <div className="mb-8">
                    <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><MapPin size={16}/> ITINÉRAIRES & DÉPLACEMENTS</h3>
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 uppercase">
                                <th className="border border-gray-300 p-2 w-24">Date</th>
                                <th className="border border-gray-300 p-2" colSpan="2">DÉPART (Heure / Lieu / Km)</th>
                                <th className="border border-gray-300 p-2" colSpan="2">ARRIVÉE (Heure / Lieu / Km)</th>
                                <th className="border border-gray-300 p-2 w-16">Dist. (km)</th>
                                <th className="border border-gray-300 p-2">Personnes / Motif</th>
                                <th className="border border-gray-300 p-2 w-10 no-print"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {trips.length === 0 ? (
                                <tr><td colSpan="8" className="p-8 text-center text-gray-400 italic">Aucune donnée.</td></tr>
                            ) : (
                                trips.map((trip) => (
                                    <tr key={trip.id} className="text-center hover:bg-gray-50 group">
                                        <td className="border border-gray-300 p-2 font-medium">
                                            <EditableCell row={trip} field="date" value={trip.date ? trip.date.split('T')[0] : ''} type="date" />
                                        </td>
                                        
                                        {/* DEPART */}
                                        <td className="border border-gray-300 p-2 text-left w-24">
                                            <div className="font-bold"><EditableCell row={trip} field="heure_depart" value={trip.heure_depart} type="time" /></div>
                                            <div className="text-gray-500 text-[10px]">Km: <EditableCell row={trip} field="km_depart" value={trip.km_depart} type="number" /></div>
                                        </td>
                                        <td className="border border-gray-300 p-2 text-left font-medium text-blue-800 bg-blue-50/10">
                                            <EditableCell row={trip} field="lieu_depart" value={trip.lieu_depart} />
                                        </td>

                                        {/* ARRIVEE */}
                                        <td className="border border-gray-300 p-2 text-left w-24">
                                            <div className="font-bold"><EditableCell row={trip} field="heure_arrivee" value={trip.heure_arrivee} type="time" /></div>
                                            <div className="text-gray-500 text-[10px]">Km: <EditableCell row={trip} field="km_arrivee" value={trip.km_arrivee} type="number" /></div>
                                        </td>
                                        <td className="border border-gray-300 p-2 text-left font-medium text-green-800 bg-green-50/10">
                                            <EditableCell row={trip} field="lieu_arrivee" value={trip.lieu_arrivee} />
                                        </td>

                                        {/* DISTANCE */}
                                        <td className="border border-gray-300 p-2 font-bold">
                                            {trip.km_arrivee && trip.km_depart ? (parseFloat(trip.km_arrivee) - parseFloat(trip.km_depart)).toFixed(0) : '-'}
                                        </td>

                                        {/* MOTIF */}
                                        <td className="border border-gray-300 p-2 text-left text-gray-600">
                                            <EditableCell row={trip} field="motif" value={trip.motif} />
                                        </td>

                                        {/* ACTIONS (Suppression / Restauration) */}
                                        <td className="border border-gray-300 p-2 no-print">
                                            {viewTrash ? (
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => restoreFromTrash(trip.id)} className="text-green-500 hover:bg-green-100 p-1 rounded" title="Restaurer"><RefreshCw size={14}/></button>
                                                    <button onClick={() => deleteForever(trip.id)} className="text-red-600 hover:bg-red-100 p-1 rounded" title="Supprimer Définitivement"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => moveToTrash(trip.id)} 
                                                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Mettre à la corbeille"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* SECTION BASSE (STATIQUE POUR L'INSTANT, MODIFIABLE VIA TABLEAU CARBURANT) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Fuel size={16}/> APPROVISIONNEMENT CARBURANT</h3>
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                            <thead><tr className="bg-gray-100"><th className="border p-2">Date</th><th className="border p-2">Litres</th><th className="border p-2">Montant</th></tr></thead>
                            <tbody>
                                {fuels.map(f => (
                                    <tr key={f.id}><td className="border p-2">{new Date(f.date).toLocaleDateString()}</td><td className="border p-2 font-bold">{f.litres} L</td><td className="border p-2">{Number(f.montant).toLocaleString()}</td></tr>
                                ))}
                                {fuels.length === 0 && <tr><td colSpan="3" className="p-2 text-center text-gray-400 italic">Pas de pleins enregistrés sur la période.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="border border-gray-300 p-4 bg-gray-50 rounded-lg">
                        {/* Calculs pour les KPIs */}
                        {(() => {
                            const totalDistance = trips.reduce((acc, t) => acc + (t.km_arrivee && t.km_depart ? (parseFloat(t.km_arrivee) - parseFloat(t.km_depart)) : 0), 0);
                            const totalFuel = fuels.reduce((acc, f) => acc + Number(f.litres), 0);
                            const avgConso = (totalFuel / totalDistance) * 100;
                            return (
                                <>
                                    <div className="flex justify-between items-center mb-4"><span className="text-gray-600">Total KM :</span><span className="text-xl font-bold">{totalDistance.toFixed(0)} km</span></div>
                                    <div className="flex justify-between items-center mb-8"><span className="text-gray-600">Conso Moyenne :</span><span className={`text-lg font-bold ${avgConso > 15 ? 'text-red-600' : 'text-purple-600'}`}>{totalDistance > 0 ? avgConso.toFixed(1) : '0.0'} L/100</span></div>
                                    <div className="mt-8 pt-8 border-t border-gray-300 flex justify-between text-xs text-gray-500 uppercase"><div>Visa Chef de Char</div><div>Visa Chauffeur</div><div>Visa Logistique</div></div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* MODAL NOUVEAU TRAJET */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-[100] no-print">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6">
                        <h3 className="text-xl font-bold mb-4">Nouveau Trajet</h3>
                        <form onSubmit={handleNewTrip} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" required className="border p-2 rounded" value={newTripData.date} onChange={e => setNewTripData({...newTripData, date: e.target.value})} />
                                <input type="text" placeholder="Motif" className="border p-2 rounded" value={newTripData.motif} onChange={e => setNewTripData({...newTripData, motif: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 border p-4 rounded">
                                <h4 className="col-span-2 font-bold text-blue-600">DÉPART</h4>
                                <input type="time" className="border p-2 rounded" value={newTripData.heure_depart} onChange={e => setNewTripData({...newTripData, heure_depart: e.target.value})} />
                                <input type="number" placeholder="KM Départ" className="border p-2 rounded" value={newTripData.km_depart} onChange={e => setNewTripData({...newTripData, km_depart: e.target.value})} />
                                <input type="text" placeholder="Lieu Départ" className="border p-2 rounded col-span-2" value={newTripData.lieu_depart} onChange={e => setNewTripData({...newTripData, lieu_depart: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 border p-4 rounded">
                                <h4 className="col-span-2 font-bold text-green-600">ARRIVÉE</h4>
                                <input type="time" className="border p-2 rounded" value={newTripData.heure_arrivee} onChange={e => setNewTripData({...newTripData, heure_arrivee: e.target.value})} />
                                <input type="number" placeholder="KM Arrivée" className="border p-2 rounded" value={newTripData.km_arrivee} onChange={e => setNewTripData({...newTripData, km_arrivee: e.target.value})} />
                                <input type="text" placeholder="Lieu Arrivée" className="border p-2 rounded col-span-2" value={newTripData.lieu_arrivee} onChange={e => setNewTripData({...newTripData, lieu_arrivee: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Annuler</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogbookPage;