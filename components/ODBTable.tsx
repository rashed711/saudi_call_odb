
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
  const [zoomedImage, setZoomedImage] = useState<string | null>(null); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<ODBLocation>>({
    id: 0,
    ODB_ID: '',
    CITYNAME: '',
    LATITUDE: 0,
    LONGITUDE: 0,
    image: '',
    notes: '',
    lastEditedBy: '',
    lastEditedAt: '',
  });

  useEffect(() => {
    setLocations(getODBLocations());
  }, []);

  const filteredLocations = locations.filter(loc => {
    const query = searchQuery.toLowerCase();
    return (
      loc.CITYNAME.toLowerCase().includes(query) ||
      loc.ODB_ID.toLowerCase().includes(query) ||
      loc.id.toString().includes(query)
    );
  });

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

  const handleRowClick = (loc: ODBLocation) => {
    setFormData({ ...loc });
    setIsModalOpen(true);
  };

  // --- DELETE LOGIC WITH CONFIRMATION ---
  const handleDeleteRow = (e: React.MouseEvent, id: number, cityName: string) => {
      e.stopPropagation(); 
      
      // Confirmation Dialog
      const isConfirmed = window.confirm(`تحذير هام!\n\nهل أنت متأكد من رغبتك في حذف الموقع: "${cityName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه وسيؤدي لفقدان البيانات.`);
      
      if (isConfirmed) {
          deleteODBLocation(id);
          setLocations(getODBLocations()); 
          setSelectedIds(prev => prev.filter(pid => pid !== id));
      }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`تنبيه أمني!\n\nهل أنت متأكد من حذف ${selectedIds.length} موقع/مواقع؟\nلا يمكن استرجاع البيانات بعد الحذف.`)) {
      selectedIds.forEach(id => {
        deleteODBLocation(id); 
      });
      setLocations(getODBLocations()); 
      setSelectedIds([]);
    }
  };

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
        ODB_ID: '', 
        CITYNAME: '', 
        LATITUDE: 0, 
        LONGITUDE: 0,
        image: '',
        notes: '',
        lastEditedBy: '',
        lastEditedAt: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.CITYNAME || !formData.ODB_ID) return;

    const newLoc: ODBLocation = {
      id: formData.id || 0, 
      ODB_ID: formData.ODB_ID,
      CITYNAME: formData.CITYNAME,
      LATITUDE: Number(formData.LATITUDE),
      LONGITUDE: Number(formData.LONGITUDE),
      image: formData.image,
      notes: formData.notes,
      lastEditedBy: formData.lastEditedBy, 
      lastEditedAt: formData.lastEditedAt 
    };

    const updatedList = saveODBLocation(newLoc);
    setLocations(updatedList);
    setIsModalOpen(false);
    setSelectedIds([]); 
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData({ ...formData, image: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

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
        const lines = text.split(/\r\n|\n/);
        const newLocations: Omit<ODBLocation, 'id'>[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            if (i === 0 && (line.toLowerCase().includes('city') || line.toLowerCase().includes('name'))) continue;
            const separator = line.includes(';') ? ';' : ',';
            const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, '')); 
            if (cols.length < 3) continue; 
            const city = cols[0];
            const lat = parseFloat(cols[1]);
            const lng = parseFloat(cols[2]);
            const odbId = cols[3] || `CSV-${Date.now()}-${i}`;
            if (city && !isNaN(lat) && !isNaN(lng)) {
                newLocations.push({ CITYNAME: city, LATITUDE: lat, LONGITUDE: lng, ODB_ID: odbId });
            }
        }
        if (newLocations.length > 0) {
            if (window.confirm(`تم قراءة ${newLocations.length} موقع. هل تريد إضافتهم؟`)) {
                const updated = saveBulkODBLocations(newLocations);
                setLocations(updated);
            }
        }
      } catch (err) {
        console.error(err);
        alert('خطأ في الملف');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full">
      
      <input type="file" accept=".csv,.txt" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-md pb-4 pt-1">
        <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <Icons.Search />
                </div>
                <input 
                    type="text" 
                    className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                    placeholder="ابحث باسم المدينة أو الكود..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button
                onClick={handleOpenAddModal}
                className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors active:scale-95"
            >
                <Icons.Plus />
            </button>
        </div>

        {/* Toolbar for Desktop / Extra actions */}
        <div className="flex justify-between items-center px-1">
            <p className="text-xs text-gray-500 font-medium">{filteredLocations.length} موقع مسجل</p>
            <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="text-xs flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-bold"
            >
                {isImporting ? 'جاري التحميل...' : <><Icons.Upload /> <span>استيراد CSV</span></>}
            </button>
        </div>
      </div>

      {/* Bulk Action Bar - Floats at bottom on mobile, top on desktop */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 md:absolute md:top-20 md:left-auto md:right-auto md:bottom-auto z-30 bg-slate-900 text-white p-3 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-4 md:slide-in-from-top-2">
            <div className="flex items-center gap-3 px-2">
                <button onClick={() => setSelectedIds([])} className="bg-white/20 p-1 rounded-full">
                    <Icons.X />
                </button>
                <span className="font-bold text-sm">{selectedIds.length} محدد</span>
            </div>
            <div className="flex gap-2">
                {selectedIds.length === 1 && (
                    <button onClick={handleEditSelected} className="bg-blue-600 p-2 rounded-lg text-sm font-bold">
                        <Icons.Edit />
                    </button>
                )}
                <button onClick={handleBulkDelete} className="bg-red-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Icons.Trash />
                    <span>حذف</span>
                </button>
            </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 w-12 text-center">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" onChange={handleSelectAll} checked={filteredLocations.length > 0 && selectedIds.length === filteredLocations.length} />
              </th>
              <th className="py-3 px-4 font-semibold">المدينة</th>
              <th className="py-3 px-4 font-semibold">الإحداثيات</th>
              <th className="py-3 px-4 font-semibold">ODB_ID</th>
              <th className="py-3 px-4 font-semibold text-center">أدوات</th>
            </tr>
          </thead>
          <tbody>
            {filteredLocations.map((loc) => (
                <tr key={loc.id} onClick={() => handleRowClick(loc)} className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${selectedIds.includes(loc.id) ? 'bg-blue-50' : ''}`}>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" checked={selectedIds.includes(loc.id)} onChange={(e) => { e.stopPropagation(); handleSelectRow(loc.id); }} onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-2">
                            {loc.image ? <img src={loc.image} className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400"><Icons.MapPin /></div>}
                            {loc.CITYNAME}
                        </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-sm font-mono" dir="ltr">{loc.LATITUDE.toFixed(4)}, {loc.LONGITUDE.toFixed(4)}</td>
                    <td className="py-3 px-4 text-blue-600 font-bold font-mono text-sm">{loc.ODB_ID}</td>
                    <td className="py-3 px-4 text-center">
                        <button onClick={(e) => handleDeleteRow(e, loc.id, loc.CITYNAME)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Icons.Trash />
                        </button>
                    </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile App Card View */}
      <div className="md:hidden space-y-3 pb-20">
        {filteredLocations.map((loc) => (
            <div 
                key={loc.id} 
                className={`bg-white rounded-2xl p-4 shadow-sm border active:scale-[0.98] transition-transform ${selectedIds.includes(loc.id) ? 'border-primary bg-blue-50/30' : 'border-gray-100'}`}
                onClick={() => handleRowClick(loc)}
            >
                <div className="flex items-start gap-3">
                    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedIds.includes(loc.id) ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'}`} onClick={() => handleSelectRow(loc.id)}>
                            {selectedIds.includes(loc.id) && <div className="scale-75"><Icons.Check /></div>}
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{loc.CITYNAME}</h3>
                            <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{loc.ODB_ID}</span>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 font-mono">
                            <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100">Lat: {loc.LATITUDE.toFixed(4)}</span>
                            <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100">Long: {loc.LONGITUDE.toFixed(4)}</span>
                        </div>
                    </div>
                    
                    {loc.image && (
                        <img src={loc.image} className="w-16 h-16 rounded-xl object-cover border border-gray-100 shadow-sm shrink-0" />
                    )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                     <div className="flex gap-2">
                         {loc.notes && <span className="text-[10px] text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full font-bold">ملاحظات</span>}
                     </div>
                     <button 
                        onClick={(e) => handleDeleteRow(e, loc.id, loc.CITYNAME)}
                        className="text-red-500 p-2 -m-2 active:bg-red-50 rounded-full"
                     >
                         <Icons.Trash />
                     </button>
                </div>
            </div>
        ))}
        
        {filteredLocations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Icons.Search />
                <p className="mt-2 text-sm">لا توجد نتائج</p>
            </div>
        )}
      </div>

      {/* Full Screen Modal (App Style) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-100 md:bg-black/50 md:backdrop-blur-sm flex items-end md:items-center justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-2xl md:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 duration-300">
            
            {/* Modal Header */}
            <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 p-2 -ml-2 hover:bg-gray-50 rounded-full">
                    <span className="text-sm font-bold">إلغاء</span>
                </button>
                <h3 className="font-bold text-lg text-gray-800">{formData.id ? 'تعديل الموقع' : 'إضافة جديد'}</h3>
                <button form="locationForm" type="submit" className="text-primary font-bold text-sm p-2 -mr-2 hover:bg-blue-50 rounded-full">
                    حفظ
                </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
                <form id="locationForm" onSubmit={handleSave} className="space-y-5">
                    
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">اسم المدينة</label>
                            <input
                            type="text"
                            required
                            value={formData.CITYNAME}
                            onChange={(e) => setFormData({ ...formData, CITYNAME: e.target.value })}
                            className="w-full p-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-lg text-gray-900 placeholder-gray-300"
                            placeholder="اكتب الاسم هنا"
                            />
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">كود ODB</label>
                            <input
                            type="text"
                            required
                            value={formData.ODB_ID || ''}
                            onChange={(e) => setFormData({ ...formData, ODB_ID: e.target.value })}
                            className="w-full p-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-mono text-gray-900 tracking-wide"
                            placeholder="XXX-000"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                            <Icons.MapPin />
                            الإحداثيات
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Latitude</label>
                                <input
                                type="number" step="any" required
                                value={formData.LATITUDE}
                                onChange={(e) => setFormData({ ...formData, LATITUDE: parseFloat(e.target.value) })}
                                className="w-full p-3 bg-gray-50 rounded-xl font-mono text-center text-sm focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Longitude</label>
                                <input
                                type="number" step="any" required
                                value={formData.LONGITUDE}
                                onChange={(e) => setFormData({ ...formData, LONGITUDE: parseFloat(e.target.value) })}
                                className="w-full p-3 bg-gray-50 rounded-xl font-mono text-center text-sm focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <label className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase mb-3">
                            <span>الصورة</span>
                            <Icons.Camera />
                        </label>
                        
                        <div className="flex items-center gap-4">
                            <label className="w-20 h-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer active:bg-gray-100 transition-colors">
                                <Icons.Plus />
                                <span className="text-[10px] mt-1">إضافة</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
                            </label>
                            
                            {formData.image && (
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
                                    <img src={formData.image} className="w-full h-full object-cover" onClick={() => setZoomedImage(formData.image!)} />
                                    <button type="button" onClick={() => setFormData({...formData, image: ''})} className="absolute top-0 right-0 bg-red-500 text-white p-1 shadow-sm rounded-bl-lg">
                                        <Icons.X />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ملاحظات</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full p-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all min-h-[100px]"
                            placeholder="أضف أي تفاصيل إضافية..."
                        ></textarea>
                    </div>

                </form>
            </div>
          </div>
        </div>
      )}

      {zoomedImage && (
          <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-2 animate-in fade-in duration-200">
              <button onClick={() => setZoomedImage(null)} className="absolute top-safe right-4 p-4 text-white opacity-80 hover:opacity-100">
                  <Icons.X />
              </button>
              <img src={zoomedImage} className="w-full h-auto max-h-full object-contain" />
          </div>
      )}
    </div>
  );
};

export default ODBTable;
