
import React, { useState, useEffect, useRef } from 'react';
import { ODBLocation } from '../types';
import { getODBLocations, saveODBLocation, deleteODBLocation, saveBulkODBLocations } from '../services/mockBackend';
import { Icons } from './Icons';

const ODBTable: React.FC = () => {
  const [locations, setLocations] = useState<ODBLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<ODBLocation>>({
    id: 0,
    ODB_ID: '',
    CITYNAME: '',
    LATITUDE: 0,
    LONGITUDE: 0,
  });

  useEffect(() => {
    setLocations(getODBLocations());
  }, []);

  // Filter Logic
  const filteredLocations = locations.filter(loc => {
    const query = searchQuery.toLowerCase();
    return (
      loc.CITYNAME.toLowerCase().includes(query) ||
      loc.ODB_ID.toLowerCase().includes(query) ||
      loc.id.toString().includes(query) ||
      loc.LATITUDE.toString().includes(query) ||
      loc.LONGITUDE.toString().includes(query)
    );
  });

  // Selection Logic (using internal ID now)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredLocations.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Open Modal for details/edit when clicking the row/card
  const handleRowClick = (loc: ODBLocation) => {
    setFormData({ ...loc });
    setIsModalOpen(true);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} موقع/مواقع؟`)) {
      let currentList = [...locations];
      selectedIds.forEach(id => {
        deleteODBLocation(id); // Update backend/localstorage
      });
      // Reload from backend to ensure sync
      setLocations(getODBLocations()); 
      setSelectedIds([]);
    }
  };

  // This is kept for the "Edit" button in the bulk action bar if the user prefers that way
  const handleEditSelected = () => {
    if (selectedIds.length !== 1) return;
    const idToEdit = selectedIds[0];
    const locationToEdit = locations.find(l => l.id === idToEdit);
    if (locationToEdit) {
      setFormData({ ...locationToEdit });
      setIsModalOpen(true);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({ 
        id: 0, 
        ODB_ID: '', // Empty string for new entry
        CITYNAME: '', 
        LATITUDE: 0, 
        LONGITUDE: 0 
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.CITYNAME || !formData.ODB_ID) return;

    const newLoc: ODBLocation = {
      id: formData.id || 0, // 0 means new record for backend
      ODB_ID: formData.ODB_ID,
      CITYNAME: formData.CITYNAME,
      LATITUDE: Number(formData.LATITUDE),
      LONGITUDE: Number(formData.LONGITUDE),
    };

    const updatedList = saveODBLocation(newLoc);
    setLocations(updatedList);
    setIsModalOpen(false);
    setSelectedIds([]); 
  };

  // CSV Import Logic
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Handle different newline formats
        const lines = text.split(/\r\n|\n/);
        const newLocations: Omit<ODBLocation, 'id'>[] = [];
        
        // Expected Header: CITYNAME, LATITUDE, LONGITUDE, ODB_ID (order matters if no headers detected, but we will try to be smart)
        // Default order assumption: Name, Lat, Long, ODB_ID
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Skip header line if it contains "CITYNAME" or "Lat"
            if (i === 0 && (line.toLowerCase().includes('city') || line.toLowerCase().includes('name'))) continue;

            // Detect separator (comma or semicolon)
            const separator = line.includes(';') ? ';' : ',';
            const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, '')); // remove quotes

            if (cols.length < 3) continue; // Need at least City, Lat, Long
            
            // Mapping Strategy: 
            // 0: City
            // 1: Latitude
            // 2: Longitude
            // 3: ODB_ID (Optional, if not present use placeholder or ask user)

            const city = cols[0];
            const lat = parseFloat(cols[1]);
            const lng = parseFloat(cols[2]);
            const odbId = cols[3] || `CSV-${Date.now()}-${i}`;

            if (city && !isNaN(lat) && !isNaN(lng)) {
                newLocations.push({
                    CITYNAME: city,
                    LATITUDE: lat,
                    LONGITUDE: lng,
                    ODB_ID: odbId
                });
            }
        }

        if (newLocations.length > 0) {
            if (window.confirm(`تم قراءة ${newLocations.length} موقع من الملف. هل تريد إضافتهم لقاعدة البيانات؟`)) {
                const updated = saveBulkODBLocations(newLocations);
                setLocations(updated);
                alert(`تمت إضافة المواقع بنجاح.`);
            }
        } else {
            alert('لم يتم العثور على بيانات صالحة في الملف. تأكد من التنسيق: المدينة، خط العرض، خط الطول، ODB_ID');
        }

      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة الملف');
      } finally {
        setIsImporting(false);
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col relative">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept=".csv,.txt" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />

      {/* Top Toolbar */}
      <div className="p-4 md:p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            {/* Title & Action Icons */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">إدارة مواقع ODB</h2>
                  <p className="text-xs text-gray-500 mt-0.5">({locations.length} موقع مسجل)</p>
              </div>
              
              {/* Action Icons Group */}
              <div className="flex items-center gap-2 mr-2 border-r border-gray-200 pr-4">
                <button
                    onClick={handleImportClick}
                    disabled={isImporting}
                    title="استيراد من ملف CSV"
                    className="w-10 h-10 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full transition-colors disabled:opacity-50 shadow-sm border border-emerald-100"
                >
                    {isImporting ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    ) : <Icons.Upload />}
                </button>
                <button
                    onClick={handleOpenAddModal}
                    title="إضافة موقع جديد يدوياً"
                    className="w-10 h-10 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-colors shadow-sm border border-blue-100"
                >
                    <Icons.Plus />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:max-w-xs">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <Icons.Search />
                </div>
                <input 
                    type="text" 
                    className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none text-sm"
                    placeholder="بحث..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
      </div>

      {/* Bulk Action Bar (Floating when items selected) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 bg-slate-800 text-white p-3 shadow-xl flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3 px-4">
                <button onClick={() => setSelectedIds([])} className="hover:bg-slate-700 p-1 rounded text-gray-400 hover:text-white">
                    <Icons.X />
                </button>
                <span className="font-bold text-sm">{selectedIds.length} تم تحديده</span>
            </div>
            <div className="flex gap-2 px-4">
                {selectedIds.length === 1 && (
                    <button 
                        onClick={handleEditSelected}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
                    >
                        <Icons.Edit />
                        <span className="hidden sm:inline">تعديل</span>
                    </button>
                )}
                <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
                >
                    <Icons.Trash />
                    <span className="hidden sm:inline">حذف</span>
                </button>
            </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 w-12 text-center">
                <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={filteredLocations.length > 0 && selectedIds.length === filteredLocations.length}
                />
              </th>
              <th className="py-3 px-4 font-semibold">ID #</th>
              <th className="py-3 px-4 font-semibold">اسم المدينة</th>
              <th className="py-3 px-4 font-semibold">خط العرض (Lat)</th>
              <th className="py-3 px-4 font-semibold">خط الطول (Long)</th>
              <th className="py-3 px-4 font-semibold font-mono text-blue-600">ODB_ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredLocations.length === 0 ? (
                <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                        {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد بيانات حالياً'}
                    </td>
                </tr>
            ) : (
                filteredLocations.map((loc) => (
                <tr 
                    key={loc.id} 
                    onClick={() => handleRowClick(loc)}
                    className={`border-b border-gray-50 transition-colors cursor-pointer ${selectedIds.includes(loc.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={selectedIds.includes(loc.id)}
                            onChange={(e) => {
                                e.stopPropagation(); // Prevent double event
                                handleSelectRow(loc.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500 text-sm">{loc.id}</td>
                    <td className="py-3 px-4 font-medium text-gray-800">{loc.CITYNAME}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-sm" dir="ltr">{loc.LATITUDE}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-sm" dir="ltr">{loc.LONGITUDE}</td>
                    <td className="py-3 px-4 font-mono text-blue-600 text-sm font-bold" dir="ltr">{loc.ODB_ID}</td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden p-4 space-y-4">
        {filteredLocations.length === 0 ? (
             <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا توجد بيانات حالياً'}
             </div>
        ) : (
            filteredLocations.map((loc) => (
                <div 
                    key={loc.id} 
                    className={`border rounded-lg p-4 shadow-sm transition-all active:scale-[0.98] ${selectedIds.includes(loc.id) ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-200'}`}
                    onClick={() => handleRowClick(loc)}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3 w-full">
                             <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 p-2"
                                    checked={selectedIds.includes(loc.id)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleSelectRow(loc.id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                             </div>
                            <div className="flex-1">
                                <span className="text-xs text-gray-400 font-mono block">#{loc.id}</span>
                                <h3 className="font-bold text-gray-900 text-lg">{loc.CITYNAME}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="bg-gray-50/50 p-2 rounded border border-gray-100">
                            <span className="block text-gray-500 text-xs mb-1">خط العرض</span>
                            <span className="font-mono text-gray-700" dir="ltr">{loc.LATITUDE}</span>
                        </div>
                        <div className="bg-gray-50/50 p-2 rounded border border-gray-100">
                            <span className="block text-gray-500 text-xs mb-1">خط الطول</span>
                            <span className="font-mono text-gray-700" dir="ltr">{loc.LONGITUDE}</span>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded font-mono">{loc.ODB_ID}</span>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Modal for Add/Edit/Details */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">
                {formData.id ? 'تفاصيل الموقع' : 'إضافة موقع جديد'}
            </h3>
            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Internal ID (Read Only) */}
              {formData.id ? (
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-500 mb-2 flex justify-between">
                      <span>ID (تلقائي): {formData.id}</span>
                  </div>
              ) : null}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">اسم المدينة <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.CITYNAME}
                  onChange={(e) => setFormData({ ...formData, CITYNAME: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                  placeholder="مثال: القاهرة"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ODB_ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.ODB_ID || ''}
                  onChange={(e) => setFormData({ ...formData, ODB_ID: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow font-mono"
                  placeholder="مثال: LOC-123-A"
                />
                <p className="text-xs text-gray-500 mt-1">رقم تعريفي خاص بالموقع (يقبل حروف وأرقام).</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">خط العرض <span className="text-red-500">*</span></label>
                    <input
                    type="number"
                    step="any"
                    required
                    value={formData.LATITUDE}
                    onChange={(e) => setFormData({ ...formData, LATITUDE: parseFloat(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow font-mono"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">خط الطول <span className="text-red-500">*</span></label>
                    <input
                    type="number"
                    step="any"
                    required
                    value={formData.LONGITUDE}
                    onChange={(e) => setFormData({ ...formData, LONGITUDE: parseFloat(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow font-mono"
                    />
                </div>
              </div>
              <div className="flex gap-3 mt-8 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-blue-800 text-white py-3 rounded-lg transition-colors font-medium shadow-lg shadow-blue-200"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ODBTable;
