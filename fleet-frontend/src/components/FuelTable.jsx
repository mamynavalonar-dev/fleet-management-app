import React, { useState, useEffect } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import client from '../api/client';
import { ChevronLeft, ChevronRight, ArrowUpDown, Search, Loader2, Trash2, FileText } from 'lucide-react';

const FuelTable = ({ refreshTrigger }) => {
  // --- ÉTATS ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // États de gestion de table (Server-Side)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 }); // Page 1 = Index 0
  const [totalPages, setTotalPages] = useState(0);
  const [sorting, setSorting] = useState([{ id: 'date', desc: true }]); // Tri par défaut
  const [globalFilter, setGlobalFilter] = useState(''); // Recherche

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const sortField = sorting.length > 0 ? sorting[0].id : 'date';
      const sortOrder = sorting.length > 0 && sorting[0].desc ? 'desc' : 'asc';

      const res = await client.get('/fuel', {
        params: {
          page: pagination.pageIndex + 1, // Backend attend page 1, pas 0
          limit: pagination.pageSize,
          search: globalFilter,
          sortBy: sortField,
          sortOrder: sortOrder
        }
      });

      setData(res.data.data);
      setTotalPages(res.data.meta.totalPages);
    } catch (error) {
      console.error("Erreur fetch table:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recharger quand un état change (Pagination, Tri, Recherche ou Ajout externe)
  useEffect(() => {
    // Petit debounce pour la recherche pour ne pas spammer l'API
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.pageIndex, pagination.pageSize, sorting, globalFilter, refreshTrigger]);


  // --- DÉFINITION DES COLONNES ---
  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor('date', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-bold hover:text-primary" onClick={column.getToggleSortingHandler()}>
          Date <ArrowUpDown size={14} />
        </button>
      ),
      cell: info => new Date(info.getValue()).toLocaleDateString('fr-FR'),
    }),
    columnHelper.accessor('immatriculation', {
      header: 'Véhicule',
      cell: info => <span className="font-bold text-gray-700">{info.getValue()}</span>,
    }),
    columnHelper.accessor('chauffeur_nom', {
      header: 'Chauffeur',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('litres', {
      header: ({ column }) => (
         <button className="flex items-center gap-1 font-bold hover:text-primary" onClick={column.getToggleSortingHandler()}>
          Litres <ArrowUpDown size={14} />
        </button>
      ),
      cell: info => `${info.getValue()} L`,
    }),
    columnHelper.accessor('montant', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-bold hover:text-primary" onClick={column.getToggleSortingHandler()}>
         Montant <ArrowUpDown size={14} />
       </button>
      ),
      cell: info => <span className="text-primary font-bold">{Number(info.getValue()).toLocaleString()} Ar</span>,
    }),
    columnHelper.accessor('consumption_rate', {
        header: 'Conso (L/100)',
        cell: info => {
            const val = info.getValue();
            return (
                <span className={`font-bold ${val > 15 ? 'text-red-500' : 'text-green-600'}`}>
                    {val ? Number(val).toFixed(1) : '-'} %
                </span>
            )
        }
    }),
    columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (props) => (
            <div className="flex justify-center gap-2">
                 <button 
                    onClick={async () => {
                         if(window.confirm("Supprimer ?")) {
                             await client.delete(`/fuel/${props.row.original.id}`);
                             fetchData();
                         }
                    }}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                 >
                    <Trash2 size={16} />
                 </button>
            </div>
        )
    })
  ];

  // --- HOOK TANSTACK ---
  const table = useReactTable({
    data,
    columns,
    pageCount: totalPages,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true, // Indique qu'on gère la pagination côté serveur
    manualSorting: true,    // Indique qu'on gère le tri côté serveur
    getCoreRowModel: getCoreRowModel(),
  });

  // --- RENDER ---
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* Barre d'outils (Recherche & Taille Page) */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 items-center bg-gray-50/50">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Afficher</span>
          <select
            value={pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="border rounded p-1 outline-none focus:border-primary"
          >
            {[5, 10, 20, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
          <span>lignes</span>
        </div>
      </div>

      {/* Le Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="p-4 border-b border-gray-100 whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
               <tr>
                 <td colSpan={columns.length} className="p-8 text-center text-gray-500">
                   <div className="flex justify-center items-center gap-2">
                     <Loader2 className="animate-spin" /> Chargement...
                   </div>
                 </td>
               </tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="p-8 text-center text-gray-500">Aucune donnée trouvée</td></tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-4 text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
        <span className="text-sm text-gray-500">
            Page <span className="font-bold text-gray-800">{table.getState().pagination.pageIndex + 1}</span> sur {table.getPageCount()}
        </span>
        
        <div className="flex gap-2">
          <button
            className="p-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="p-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FuelTable;