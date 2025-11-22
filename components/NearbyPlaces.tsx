
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
  const [isEditing, setIsEditing] = useState(false); // Toggle between View and Edit mode
  const [zoomedImage, setZoomedImage] = useState<string | null>(null); // For full screen image
  
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

  // Handle Item Click (View Mode)
  const handleItemClick = (place: NearbyLocation) => {
      setFormData({ ...place, notes: place.notes || '' });
      setIsEditing(false); // Start in view mode
      setIsModalOpen(true);
  };

  // Handle Edit Click (Directly to Edit Mode)
  const handleEditClick = (e: React.MouseEvent, place: NearbyLocation) => {
      e.stopPropagation(); // Stop row click
      e.preventDefault(); // Prevent any default button behavior
      setFormData({ ...place, notes: place.notes || '' });
      setIsEditing(true); // Start directly in edit mode
      setIsModalOpen(true);
  };

  // Handle Image Capture
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
  const handleSave = () => {
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
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
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
                
                {/* Direct Edit Button on Card - Explicit type="button" */}
                <button
                    type="button"
                    onClick={(e) => handleEditClick(e, place)}
                    className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-primary hover:text-white transition-colors active:scale-90 shadow-sm ml-1"
                >
                    <div className="scale-75"><Icons.Edit /></div>
                </button>
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

      {/* Redesigned Details Modal - Compact & Fixed Actions */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          
          {/* Modal Content - Bottom Sheet on Mobile, Card on Desktop */}
          <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh] md:max-h-[85vh] animate-in slide-in-from-bottom-full duration-300">
            
            {/* Header - Compact */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-10 shrink-0">
                <div className="flex flex-col">
                    <h3 className="font-bold text-gray-800 text-base leading-tight truncate max-w-[200px]">
                        {isEditing ? 'تعديل البيانات' : formData.CITYNAME}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-mono">{formData.ODB_ID}</span>
                </div>
                <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Icons.X />
                </button>
            </div>

            {/* Content Body - Scrollable */}
            <div className="p-4 overflow-y-auto flex-1 overscroll-contain">
                {!isEditing ? (
                    // ================= VIEW MODE (Compact) =================
                    <div className="flex flex-col h-full">
                        
                        {/* Top Section: Image & Coords Row */}
                        <div className="flex gap-3 mb-4">
                            {/* Image Thumbnail */}
                            <div 
                                className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shrink-0 relative group"
                                onClick={() => formData.image && setZoomedImage(formData.image)}
                            >
                                {formData.image ? (
                                    <img 
                                        src={formData.image} 
                                        alt="Location" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Icons.MapPin />
                                    </div>
                                )}
                                {formData.image && <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 text-white text-xs"><Icons.Search /></div>}
                            </div>

                            {/* Coords & Metadata */}
                            <div className="flex-1 flex flex-col gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-center">
                                        <span className="block text-[9px] text-gray-400 uppercase">LAT</span>
                                        <span className="font-mono font-bold text-gray-700 text-xs" dir="ltr">{formData.LATITUDE?.toFixed(5)}</span>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-center">
                                        <span className="block text-[9px] text-gray-400 uppercase">LONG</span>
                                        <span className="font-mono font-bold text-gray-700 text-xs" dir="ltr">{formData.LONGITUDE?.toFixed(5)}</span>
                                    </div>
                                </div>
                                
                                {(formData.lastEditedBy) && (
                                    <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5 text-[10px] text-blue-800">
                                        <Icons.User />
                                        <div className="flex flex-col leading-none">
                                            <span className="font-bold">{formData.lastEditedBy}</span>
                                            <span className="opacity-70 scale-90 origin-right">{formatDate(formData.lastEditedAt)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Middle Section: Notes */}
                        <div className="flex-1 min-h-0">
                            <label className="block text-xs font-bold text-gray-500 mb-1">الملاحظات</label>
                            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed border border-gray-100 h-full max-h-[150px] md:max-h-[200px] overflow-y-auto">
                                {formData.notes ? formData.notes : <span className="text-gray-400 italic text-xs">لا توجد ملاحظات مسجلة لهذا الموقع.</span>}
                            </div>
                        </div>

                    </div>
                ) : (
                    // ================= EDIT MODE (No Form Tag) =================
                    // Replaced <form> with <div> to prevent accidental submissions
                    <div className="space-y-4">
                         
                         {/* Coords Inputs */}
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">خط العرض (Lat)</label>
                                <input
                                    type="number" step="any" required
                                    value={formData.LATITUDE}
                                    onChange={(e) => setFormData({ ...formData, LATITUDE: parseFloat(e.target.value) })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-center focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">خط الطول (Long)</label>
                                <input
                                    type="number" step="any" required
                                    value={formData.LONGITUDE}
                                    onChange={(e) => setFormData({ ...formData, LONGITUDE: parseFloat(e.target.value) })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-center focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                         </div>

                        {/* Notes Input */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">تعديل الملاحظات</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm h-32 focus:bg-white focus:ring-2 focus:ring-primary outline-none resize-none transition-all"
                                placeholder="اكتب الملاحظات هنا..."
                            ></textarea>
                        </div>

                        {/* Image Input - Div-based trigger */}
                        <div 
                            onClick={triggerCamera}
                            className="w-full h-24 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl flex flex-row items-center justify-center gap-3 text-blue-500 cursor-pointer active:bg-blue-100 hover:bg-blue-50/80 relative overflow-hidden transition-colors select-none"
                        >
                            {formData.image ? (
                                <>
                                    <img src={formData.image} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                                    <div className="relative z-10 flex items-center gap-2 bg-white/80 px-3 py-1 rounded-full shadow-sm">
                                        <Icons.Camera />
                                        <span className="text-xs font-bold">تغيير الصورة</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Icons.Camera />
                                    <span className="text-xs font-bold">التقاط صورة بالكاميرا</span>
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

            {/* Footer Actions - Always Fixed & Visible */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm shrink-0 pb-safe">
                {!isEditing ? (
                    <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={handleGetDirections}
                            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Icons.Navigation />
                            <span>توجيه (Google Maps)</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="w-14 bg-white border border-gray-200 text-gray-700 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                        >
                            <Icons.Edit />
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                         <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button" 
                            onClick={handleSave}
                            className="flex-[2] bg-gray-900 text-white py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
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

      {/* Full Screen Image Zoom Modal */}
      {zoomedImage && (
          <div className="fixed inset-0 z-[80] bg-black bg-opacity-95 flex flex-col items-center justify-center p-2 animate-in fade-in duration-200">
              <button 
                type="button"
                onClick={() => setZoomedImage(null)}
                className="absolute top-safe-top right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
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
