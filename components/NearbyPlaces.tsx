
import React, { useState, useRef } from 'react';
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
  const [isEditing, setIsEditing] = useState(false); 
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // Success Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Ref for file input
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

  const showToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3000);
  };

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
        // Simulate a brief network delay for better UX feel (Skeleton showcase)
        setTimeout(() => {
            processNearby(latitude, longitude);
            setStatus('success');
        }, 800);
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
    const settings = getSiteSettings();
    
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

  const handleItemClick = (place: NearbyLocation) => {
      setFormData({ ...place, notes: place.notes || '' });
      setIsEditing(false);
      setIsModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, place: NearbyLocation) => {
      e.stopPropagation();
      e.preventDefault();
      setFormData({ ...place, notes: place.notes || '' });
      setIsEditing(true);
      setIsModalOpen(true);
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, image: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const triggerCamera = () => {
      fileInputRef.current?.click();
  };

  const handleGetDirections = () => {
      if (!formData.LATITUDE || !formData.LONGITUDE) return;

      const dest = `${formData.LATITUDE},${formData.LONGITUDE}`;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
      window.open(url, '_blank');
  };

  const handleSave = () => {
    if (!formData.CITYNAME || !formData.ODB_ID || !formData.id) {
        alert('حدث خطأ: بيانات الموقع غير مكتملة.');
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

    saveODBLocation(locToSave);

    setNearbyPlaces(prev => prev.map(p => {
        if (p.id === locToSave.id) {
            return { ...p, ...locToSave };
        }
        return p;
    }));

    showToast('تم حفظ التعديلات بنجاح');

    setIsEditing(false);
    setFormData(locToSave);
  };

  const formatDate = (isoString?: string) => {
      if (!isoString) return null;
      try {
          return new Intl.DateTimeFormat('ar-EG', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
          }).format(new Date(isoString));
      } catch (e) {
          return isoString;
      }
  };

  const settings = getSiteSettings();

  return (
    <div className="space-y-4 md:space-y-6">
      
      {/* Success Toast */}
      {toastMsg && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[80] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-green-500 rounded-full p-1"><Icons.Check /></div>
              <span className="font-bold text-sm">{toastMsg}</span>
          </div>
      )}

      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="w-full md:w-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">الأماكن القريبة</h2>
            <p className="text-purple-100 opacity-90 text-sm md:text-base leading-relaxed max-w-lg">
              استعراض أقرب {settings.maxResults} موقع في نطاق {settings.searchRadius > 0 ? `${settings.searchRadius} كم` : 'مفتوح'} من موقعك الحالي.
            </p>
          </div>
          <button
            onClick={handleGetLocation}
            disabled={status === 'loading'}
            className="w-full md:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-purple-700 px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
          >
            {status === 'loading' ? (
              <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
            ) : (
              <Icons.MapPin />
            )}
            <span>تحديث موقعي</span>
          </button>
        </div>

        {userCoords && (
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-mono text-purple-200/80">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>GPS Active:</span>
                <span dir="ltr">{userCoords.lat.toFixed(6)}, {userCoords.lng.toFixed(6)}</span>
            </div>
        )}
      </div>

      {status === 'error' && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-center text-sm md:text-base flex flex-col items-center gap-2">
          <Icons.Ban />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      {status === 'loading' && (
        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-pulse flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {status === 'success' && nearbyPlaces.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in duration-500">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
            <span>تم العثور على {nearbyPlaces.length} موقع</span>
          </h3>
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {nearbyPlaces.map((place, idx) => (
              <div 
                key={place.ODB_ID} 
                onClick={() => handleItemClick(place)}
                className="flex items-center p-3 md:p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md border border-transparent hover:border-purple-100 transition-all group cursor-pointer active:scale-[0.98]"
              >
                <div className="relative">
                    <div className="bg-white w-12 h-12 rounded-2xl shadow-sm text-purple-600 font-bold flex items-center justify-center text-lg shrink-0 border border-gray-100 overflow-hidden">
                        {place.image ? (
                            <img src={place.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="opacity-50">{idx + 1}</span>
                        )}
                    </div>
                </div>
                <div className="mr-3 md:mr-4 flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 group-hover:text-purple-700 truncate leading-tight">{place.CITYNAME}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                     <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        {place.distance.toFixed(1)} كم
                     </span>
                     {place.notes && <span className="w-2 h-2 bg-yellow-400 rounded-full" title="يوجد ملاحظات"></span>}
                  </div>
                </div>
                
                <button
                    type="button"
                    onClick={(e) => handleEditClick(e, place)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 rounded-lg hover:bg-purple-50 hover:text-purple-600 transition-colors shadow-sm border border-gray-100 ml-1"
                >
                    <div className="scale-75"><Icons.Edit /></div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
       {status === 'success' && nearbyPlaces.length === 0 && (
         <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
             <div className="flex flex-col items-center gap-3 animate-in zoom-in duration-300">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
                    <Icons.Search />
                 </div>
                 <p className="text-gray-900 font-bold text-lg">لا توجد أماكن قريبة</p>
                 <p className="text-sm text-gray-500 max-w-xs mx-auto">
                     حاول زيادة نطاق البحث من الإعدادات، أو تأكد من أنك في منطقة مغطاة.
                 </p>
             </div>
         </div>
       )}

      {/* Redesigned Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-full duration-300">
            
            <div className="bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center sticky top-0 z-10 shrink-0">
                <div className="flex flex-col">
                    <h3 className="font-extrabold text-gray-900 text-lg leading-tight truncate max-w-[200px]">
                        {isEditing ? 'تعديل البيانات' : formData.CITYNAME}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-mono font-bold tracking-wide">{formData.ODB_ID}</span>
                </div>
                <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Icons.X />
                </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 overscroll-contain bg-gray-50/50">
                {!isEditing ? (
                    <div className="flex flex-col h-full gap-5">
                        <div className="flex gap-4">
                            <div 
                                className="w-28 h-28 bg-white rounded-2xl shadow-sm border border-gray-200 p-1 shrink-0 cursor-pointer hover:border-primary transition-colors"
                                onClick={() => formData.image && setZoomedImage(formData.image)}
                            >
                                <div className="w-full h-full rounded-xl overflow-hidden relative bg-gray-100 flex items-center justify-center">
                                    {formData.image ? (
                                        <img src={formData.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-300"><Icons.MapPin /></span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-2 justify-center">
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm grid grid-cols-2 gap-2 text-center">
                                    <div>
                                        <span className="block text-[9px] text-gray-400 font-bold uppercase">Lat</span>
                                        <span className="font-mono font-bold text-gray-700 text-xs" dir="ltr">{formData.LATITUDE?.toFixed(5)}</span>
                                    </div>
                                    <div className="border-r border-gray-100">
                                        <span className="block text-[9px] text-gray-400 font-bold uppercase">Long</span>
                                        <span className="font-mono font-bold text-gray-700 text-xs" dir="ltr">{formData.LONGITUDE?.toFixed(5)}</span>
                                    </div>
                                </div>
                                
                                {(formData.lastEditedBy) && (
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 px-1">
                                        <Icons.User />
                                        <span>آخر تحديث: {formData.lastEditedBy}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col">
                            <label className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1">
                                <Icons.Edit /> الملاحظات المسجلة
                            </label>
                            <div className="bg-white rounded-2xl p-4 text-sm text-gray-600 leading-relaxed border border-gray-200 shadow-sm flex-1 max-h-[200px] overflow-y-auto">
                                {formData.notes ? formData.notes : <span className="text-gray-300 italic">لا توجد ملاحظات...</span>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                         <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Latitude</label>
                                <input
                                    type="number" step="any" required
                                    value={formData.LATITUDE}
                                    onChange={(e) => setFormData({ ...formData, LATITUDE: parseFloat(e.target.value) })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-mono text-center focus:ring-2 focus:ring-primary outline-none shadow-sm transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Longitude</label>
                                <input
                                    type="number" step="any" required
                                    value={formData.LONGITUDE}
                                    onChange={(e) => setFormData({ ...formData, LONGITUDE: parseFloat(e.target.value) })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-mono text-center focus:ring-2 focus:ring-primary outline-none shadow-sm transition-all"
                                />
                            </div>
                         </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">الملاحظات</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-primary outline-none resize-none shadow-sm transition-all"
                                placeholder="اكتب أي ملاحظات إضافية هنا..."
                            ></textarea>
                        </div>

                        <div 
                            onClick={triggerCamera}
                            className="w-full h-20 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl flex flex-row items-center justify-center gap-3 text-blue-600 cursor-pointer active:bg-blue-100 hover:bg-blue-50/80 relative overflow-hidden transition-all group"
                        >
                            {formData.image ? (
                                <>
                                    <img src={formData.image} className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 transition-all" />
                                    <div className="relative z-10 flex items-center gap-2 bg-white/90 px-4 py-1.5 rounded-full shadow-sm">
                                        <Icons.Camera />
                                        <span className="text-xs font-bold">تغيير الصورة</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-2 bg-white rounded-full shadow-sm"><Icons.Camera /></div>
                                    <span className="text-xs font-bold">التقاط صورة</span>
                                </>
                            )}
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden" 
                                onChange={handleImageCapture} 
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white shrink-0 pb-safe">
                {!isEditing ? (
                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={handleGetDirections}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Icons.Navigation />
                            <span>اتجاهات القيادة</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="w-14 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                        >
                            <Icons.Edit />
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                         <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button" 
                            onClick={handleSave}
                            className="flex-[2] bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <span>حفظ التعديلات</span>
                            <Icons.Check />
                        </button>
                    </div>
                )}
            </div>

          </div>
        </div>
      )}

      {zoomedImage && (
          <div className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
              <button 
                type="button"
                onClick={() => setZoomedImage(null)}
                className="absolute top-safe-top right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full text-white flex items-center justify-center backdrop-blur-md transition-colors"
              >
                  <Icons.X />
              </button>
              <img 
                src={zoomedImage} 
                alt="Full View" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" 
              />
          </div>
      )}
    </div>
  );
};

export default NearbyPlaces;
