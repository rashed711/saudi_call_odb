import React, { useState } from 'react';
import { ODBLocation, NearbyLocation } from '../types';
import { getODBLocations, calculateDistance } from '../services/mockBackend';
import { Icons } from './Icons';

const NearbyPlaces: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyLocation[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

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
    
    const placesWithDistance = allLocations.map((loc) => {
      const dist = calculateDistance(lat, lng, loc.LATITUDE, loc.LONGITUDE);
      return { ...loc, distance: dist };
    });

    placesWithDistance.sort((a, b) => a.distance - b.distance);
    setNearbyPlaces(placesWithDistance.slice(0, 20));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="w-full md:w-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">الأماكن القريبة</h2>
            <p className="text-blue-100 opacity-90 text-sm md:text-base leading-relaxed">
              ابحث عن أقرب 20 موقع مسجل في قاعدة البيانات بالنسبة لموقعك الحالي.
            </p>
          </div>
          <button
            onClick={handleGetLocation}
            disabled={status === 'loading'}
            className="w-full md:w-auto bg-white text-blue-700 hover:bg-gray-50 px-6 py-3 rounded-lg md:rounded-full font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {status === 'loading' ? (
              <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Icons.MapPin />
            )}
            <span>تحديث موقعي</span>
          </button>
        </div>

        {userCoords && (
            <div className="mt-6 pt-4 border-t border-white/20 text-xs md:text-sm font-mono text-blue-100 flex flex-wrap gap-2">
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
            <span className="w-2 h-6 bg-accent rounded-full"></span>
            أقرب النتائج
          </h3>
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {nearbyPlaces.map((place, idx) => (
              <div key={place.ODB_ID} className="flex items-center p-3 md:p-4 bg-gray-50 rounded-xl hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-all group cursor-default">
                <div className="bg-white w-10 h-10 md:w-12 md:h-12 rounded-full shadow-sm text-blue-600 font-bold flex items-center justify-center text-base md:text-lg shrink-0">
                    {idx + 1}
                </div>
                <div className="mr-3 md:mr-4 flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 group-hover:text-blue-700 truncate">{place.CITYNAME}</h4>
                  <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <span className="font-medium text-gray-700 bg-gray-200 px-1.5 rounded text-xs">{place.distance.toFixed(2)}</span>
                    <span>كم من موقعك</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
       {status === 'success' && nearbyPlaces.length === 0 && (
         <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-dashed">لا توجد أماكن مسجلة قريبة.</div>
       )}
    </div>
  );
};

export default NearbyPlaces;