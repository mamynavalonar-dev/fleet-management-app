import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { 
  ChevronLeft, ChevronRight, Search, Loader2, 
  Trash2, Edit2, X, Check, Eye, EyeOff, 
  Filter, ArrowUpAZ, ArrowDownZA, ListFilter, RefreshCw, 
  ChevronsLeft, ChevronsRight
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// =========================================================
// 1. COMPOSANT MENU DÉROULANT (STYLE EXCEL)
// =========================================================
const ColumnMenu = ({ column, title, options = [], onFilterChange, currentFilter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const menuRef = useRef(null);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Gestion du Tri
  const handleSort = (desc) => {
    column.toggleSorting(desc);
    setIsOpen(false);
  };

  // Gestion du Filtre (Recherche textuelle ou Sélection)
  const handleFilterApply = (val) => {
    onFilterChange(val); // Remonte la valeur au parent
  };

  // Filtrage de la liste des checkbox (recherche locale dans le menu)
  const filteredOptions = options.filter(opt => 
    opt.label && opt.label.toString().toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="relative flex items-center gap-2 h-full" ref={menuRef}>
      <span className="font-bold text-gray-700 uppercase text-xs flex-1">{title}</span>
      
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`p-1 rounded hover:bg-gray-200 transition-colors ${
          column.getIsSorted() || currentFilter ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
        }`}
      >
        <Filter size={14} fill={column.getIsSorted() || currentFilter ? "currentColor" : "none"} />
      </button>

      {isOpen && (
        <div className="absolute top-8 right-0 z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col text-left animate-in fade-in zoom-in-95 duration-100">
          
          {/* Section Tri */}
          <div className="p-2 border-b border-gray-100">
            <button onClick={() => handleSort(false)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
              <ArrowUpAZ size={16} /> Trier A à Z (Croissant)
            </button>
            <button onClick={() => handleSort(true)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
              <ArrowDownZA size={16} /> Trier Z à A (Décroissant)
            </button>
          </div>

          {/* Section Recherche interne */}
          <div className="p-3 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder={`Filtrer ${title}...`} 
                className="w-full pl-8 pr-2 py-2 text-sm border rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleFilterApply(searchValue); }}
              />
            </div>
          </div>

          {/* Section Liste des Valeurs (Checkboxes ou Bouton Appliquer) */}
          <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-1">
            
            <button 
              onClick={() => { handleFilterApply(''); setIsOpen(false); setSearchValue(''); }}
              className="text-xs text-red-500 font-medium hover:underline mb-2 w-full text-left"
            >
              × Effacer le filtre
            </button>

            {options.length > 0 ? (
              filteredOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                  <input 
                    type="checkbox" 
                    checked={currentFilter === opt.label} 
                    onChange={() => handleFilterApply(currentFilter === opt.label ? '' : opt.label)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))
            ) : (
              <div className="text-center">
                <p className="text-xs text-gray-500 italic mb-2">Entrez une valeur ci-dessus</p>
                <button 
                  onClick={() => { handleFilterApply(searchValue); setIsOpen(false); }}
                  className="w-full bg-blue-600 text-white py-1.5 rounded text-xs font-bold shadow hover:bg-blue-700"
                >
                  Appliquer le filtre
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// =========================================================
// 2. COMPOSANT PRINCIPAL (TABLEAU)
// =========================================================
// 🔴 MISE À JOUR DE LA SIGNATURE : Ajout de viewTrash et actions
const FuelTable = ({ refreshTrigger, viewTrash, actions }) => {
  const navigate = useNavigate();

  // --- ÉTATS ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalPages, setTotalPages] = useState(0);
  const [sorting, setSorting] = useState([{ id: 'date', desc: true }]);
  
  // Filtres spécifiques par colonne
  const [columnFilters, setColumnFilters] = useState({
    date: '',
    immatriculation: '',
    chauffeur_nom: '',
    litres: '',
    montant: '',
    consumption_rate: ''
  });

  const [editingRow, setEditingRow] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  // 🔴 Supprimer les états/fonctions de suppression locale
  // const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // const [deleteTarget, setDeleteTarget] = useState(null);

  // 🔴 Extraction des fonctions d'action passées par FuelPage
  const { moveToTrash, restoreFromTrash, deleteForever } = actions;

  // Listes pour les menus déroulants
  const [vehiclesOptions, setVehiclesOptions] = useState([]);
  const [driversOptions, setDriversOptions] = useState([]);

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sortField = sorting.length > 0 ? sorting[0].id : 'date';
      const sortOrder = sorting.length > 0 && sorting[0].desc ? 'desc' : 'asc';

      // Construction des paramètres
      const res = await client.get('/fuel', {
        params: {
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
          sortBy: sortField,
          sortOrder: sortOrder,
          
          // 🔴 CORRECTION CRITIQUE : Filtre pour la corbeille
          deleted: viewTrash, 
          
          // Filtres individuels
          immatriculation: columnFilters.immatriculation,
          chauffeur_nom: columnFilters.chauffeur_nom,
          date: columnFilters.date,
          litres: columnFilters.litres,
          montant: columnFilters.montant,
          consumption_rate: columnFilters.consumption_rate
        }
      });

      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        setData(res.data.data);
        setTotalPages(res.data.meta?.totalPages || 1);
      } else {
        setData([]);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Erreur fetch:", error);
      toast.error("Erreur de connexion au serveur");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, sorting, columnFilters, viewTrash]); // 🔴 AJOUT DE viewTrash aux dépendances

  const fetchOptions = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        client.get('/vehicles'),
        client.get('/drivers')
      ]);
      
      setVehiclesOptions(vRes.data.map(v => ({ value: v.id, label: v.immatriculation })));
      setDriversOptions(dRes.data.map(d => ({ value: d.id, label: d.nom })));
      
    } catch (error) {
      console.error("Erreur options:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  useEffect(() => {
    fetchOptions();
  }, []);

  // --- GESTIONNAIRES D'ACTIONS ---
  const handleFilterChange = (columnId, value) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Retour page 1
  };

  const handleStartEdit = (row) => {
    setEditingRow(row.id);
    setEditFormData({
      id: row.id,
      vehicle_id: row.vehicle_id,
      driver_id: row.driver_id,
      date: row.date ? row.date.split('T')[0] : '',
      km_depart: row.km_depart,
      km_arrivee: row.km_arrivee,
      litres: row.litres,
      montant: row.montant
    });
  };

  const handleSaveEdit = async () => {
    try {
      // 🔴 Si le plein a un driver_id vide ou null, on le force à une chaîne vide pour le PUT
      const dataToSave = {
        ...editFormData,
        driver_id: editFormData.driver_id || '', 
      };

      await client.put(`/fuel/${dataToSave.id}`, dataToSave);
      toast.success('Modifié avec succès !');
      setEditingRow(null);
      fetchData();
    } catch (error) {
      toast.error('Erreur modification');
    }
  };
  
  // 🔴 Suppression de la fonction handleDelete locale

  // --- DÉFINITION DES COLONNES ---
  const columnHelper = createColumnHelper();

  const columns = [
    columnHelper.accessor('date', {
      header: ({ column }) => (
        <ColumnMenu 
          column={column} 
          title="Date" 
          onFilterChange={(val) => handleFilterChange('date', val)}
          currentFilter={columnFilters.date}
        />
      ),
      cell: (info) => {
        if (editingRow === info.row.original.id) {
          return <input type="date" value={editFormData.date} onChange={e => setEditFormData({...editFormData, date: e.target.value})} className="p-1 border rounded w-full"/>;
        }
        return new Date(info.getValue()).toLocaleDateString('fr-FR');
      },
    }),
    columnHelper.accessor('immatriculation', {
      header: ({ column }) => (
        <ColumnMenu 
          column={column} 
          title="Véhicule" 
          options={vehiclesOptions} 
          onFilterChange={(val) => handleFilterChange('immatriculation', val)}
          currentFilter={columnFilters.immatriculation}
        />
      ),
      cell: (info) => <span className="font-bold text-gray-700">{info.getValue()}</span>,
    }),
    columnHelper.accessor('chauffeur_nom', {
      header: ({ column }) => (
        <ColumnMenu 
          column={column} 
          title="Chauffeur" 
          options={driversOptions} 
          onFilterChange={(val) => handleFilterChange('chauffeur_nom', val)}
          currentFilter={columnFilters.chauffeur_nom}
        />
      ),
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('litres', {
      header: ({ column }) => (
        <ColumnMenu 
          column={column} 
          title="Litres" 
          onFilterChange={(val) => handleFilterChange('litres', val)}
          currentFilter={columnFilters.litres}
        />
      ),
      cell: (info) => editingRow === info.row.original.id 
        ? <input type="number" step="0.01" value={editFormData.litres} onChange={e => setEditFormData({...editFormData, litres: e.target.value})} className="w-20 p-1 border rounded"/>
        : `${info.getValue()} L`,
    }),
    columnHelper.accessor('montant', {
      header: ({ column }) => (
        <ColumnMenu 
          column={column} 
          title="Montant (Ar)" 
          onFilterChange={(val) => handleFilterChange('montant', val)}
          currentFilter={columnFilters.montant}
        />
      ),
      cell: (info) => editingRow === info.row.original.id 
        ? <input type="number" value={editFormData.montant} onChange={e => setEditFormData({...editFormData, montant: e.target.value})} className="w-24 p-1 border rounded"/>
        : <span className="text-blue-600 font-bold">{Number(info.getValue()).toLocaleString()} Ar</span>,
    }),
    columnHelper.accessor('consumption_rate', {
      header: ({ column }) => (
        <ColumnMenu 
          column={column} 
          title="Conso (L/100)" 
          onFilterChange={(val) => handleFilterChange('consumption_rate', val)}
          currentFilter={columnFilters.consumption_rate}
        />
      ),
      cell: (info) => {
        const val = info.getValue();
        if (!val || val === 0) return <span className="text-gray-400 text-xs italic">Appoint</span>;
        const isHigh = val > 16;
        const isLow = val < 13;
        return (
          <span className={`font-bold ${isHigh ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-green-600'}`}>
            {Number(val).toFixed(1)}
          </span>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="text-xs font-bold text-gray-700 uppercase">ACTIONS</span>,
      cell: (props) => {
        const row = props.row.original;
        
        // 1. Mode Edition
        if (editingRow === row.id) {
          return (
            <div className="flex gap-2 justify-center">
              <button onClick={handleSaveEdit} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"><Check size={14}/></button>
              <button onClick={() => setEditingRow(null)} className="p-1.5 bg-gray-500 text-white rounded hover:bg-gray-600"><X size={14}/></button>
            </div>
          );
        }

        // 2. Mode Corbeille (viewTrash = true)
        if (viewTrash) {
            return (
                <div className="flex justify-center gap-2">
                    <button 
                        onClick={() => restoreFromTrash(row.id)} 
                        className="p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors" 
                        title="Restaurer"
                    >
                        <RefreshCw size={16}/>
                    </button>
                    <button 
                        onClick={() => deleteForever(row.id)} 
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
                        title="Supprimer Définitivement"
                    >
                        <X size={16}/>
                    </button>
                </div>
            );
        }

        // 3. Mode Normal (viewTrash = false)
        return (
          <div className="flex justify-center gap-2">
            <button 
                onClick={() => navigate(`/vehicles/${row.vehicle_id}/logbook`)} 
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" 
                title="Voir Journal de Bord"
              >
                <Eye size={16}/>
              </button>
            <button onClick={() => handleStartEdit(row)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded transition-colors" title="Modifier"><Edit2 size={16}/></button>
            <button 
                // 🔴 APPELLE LA FONCTION DE SOFT DELETE (Mettre à la corbeille)
                onClick={() => moveToTrash(row.id)} 
                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" 
                title="Mettre à la corbeille"
            >
                <Trash2 size={16}/>
            </button>
          </div>
        );
      },
    })
  ];

  const table = useReactTable({
    data,
    columns,
    pageCount: totalPages,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  // --- RENDER ---
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible pb-20">
      <Toaster position="top-right" />
      
      {/* Header Actions Rapides */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <ListFilter size={16} />
          <span>Filtres actifs : {Object.values(columnFilters).filter(v => v).length}</span>
          {Object.values(columnFilters).some(v => v) && (
            <button 
              onClick={() => setColumnFilters({
                date: '', immatriculation: '', chauffeur_nom: '', 
                litres: '', montant: '', consumption_rate: ''
              })}
              className="text-xs text-red-500 hover:underline ml-2"
            >
              (Tout effacer)
            </button>
          )}
        </div>
        <select
          value={pagination.pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
          className="border rounded-lg p-1.5 text-sm outline-none focus:border-blue-500 bg-white"
        >
          {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size} / page</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="p-3 border-b border-gray-200 border-r last:border-r-0 relative group align-top h-12">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={columns.length} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={32} /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="p-10 text-center text-gray-400 italic">{viewTrash ? "La corbeille est vide." : "Aucune donnée trouvée."}</td></tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr key={row.id} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} ${editingRow === row.original.id ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-3 border-r border-gray-100 last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white sticky bottom-0">
        <span className="text-xs text-gray-500">Page {pagination.pageIndex + 1} sur {totalPages}</span>
        <div className="flex gap-2">
          <button className="p-1.5 rounded border hover:bg-gray-100 disabled:opacity-50" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft size={16}/></button>
          <button className="p-1.5 rounded border hover:bg-gray-100 disabled:opacity-50" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* 🔴 SUPPRESSION DU MODAL DE SUPPRESSION LOCALE (remplacé par les fonctions de la page parente) */}
    </div>
  );
};

export default FuelTable;
