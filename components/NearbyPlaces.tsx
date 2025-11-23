
import React, { useState, useRef } from 'react';
import { ODBLocation, NearbyLocation, User } from '../types';
import { getNearbyLocationsAPI, saveODBLocation, getSiteSettings } from '../services/mockBackend';
import { Icons } from './Icons';
import { LocationModal } from './LocationModal';

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
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedLocation, setSelectedLocation] = useState<Partial<ODBLocation>>({});

  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
        processNearby(latitude, longitude);
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

  const processNearby = async (lat: number, lng: number) => {
    try {
        const settings = await getSiteSettings();
        const places = await getNearbyLocationsAPI(
            lat, 
            lng, 
            settings.searchRadius, 
            settings.maxResults
        );

        // Filter duplicates based on ODB_ID to prevent multiple occurrences
        const uniquePlaces = places.filter((place, index, self) => 
            index === self.findIndex((t) => t.ODB_ID === place.ODB_ID)
        );

        setNearbyPlaces(uniquePlaces);
        setStatus('success');
    } catch (e: any) {
        console.error(e);
        setStatus('error');
        setErrorMsg(e.message || 'فشل الاتصال بقاعدة البيانات');
    }
  };

  // --- Modal Handlers ---
  const handleItemClick = (place: NearbyLocation) => {
      setSelectedLocation(place);
      setModalMode('view');
      setIsModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, place: NearbyLocation) => {
      e.stopPropagation();
      setSelectedLocation(place);
      setModalMode('edit');
      setIsModalOpen(true);
  };

  const handleSave = async (data: ODBLocation) => {
    try {
        await saveODBLocation(data);
        
        // Update local list
        setNearbyPlaces(prev => prev.map(p => {
            if (p.id === data.id) {
                return { ...p, ...data, distance: p.distance };
            }
            return p;
        }));

        showToast('تم حفظ التعديلات بنجاح');
    } catch (e) {
        alert('فشل الحفظ في قاعدة البيانات');
    }
  };

  const handleSwitchToEdit = () => {
      setModalMode('edit');
  };

  const handleDirectDirections = (e: React.MouseEvent, lat: number, lng: number) => {
      e.stopPropagation();
      const dest = `${lat},${lng}`;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
      window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      
      {/* Success Toast */}
      {toastMsg && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[80] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-green-500 rounded-full p-1"><Icons.Check /></div>
              <span className="font-bold text-sm">{toastMsg}</span>
          </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-3 md:p-4 text-white shadow-lg relative overflow-hidden shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center justify-between w-full md:w-auto">
            <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold leading-tight flex items-center gap-2">
                    <Icons.MapPin /> 
                    الأماكن القريبة
                </h2>
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-purple-100 opacity-90 mt-1">
                    {status === 'success' ? (
                        <span className="bg-white/20 px-1.5 py-0.5 rounded font-bold">
                             {nearbyPlaces.length} موقع
                        </span>
                    ) : (
                        <span>استكشف محيطك</span>
                    )}
                    {userCoords && <span className="opacity-70">| {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</span>}
                </div>
            </div>
            
            <button
                onClick={handleGetLocation}
                disabled={status === 'loading'}
                className="md:hidden bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1 active:bg-white/20"
            >
                {status === 'loading' ? <span className="w-3 h-3 border border-white rounded-full animate-spin"></span> : <Icons.Search />}
                <span>تحديث</span>
            </button>
        </div>
        
        <div className="hidden md:block">
            <button
                onClick={handleGetLocation}
                disabled={status === 'loading'}
                className="bg-white/10 hover:bg-white hover:text-purple-700 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2"
            >
                {status === 'loading' ? <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></span> : <Icons.Search />}
                <span>تحديث الموقع</span>
            </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-center text-xs font-bold flex items-center justify-center gap-2">
          <Icons.Ban />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* LOADING SKELETON */}
      {status === 'loading' && (
        <div className="flex flex-col gap-3">
             {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>)}
        </div>
      )}

      {/* RESULTS LIST */}
      {status === 'success' && nearbyPlaces.length > 0 && (
        <div className="flex-1">
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
                <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                    <tr>
                        <th className="py-3 px-4 font-semibold">المدينة</th>
                        <th className="py-3 px-4 font-semibold">المسافة</th>
                        <th className="py-3 px-4 font-semibold">ODB_ID</th>
                        <th className="py-3 px-4 font-semibold text-center">أدوات</th>
                    </tr>
                </thead>
                <tbody>
                    {nearbyPlaces.map((place) => (
                        <tr key={place.ODB_ID} onClick={() => handleItemClick(place)} className="border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-medium flex items-center gap-2">
                                {place.image ? <img src={place.image} className="w-6 h-6 rounded object-cover" /> : <Icons.MapPin />}
                                {place.CITYNAME}
                            </td>
                            <td className="py-3 px-4 text-sm font-bold text-green-600">{place.distance.toFixed(2)} كم</td>
                            <td className="py-3 px-4 text-blue-600 font-mono text-sm">{place.ODB_ID}</td>
                            <td className="py-3 px-4 text-center flex justify-center gap-2">
                                <button onClick={(e) => handleDirectDirections(e, place.LATITUDE, place.LONGITUDE)} className="p-1.5 text-gray-400 hover:text-blue-600"><Icons.Navigation /></button>
                                <button onClick={(e) => handleEditClick(e, place)} className="p-1.5 text-gray-400 hover:text-purple-600"><Icons.Edit /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                </table>
            </div>

            {/* Mobile Cards (Compact) */}
            <div className="md:hidden space-y-2 pb-4">
                {nearbyPlaces.map((place) => (
                    <div key={place.ODB_ID} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform" onClick={() => handleItemClick(place)}>
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 w-10 h-10 bg-green-50 text-green-700 border border-green-100 rounded-lg flex flex-col items-center justify-center" onClick={(e) => handleDirectDirections(e, place.LATITUDE, place.LONGITUDE)}>
                                <span className="text-[10px] font-bold leading-none">{place.distance.toFixed(1)}</span>
                                <span className="text-[7px] font-bold leading-none mt-0.5">KM</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-sm text-gray-900 truncate">{place.CITYNAME}</h3>
                                    <span className="text-[9px] font-mono bg-gray-100 text-gray-500 px-1.5 rounded">{place.ODB_ID}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                    <span>Lat: {place.LATITUDE.toFixed(3)}</span>
                                    <span>•</span>
                                    <span>{place.notes ? 'يوجد ملاحظات' : 'لا توجد ملاحظات'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 border-r border-gray-100 pr-2 mr-1">
                                <button onClick={(e) => handleDirectDirections(e, place.LATITUDE, place.LONGITUDE)} className="text-blue-500"><Icons.Navigation /></button>
                                <button onClick={(e) => handleEditClick(e, place)} className="text-purple-500"><Icons.Edit /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
      
      {status === 'success' && nearbyPlaces.length === 0 && (
         <div className="text-center py-8 text-gray-400 text-xs">لا توجد مواقع قريبة في النطاق المحدد</div>
      )}

      {/* Unified Location Modal */}
      <LocationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        data={selectedLocation}
        user={user}
        context="nearby"
        onSave={handleSave}
        onEdit={handleSwitchToEdit}
      />
    </div>
  );
};

export default NearbyPlaces;
