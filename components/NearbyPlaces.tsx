
import React, { useState } from 'react';
import { ODBLocation, NearbyLocation, User } from '../types';
import { getODBLocations, calculateDistance, saveODBLocation, getSiteSettings } from '../services/mockBackend';
import { Icons } from './Icons';

interface NearbyPlacesProps {
  user: User;
}

const NearbyPlaces: React.FC<NearbyPlacesProps> = ({ user }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyLocation[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Toggle between View and Edit mode
  const [zoomedImage, setZoomedImage] = useState<string | null>(null); // For full screen image
  
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }

    setStatus('loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        processNearby(latitude, longitude);
        setStatus('success');
      },
      (error) => {
        setStatus('error');
        let msg = 'حدث خطأ أثناء تحديد الموقع.';
        if (error.code === 1) msg = 'تم رفض إذن الوصول للموقع.';
        else if (error.code === 2) msg = 'الموقع غير متاح.';
        else if (error.code === 3) msg = 'انتهت مهلة تحديد الموقع.';
        setErrorMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const processNearby = (lat: number, lng: number) => {
    const allLocations = getODBLocations();
    const settings = getSiteSettings(); // Get dynamic settings
    
    let placesWithDistance = allLocations.map((loc) => {
      const dist = calculateDistance(lat, lng, loc.LATITUDE, loc.LONGITUDE);
      return { ...loc, distance: dist };
    });

    // 1. Sort by distance
    placesWithDistance.sort((a, b) => a.distance - b.distance);

    // 2. Filter by Radius (if radius > 0)
    if (settings.searchRadius > 0) {
        placesWithDistance = placesWithDistance.filter(p => p.distance <= settings.searchRadius);
    }

    // 3. Slice by maxResults
    setNearbyPlaces(placesWithDistance.slice(0, settings.maxResults));
  };

  // Handle Item Click
  const handleItemClick = (place: NearbyLocation) => {
      setFormData({...place});
      setIsEditing(false); // Start in view mode
      setIsModalOpen(true);
  };

  // Handle Image Capture
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

  // Handle Directions
  const handleGetDirections = () => {
      if (!formData.LATITUDE || !formData.LONGITUDE) return;

      const dest = `${formData.LATITUDE},${formData.LONGITUDE}`;
      let origin = '';
      
      if (userCoords) {
          origin = `${userCoords.lat},${userCoords.lng}`;
      }

      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
      window.open(url, '_blank');
  };

  // Save Logic (Updates the original DB entry)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.CITYNAME || !formData.ODB_ID || !formData.id) {
        alert('حدث خطأ: بيانات الموقع غير مكتملة (ID أو الاسم مفقود).');
        return;
    }

    const now = new Date();
    const locToSave: ODBLocation = {
        id: formData.id,
        ODB_ID: formData.ODB_ID,
        CITYNAME: formData.CITYNAME,
        LATITUDE: Number(formData.LATITUDE),
        LONGITUDE: Number(formData.LONGITUDE),
        image: formData.image,
        notes: formData.notes,
        lastEditedBy: user.name,
        lastEditedAt: now.toISOString(),
    };

    // Save to backend
    saveODBLocation(locToSave);

    // Update local list to reflect changes immediately without refetching coords
    setNearbyPlaces(prev => prev.map(p => {
        if (p.id === locToSave.id) {
            return { ...p, ...locToSave }; // Merge updates
        }
        return p;
    }));

    // Visual Feedback
    alert('تم حفظ التعديلات بنجاح');

    setIsEditing(false); // Switch back to view mode after save
    setFormData(locToSave); // Update current view data
  };

  // Formatter for date
  const formatDate = (isoString?: string) => {
      if (!isoString) return null;
      try {
          return new Intl.DateTimeFormat('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              hour12: true
          }).format(new Date(isoString));
      } catch (e) {
          return isoString;
      }
  };

  // Get settings to display info
  const settings = getSiteSettings();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="w-full md:w-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">الأماكن القريبة</h2>
            <p className="text-purple-100 opacity-90 text-sm md:text-base leading-relaxed">
              البحث عن أقرب {settings.maxResults} موقع 
              {settings.searchRadius > 0 ? ` في نطاق ${settings.searchRadius} كم` : ' (نطاق مفتوح)'}.
            </p>
          </div>
          <button
            onClick={handleGetLocation}
            disabled={status === 'loading'}
            className="w-full md:w-auto bg-white text-purple-700 hover:bg-gray-50 px-6 py-3 rounded-lg md:rounded-full font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {status === 'loading' ? (
              <span className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Icons.MapPin />
            )}
            <span>تحديث موقعي</span>
          </button>
        </div>

        {userCoords && (
            <div className="mt-6 pt-4 border-t border-white/20 text-xs md:text-sm font-mono text-purple-100 flex flex-wrap gap-2">
                <span className="opacity-70">إحداثياتك:</span>
                <span dir="ltr">{userCoords.lat.toFixed(6)}, {userCoords.lng.toFixed(6)}</span>
            </div>
        )}
      </div>

      {status === 'error' && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center text-sm md:text-base">
          {errorMsg}
        </div>
      )}

      {status === 'success' && nearbyPlaces.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
            أقرب النتائج ({nearbyPlaces.length})
          </h3>
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {nearbyPlaces.map((place, idx) => (
              <div 
                key={place.ODB_ID} 
                onClick={() => handleItemClick(place)}
                className="flex items-center p-3 md:p-4 bg-gray-50 rounded-xl hover:bg-purple-50 border border-gray-200 hover:border-purple-200 transition-all group cursor-pointer active:scale-[0.98]"
              >
                <div className="relative">
                    <div className="bg-white w-10 h-10 md:w-12 md:h-12 rounded-full shadow-sm text-purple-600 font-bold flex items-center justify-center text-base md:text-lg shrink-0 border border-gray-100 overflow-hidden">
                        {place.image ? (
                            <img src={place.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            idx + 1
                        )}
                    </div>
                </div>
                <div className="mr-3 md:mr-4 flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 group-hover:text-purple-700 truncate">{place.CITYNAME}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                        <span className="font-medium text-gray-700 bg-gray-200 px-1.5 rounded text-xs">{place.distance.toFixed(2)}</span>
                        <span>كم</span>
                     </p>
                     {place.notes && <span className="text-xs text-yellow-600 bg-yellow-100 px-1.5 rounded">ملاحظات</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
       {status === 'success' && nearbyPlaces.length === 0 && (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
             <div className="flex flex-col items-center gap-2">
                 <Icons.MapPin />
                 <p className="text-gray-500 font-medium mt-2">لا توجد أماكن مسجلة قريبة.</p>
                 <p className="text-sm text-gray-400">
                     حاول زيادة "نطاق البحث" من إعدادات الموقع.
                 </p>
             </div>
         </div>
       )}

      {/* Redesigned Detail Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100">
            
            {/* Standard Header */}
            <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                        <Icons.MapPin />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-none">{formData.CITYNAME}</h3>
                        <span className="text-xs text-gray-400 font-mono mt-1 block">{formData.ODB_ID}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isEditing && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                            <Icons.Edit />
                            <span>تعديل</span>
                        </button>
                    )}
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Icons.X />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto flex-1">
                {!isEditing ? (
                    // ================= VIEW MODE =================
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        
                        {/* 1. Lat/Long Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center hover:bg-gray-100 transition-colors">
                                <span className="block text-xs text-gray-400 mb-1 font-medium">خط العرض</span>
                                <span className="font-mono font-bold text-gray-700 text-sm" dir="ltr">{formData.LATITUDE}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center hover:bg-gray-100 transition-colors">
                                <span className="block text-xs text-gray-400 mb-1 font-medium">خط الطول</span>
                                <span className="font-mono font-bold text-gray-700 text-sm" dir="ltr">{formData.LONGITUDE}</span>
                            </div>
                        </div>

                        {/* 2. Image Display (Moved Below Coords) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">صورة الموقع</label>
                            <div 
                                className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 group cursor-pointer"
                                onClick={() => formData.image && setZoomedImage(formData.image)}
                            >
                                {formData.image ? (
                                    <>
                                        <img 
                                            src={formData.image} 
                                            alt="Location" 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-opacity flex items-center gap-1">
                                                <Icons.Search />
                                                تكبير
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <Icons.MapPin />
                                        <span className="text-xs mt-2">لا توجد صورة</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Notes */}
                        {formData.notes ? (
                            <div className="bg-yellow-50/80 border border-yellow-100 rounded-xl p-4 relative">
                                <span className="absolute -top-2 right-3 bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded font-bold">ملاحظات</span>
                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{formData.notes}</p>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-400 text-sm italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                لا توجد ملاحظات مسجلة
                            </div>
                        )}

                        {/* 4. Directions Button */}
                        <button 
                            onClick={handleGetDirections}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-3.5 px-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 group"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform bg-white/20 p-1 rounded-full">
                                <Icons.Navigation />
                            </span>
                            <span>الذهاب للموقع (Maps)</span>
                        </button>

                        {/* Audit Info */}
                        {(formData.lastEditedBy || formData.lastEditedAt) && (
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <div className="flex items-center gap-2 text-xs text-gray-400 justify-center bg-gray-50 py-2 rounded-lg">
                                    <Icons.Edit />
                                    <span>آخر تعديل بواسطة:</span>
                                    <span className="font-bold text-gray-600">{formData.lastEditedBy || 'غير معروف'}</span>
                                    {formData.lastEditedAt && (
                                        <>
                                            <span className="mx-1">•</span>
                                            <span>{formatDate(formData.lastEditedAt)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // ================= EDIT MODE =================
                    <form onSubmit={handleSave} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                         
                         {/* 1. Coordinates Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">خط العرض (Lat)</label>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    value={formData.LATITUDE}
                                    onChange={(e) => setFormData({ ...formData, LATITUDE: parseFloat(e.target.value) })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">خط الطول (Long)</label>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    value={formData.LONGITUDE}
                                    onChange={(e) => setFormData({ ...formData, LONGITUDE: parseFloat(e.target.value) })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-center"
                                />
                            </div>
                        </div>

                         {/* 2. Image Update (Moved Below Coords) */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-2">
                                <Icons.Camera />
                                <span>تحديث الصورة</span>
                            </label>
                            <div className="flex gap-3 items-center">
                                <label className="flex-1 flex flex-col items-center justify-center h-32 bg-white border-2 border-dashed border-purple-200 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors relative overflow-hidden">
                                    {formData.image ? (
                                        <img src={formData.image} alt="New" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                    ) : null}
                                    <div className="relative z-10 flex flex-col items-center">
                                        <Icons.Upload />
                                        <span className="text-[10px] font-bold text-purple-600 mt-1">التقط أو اختر صورة</span>
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        className="hidden" 
                                        onChange={handleImageCapture}
                                    />
                                </label>
                                {formData.image && (
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, image: ''})}
                                        className="h-32 w-12 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 flex items-center justify-center transition-colors"
                                        title="حذف الصورة"
                                    >
                                        <Icons.Trash />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 3. Notes Input */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm min-h-[80px]"
                                placeholder="اكتب ملاحظاتك هنا..."
                            ></textarea>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                             <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl transition-colors font-bold text-sm"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-bold transition-colors shadow-lg text-sm flex items-center justify-center gap-2"
                            >
                                <span>حفظ التغييرات</span>
                                <Icons.Edit />
                            </button>
                        </div>
                    </form>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Zoom Modal */}
      {zoomedImage && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center p-2 animate-in fade-in duration-200">
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
              >
                  <Icons.X />
              </button>
              <img 
                src={zoomedImage} 
                alt="Full View" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
              />
          </div>
      )}
    </div>
  );
};

export default NearbyPlaces;