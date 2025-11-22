
import React, { useState, useEffect, useRef } from 'react';
import { ODBLocation, User } from '../types';
import { getODBLocationsPaginated, saveODBLocation, deleteODBLocation, saveBulkODBLocations } from '../services/mockBackend';
import { Icons } from './Icons';
import { PermissionGuard } from './PermissionGuard';

interface ODBTableProps {
    user: User;
}

const ODBTable: React.FC<ODBTableProps> = ({ user }) => {
  const [locations, setLocations] = useState<ODBLocation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [limit] = useState(20); 
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false); // For Edit/Create
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // For Viewing Details
  
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null); 
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<ODBLocation>>({
    id: 0, ODB_ID: '', CITYNAME: '', LATITUDE: 0, LONGITUDE: 0, image: '', notes: '', lastEditedBy: '', lastEditedAt: '',
  });

  useEffect(() => {
      const timer = setTimeout(() => {
          setDebouncedSearch(searchQuery);
          setPage(1); 
      }, 500);
      return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLocations = async (signal?: AbortSignal) => {
      setLoading(true);
      try {
          const result = await getODBLocationsPaginated(page, limit, debouncedSearch, signal);
          const uniqueLocations = result.data.filter((loc, index, self) => 
             index === self.findIndex((t) => (t.ODB_ID === loc.ODB_ID))
          );
          setLocations(uniqueLocations);
          setTotalItems(result.total);
          setTotalPages(result.totalPages);
      } catch (error: any) {
          if (error.name !== 'AbortError') console.error("Error fetching locations:", error);
      } finally {
           if (!signal?.aborted) setLoading(false);
      }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLocations(controller.signal);
    return () => controller.abort();
  }, [page, limit, debouncedSearch]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(locations.map(l => l.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleRowClick = (loc: ODBLocation) => {
    // Open View Modal instead of Edit directly
    setFormData({ ...loc });
    setSaveError(null);
    setIsViewModalOpen(true);
  };

  const handleSwitchToEdit = () => {
      setIsViewModalOpen(false);
      setIsModalOpen(true);
  };

  const handleDeleteRow = async (e: React.MouseEvent, id: number, cityName: string) => {
      e.stopPropagation(); 
      const isConfirmed = window.confirm(`هل أنت متأكد من حذف "${cityName}"؟`);
      if (isConfirmed) {
          await deleteODBLocation(id);
          fetchLocations();
          setSelectedIds(prev => prev.filter(pid => pid !== id));
      }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`حذف ${selectedIds.length} مواقع؟`)) {
      for (const id of selectedIds) await deleteODBLocation(id);
      fetchLocations();
      setSelectedIds([]);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({ id: 0, ODB_ID: '', CITYNAME: '', LATITUDE: 0, LONGITUDE: 0, image: '', notes: '', lastEditedBy: '', lastEditedAt: '' });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.CITYNAME || !formData.ODB_ID) return;

    setIsSaving(true);
    setSaveError(null);

    const now = new Date();
    const newLoc: ODBLocation = {
      id: formData.id || 0, 
      ODB_ID: formData.ODB_ID,
      CITYNAME: formData.CITYNAME,
      LATITUDE: Number(formData.LATITUDE),
      LONGITUDE: Number(formData.LONGITUDE),
      image: formData.image,
      notes: formData.notes,
      // Use username preferred, fallback to name, or generic fallback
      lastEditedBy: user.username || user.name || 'Admin',
      lastEditedAt: now.toISOString()
    };

    try {
        await saveODBLocation(newLoc);
        await fetchLocations();
        setIsModalOpen(false);
        setSelectedIds([]); 
    } catch (err: any) {
        setSaveError(err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
        reader.readAsDataURL(file);
    }
  };

  const handleImportClick = () => {
      if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r\n|\n/);
        const newLocations: Omit<ODBLocation, 'id'>[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || (i === 0 && (line.toLowerCase().includes('city')))) continue;
            const cols = line.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, '')); 
            if (cols.length < 3) continue; 
            const city = cols[0]; const lat = parseFloat(cols[1]); const lng = parseFloat(cols[2]); const odbId = cols[3] || `CSV-${Math.floor(Math.random() * 10000)}`;
            if (city && !isNaN(lat)) newLocations.push({ CITYNAME: city, LATITUDE: lat, LONGITUDE: lng, ODB_ID: odbId });
        }
        if (newLocations.length > 0) {
            if (window.confirm(`استيراد ${newLocations.length} موقع؟`)) {
                const result = await saveBulkODBLocations(newLocations);
                alert(`تم: ${result.added}, مكرر: ${result.skipped}`);
                fetchLocations();
            }
        }
      } catch (err: any) { alert('Error: ' + err.message); } finally { setIsImporting(false); }
    };
    reader.readAsText(file);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      <input type="file" accept=".csv,.txt" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-md pb-4 pt-1">
        <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400"><Icons.Search /></div>
                <input type="text" className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm outline-none text-sm" placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            
            <PermissionGuard user={user} resource="odb" action="create">
                <button onClick={handleOpenAddModal} className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                    <Icons.Plus />
                </button>
            </PermissionGuard>
        </div>

        <div className="flex justify-between items-center px-1">
            <p className="text-xs text-gray-500 font-medium">{loading ? '...' : `العدد: ${totalItems}`}</p>
            
            <PermissionGuard user={user} resource="odb" action="create">
                <button onClick={handleImportClick} disabled={isImporting || loading} className="text-xs flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold">
                    {isImporting ? '...' : <><Icons.Upload /> <span>CSV</span></>}
                </button>
            </PermissionGuard>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-28 left-4 right-4 md:absolute md:top-20 md:z-30 bg-slate-900 text-white p-3 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 px-2">
                <button onClick={() => setSelectedIds([])}><Icons.X /></button>
                <span className="font-bold text-sm">{selectedIds.length}</span>
            </div>
            <PermissionGuard user={user} resource="odb" action="delete">
                <button onClick={handleBulkDelete} className="bg-red-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Icons.Trash /> <span>حذف</span>
                </button>
            </PermissionGuard>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
        <table className="w-full text-right border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} checked={locations.length > 0 && selectedIds.length === locations.length} /></th>
              <th className="py-3 px-4 font-semibold">المدينة</th>
              <th className="py-3 px-4 font-semibold">ODB_ID</th>
              <th className="py-3 px-4 font-semibold text-center">أدوات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? ( <tr><td colSpan={4} className="text-center py-20">...</td></tr> ) : 
             locations.map((loc) => (
                <tr key={loc.id} onClick={() => handleRowClick(loc)} className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${selectedIds.includes(loc.id) ? 'bg-blue-50' : ''}`}>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(loc.id)} onChange={(e) => { e.stopPropagation(); handleSelectRow(loc.id); }} /></td>
                    <td className="py-3 px-4 font-medium flex items-center gap-2">{loc.image && <Icons.MapPin />}{loc.CITYNAME}</td>
                    <td className="py-3 px-4 text-blue-600 font-mono text-sm">{loc.ODB_ID}</td>
                    <td className="py-3 px-4 text-center">
                        <PermissionGuard user={user} resource="odb" action="delete">
                            <button onClick={(e) => handleDeleteRow(e, loc.id, loc.CITYNAME)} className="p-2 text-gray-400 hover:text-red-600"><Icons.Trash /></button>
                        </PermissionGuard>
                    </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile App Card */}
      <div className="md:hidden space-y-3 pb-4">
        {locations.map((loc) => (
            <div key={loc.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${selectedIds.includes(loc.id) ? 'border-primary bg-blue-50' : 'border-gray-100'}`} onClick={() => handleRowClick(loc)}>
                <div className="flex justify-between">
                    <h3 className="font-bold">{loc.CITYNAME}</h3>
                    <span className="text-xs bg-gray-100 px-2 rounded">{loc.ODB_ID}</span>
                </div>
                <div className="mt-3 flex justify-between items-center border-t pt-2">
                     <PermissionGuard user={user} resource="odb" action="delete">
                         <button onClick={(e) => handleDeleteRow(e, loc.id, loc.CITYNAME)} className="text-red-500"><Icons.Trash /></button>
                     </PermissionGuard>
                </div>
            </div>
        ))}
      </div>

      {/* Pagination */}
      {locations.length > 0 && (
        <div className="flex justify-center gap-4 py-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-10 h-10 bg-white border rounded-full shadow-sm">{'<'}</button>
            <span className="mt-2 text-sm font-bold">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-10 h-10 bg-white border rounded-full shadow-sm">{'>'}</button>
        </div>
      )}

      {/* VIEW DETAIL MODAL */}
      {isViewModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}></div>
            <div className="relative bg-white w-full md:w-[500px] rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
                
                {/* Modal Header */}
                <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent text-white">
                    <h3 className="font-bold text-lg shadow-black drop-shadow-md">{formData.CITYNAME}</h3>
                    <button onClick={() => setIsViewModalOpen(false)} className="bg-black/20 hover:bg-black/40 rounded-full p-1 backdrop-blur-md"><Icons.X /></button>
                </div>

                {/* Image or Placeholder */}
                <div className="h-56 bg-gray-100 relative">
                    {formData.image ? (
                        <img src={formData.image} className="w-full h-full object-cover" alt={formData.CITYNAME} />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <div className="scale-150"><Icons.MapPin /></div>
                            <span className="mt-2 text-sm">لا توجد صورة</span>
                        </div>
                    )}
                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-mono font-bold text-blue-600 shadow-sm">
                        {formData.ODB_ID}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                            <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Latitude</span>
                            <span className="font-mono font-bold text-gray-800">{Number(formData.LATITUDE).toFixed(6)}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                            <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Longitude</span>
                            <span className="font-mono font-bold text-gray-800">{Number(formData.LONGITUDE).toFixed(6)}</span>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Icons.Edit /> ملاحظات
                        </h4>
                        <div className="bg-yellow-50 p-4 rounded-xl text-sm text-gray-700 border border-yellow-100 min-h-[80px]">
                            {formData.notes ? formData.notes : <span className="text-gray-400 italic">لا توجد ملاحظات مسجلة</span>}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="text-center border-t pt-4">
                        <p className="text-xs text-gray-400">
                            آخر تعديل بواسطة <span className="font-bold text-gray-600">{formData.lastEditedBy || 'غير مسجل'}</span>
                        </p>
                        <p className="text-[10px] text-gray-300 mt-1 font-mono">
                            {formData.lastEditedAt ? new Date(formData.lastEditedAt).toLocaleString('ar-EG') : '-'}
                        </p>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-gray-50 border-t flex gap-3">
                    <button onClick={() => setIsViewModalOpen(false)} className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold shadow-sm hover:bg-gray-50">
                        إغلاق
                    </button>
                    <PermissionGuard user={user} resource="odb" action="edit">
                        <button onClick={handleSwitchToEdit} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700">
                            تعديل البيانات
                        </button>
                    </PermissionGuard>
                </div>
            </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-2xl flex flex-col animate-in slide-in-from-bottom-10">
            <div className="p-4 border-b flex justify-between">
                <button onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <h3 className="font-bold">{formData.id ? 'تعديل' : 'جديد'}</h3>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <PermissionGuard user={user} resource="odb" action={formData.id ? 'edit' : 'create'} fallback={<div className="text-red-500 text-center">ليس لديك صلاحية التعديل</div>}>
                    <form id="locForm" onSubmit={handleSave} className="space-y-4">
                        <input type="text" placeholder="المدينة" required value={formData.CITYNAME} onChange={e => setFormData({...formData, CITYNAME: e.target.value})} className="w-full p-3 border rounded-xl" />
                        <input type="text" placeholder="كود ODB" required value={formData.ODB_ID} onChange={e => setFormData({...formData, ODB_ID: e.target.value})} className="w-full p-3 border rounded-xl" />
                        <div className="flex gap-2">
                            <input type="number" placeholder="Lat" required value={formData.LATITUDE} onChange={e => setFormData({...formData, LATITUDE: parseFloat(e.target.value)})} className="w-full p-3 border rounded-xl" />
                            <input type="number" placeholder="Lng" required value={formData.LONGITUDE} onChange={e => setFormData({...formData, LONGITUDE: parseFloat(e.target.value)})} className="w-full p-3 border rounded-xl" />
                        </div>
                        <textarea placeholder="ملاحظات" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-3 border rounded-xl h-20"></textarea>
                        <label className="block w-full p-3 border border-dashed rounded-xl text-center cursor-pointer">
                            {formData.image ? 'تغيير الصورة' : 'إضافة صورة'}
                            <input type="file" hidden onChange={handleImageCapture} />
                        </label>
                    </form>
                </PermissionGuard>
            </div>
            <div className="p-4 border-t">
                <PermissionGuard user={user} resource="odb" action={formData.id ? 'edit' : 'create'}>
                     <button form="locForm" disabled={isSaving} className="w-full bg-primary text-white py-3 rounded-xl font-bold">{isSaving ? '...' : 'حفظ'}</button>
                </PermissionGuard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ODBTable;
