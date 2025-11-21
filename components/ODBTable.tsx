import React, { useState, useEffect } from 'react';
import { ODBLocation } from '../types';
import { getODBLocations, saveODBLocation, deleteODBLocation } from '../services/mockBackend';
import { Icons } from './Icons';
import { generateRandomLocations } from '../services/geminiService';

const ODBTable: React.FC = () => {
  const [locations, setLocations] = useState<ODBLocation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [formData, setFormData] = useState<Partial<ODBLocation>>({
    CITYNAME: '',
    LATITUDE: 0,
    LONGITUDE: 0,
  });

  useEffect(() => {
    setLocations(getODBLocations());
  }, []);

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(locations.map(l => l.ODB_ID));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} موقع/مواقع؟`)) {
      let currentList = [...locations];
      // In a real app, you'd send an array of IDs to the backend.
      // Here we loop for the mock service.
      selectedIds.forEach(id => {
        currentList = deleteODBLocation(id);
      });
      setLocations(getODBLocations()); // Refresh from source
      setSelectedIds([]);
    }
  };

  const handleEditSelected = () => {
    if (selectedIds.length !== 1) return;
    const idToEdit = selectedIds[0];
    const locationToEdit = locations.find(l => l.ODB_ID === idToEdit);
    if (locationToEdit) {
      setFormData({ ...locationToEdit });
      setIsModalOpen(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.CITYNAME) return;

    const newLoc: ODBLocation = {
      ODB_ID: formData.ODB_ID || 0,
      CITYNAME: formData.CITYNAME,
      LATITUDE: Number(formData.LATITUDE),
      LONGITUDE: Number(formData.LONGITUDE),
    };

    const updatedList = saveODBLocation(newLoc);
    setLocations(updatedList);
    setIsModalOpen(false);
    setFormData({ CITYNAME: '', LATITUDE: 0, LONGITUDE: 0 });
    setSelectedIds([]); // Clear selection after edit
  };

  const handleAIGenerate = async () => {
    setIsLoadingAI(true);
    try {
      const newCities = await generateRandomLocations();
      let currentList = getODBLocations();
      for(const city of newCities) {
         currentList = saveODBLocation({
             ODB_ID: 0,
             CITYNAME: city.CITYNAME,
             LATITUDE: city.LATITUDE,
             LONGITUDE: city.LONGITUDE
         });
      }
      setLocations(currentList);
      alert(`تم إضافة ${newCities.length} مدن جديدة بواسطة الذكاء الاصطناعي`);
    } catch(e) {
        alert("فشل في توليد البيانات. تأكد من مفتاح API");
    } finally {
        setIsLoadingAI(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full relative">
      
      {/* Top Toolbar (Normal) */}
      <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">إدارة مواقع ODB</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">قاعدة بيانات المدن والإحداثيات</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
             <button
                onClick={handleAIGenerate}
                disabled={isLoadingAI}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
            >
                {isLoadingAI ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : "إضافة ذكية"}
            </button>
            <button
                onClick={() => {
                    setFormData({ CITYNAME: '', LATITUDE: 0, LONGITUDE: 0 });
                    setIsModalOpen(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-blue-800 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
                <Icons.Plus />
                <span>إضافة موقع</span>
            </button>
        </div>
      </div>

      {/* Bulk Action Bar (Floating/Sticky) */}
      {selectedIds.length > 0 && (
        <div className="absolute top-20 left-0 right-0 mx-4 z-10 bg-slate-800 text-white p-3 rounded-lg shadow-xl flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <button onClick={() => setSelectedIds([])} className="hover:bg-slate-700 p-1 rounded text-gray-400 hover:text-white">
                    <Icons.X />
                </button>
                <span className="font-bold text-sm">{selectedIds.length} تم تحديده</span>
            </div>
            <div className="flex gap-2">
                {selectedIds.length === 1 && (
                    <button 
                        onClick={handleEditSelected}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
                    >
                        <Icons.Edit />
                        <span>تعديل</span>
                    </button>
                )}
                <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
                >
                    <Icons.Trash />
                    <span>حذف</span>
                </button>
            </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="py-3 px-4 border-b w-12 text-center">
                <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={locations.length > 0 && selectedIds.length === locations.length}
                />
              </th>
              <th className="py-3 px-4 font-semibold border-b">اسم المدينة</th>
              <th className="py-3 px-4 font-semibold border-b">خط العرض (Lat)</th>
              <th className="py-3 px-4 font-semibold border-b">خط الطول (Long)</th>
              <th className="py-3 px-4 font-semibold border-b font-mono text-blue-600">ODB_ID</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">لا توجد بيانات حالياً</td>
                </tr>
            ) : (
                locations.map((loc) => (
                <tr 
                    key={loc.ODB_ID} 
                    className={`border-b border-gray-100 transition-colors ${selectedIds.includes(loc.ODB_ID) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                    <td className="py-3 px-4 text-center">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={selectedIds.includes(loc.ODB_ID)}
                            onChange={() => handleSelectRow(loc.ODB_ID)}
                        />
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{loc.CITYNAME}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-sm" dir="ltr">{loc.LATITUDE}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-sm" dir="ltr">{loc.LONGITUDE}</td>
                    <td className="py-3 px-4 font-mono text-blue-600 text-sm font-bold">{loc.ODB_ID}</td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden p-4 space-y-4">
        {locations.length === 0 ? (
             <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                لا توجد بيانات حالياً
             </div>
        ) : (
            locations.map((loc) => (
                <div 
                    key={loc.ODB_ID} 
                    className={`border rounded-lg p-4 shadow-sm transition-all ${selectedIds.includes(loc.ODB_ID) ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-200'}`}
                    onClick={() => handleSelectRow(loc.ODB_ID)} // Allow clicking the whole card to select
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                             <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={selectedIds.includes(loc.ODB_ID)}
                                onChange={(e) => {
                                    e.stopPropagation(); // Prevent double triggering with card click
                                    handleSelectRow(loc.ODB_ID);
                                }}
                            />
                            <h3 className="font-bold text-gray-900 text-lg">{loc.CITYNAME}</h3>
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
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">ODB_ID: {loc.ODB_ID}</span>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-gray-800">
                {formData.ODB_ID ? 'تعديل موقع' : 'إضافة موقع جديد'}
            </h3>
            <form onSubmit={handleSave} className="space-y-5">
              {/* Optional: Display ID if editing */}
              {formData.ODB_ID && (
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-500 mb-2">
                      ODB_ID: {formData.ODB_ID} (غير قابل للتعديل)
                  </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">اسم المدينة</label>
                <input
                  type="text"
                  required
                  value={formData.CITYNAME}
                  onChange={(e) => setFormData({ ...formData, CITYNAME: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                  placeholder="مثال: القاهرة"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">خط العرض</label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">خط الطول</label>
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