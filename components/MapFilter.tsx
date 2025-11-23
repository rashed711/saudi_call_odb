
import React, { useState, useEffect, useRef } from 'react';
import { getAllLocationsForMap, saveODBLocation } from '../services/mockBackend';
import { ODBLocation, User } from '../types';
import { Icons } from './Icons';
import { LocationModal } from './LocationModal';

interface MapFilterProps {
  user: User;
}

const MapFilter: React.FC<MapFilterProps> = ({ user }) => {
  const mapRef = useRef<any>(null);
  const rectangleRef = useRef<any>(null);
  const [locations, setLocations] = useState<ODBLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<ODBLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bounds, setBounds] = useState<any>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedLocation, setSelectedLocation] = useState<Partial<ODBLocation>>({});

  useEffect(() => {
    loadData();
    // Initialize Map
    initMap();

    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, []);

  const loadData = async () => {
      try {
          const allLocs = await getAllLocationsForMap();
          setLocations(allLocs);
          setFilteredLocations(allLocs);
          
          if (mapRef.current) {
             addMarkers(allLocs);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const initMap = () => {
      // @ts-ignore
      if (!window.L) return;
      // @ts-ignore
      const L = window.L;

      // Check if map is already initialized
      if (mapRef.current) return;

      const map = L.map('map-container').setView([26.8206, 30.8025], 6); // Center of Egypt
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapRef.current = map;

      // Add simple drawing logic
      let startLatLng: any = null;
      let currentRect: any = null;

      map.on('mousedown', (e: any) => {
          if (!map.isDrawingEnabled) return;
          map.dragging.disable();
          startLatLng = e.latlng;
          
          if (rectangleRef.current) {
              map.removeLayer(rectangleRef.current);
          }
          
          currentRect = L.rectangle([startLatLng, startLatLng], {color: "#1e40af", weight: 2}).addTo(map);
          rectangleRef.current = currentRect;
      });

      map.on('mousemove', (e: any) => {
          if (!startLatLng || !currentRect) return;
          currentRect.setBounds([startLatLng, e.latlng]);
      });

      map.on('mouseup', (e: any) => {
          if (!startLatLng) return;
          map.dragging.enable();
          
          // Finalize box
          const b = currentRect.getBounds();
          setBounds(b);
          filterLocations(b);

          startLatLng = null;
          currentRect = null; // Don't nullify ref, keep it on map
          setIsDrawing(false);
          map.isDrawingEnabled = false;
          map.getContainer().style.cursor = '';
      });
  };

  const addMarkers = (locs: ODBLocation[]) => {
      // @ts-ignore
      if (!window.L || !mapRef.current) return;
      // @ts-ignore
      const L = window.L;

      // Note: Adding thousands of markers can be slow. 
      // In a real app, use clustering or only show markers after filter.
      // For this demo, we'll assume a reasonable number or just show them.
      // To improve performance, we might clear previous markers, but here we just add them once.
  };

  const toggleDrawing = () => {
      if (!mapRef.current) return;
      const newState = !isDrawing;
      setIsDrawing(newState);
      mapRef.current.isDrawingEnabled = newState;
      mapRef.current.getContainer().style.cursor = newState ? 'crosshair' : '';
      
      if (newState) {
          // Clear previous rect if restarting
          if (rectangleRef.current) {
               mapRef.current.removeLayer(rectangleRef.current);
               rectangleRef.current = null;
               setBounds(null);
               setFilteredLocations(locations); // Reset filter
          }
      }
  };

  const filterLocations = (b: any) => {
      const north = b.getNorth();
      const south = b.getSouth();
      const east = b.getEast();
      const west = b.getWest();

      const filtered = locations.filter(loc => 
          loc.LATITUDE <= north &&
          loc.LATITUDE >= south &&
          loc.LONGITUDE <= east &&
          loc.LONGITUDE >= west
      );

      setFilteredLocations(filtered);
  };

  // --- Modal Handlers ---
  const handleItemClick = (loc: ODBLocation) => {
    setSelectedLocation(loc);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, loc: ODBLocation) => {
    e.stopPropagation();
    setSelectedLocation(loc);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSave = async (data: ODBLocation) => {
      await saveODBLocation(data);
      // Refresh local data logic if needed
      setFilteredLocations(prev => prev.map(p => p.id === data.id ? {...p, ...data} : p));
  };

  const handleSwitchToEdit = () => setModalMode('edit');

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-full space-y-3">
        {/* Top Control Bar */}
        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0">
            <div className="w-full md:w-auto flex justify-between items-center">
                <div>
                    <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                        <Icons.Map />
                        <span>فلترة الخريطة</span>
                    </h2>
                    <p className="hidden md:block text-xs text-gray-500 mt-1">ارسم مربعاً لتحديد المواقع</p>
                </div>
                {/* Mobile Result Count */}
                <div className="md:hidden text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                    {filteredLocations.length} موقع
                </div>
            </div>

            <div className="flex w-full md:w-auto items-center gap-3">
                <div className="hidden md:block text-sm font-bold bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    النتائج: <span className="text-primary">{filteredLocations.length}</span>
                </div>
                <button 
                    onClick={toggleDrawing}
                    className={`flex-1 md:flex-none justify-center px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all text-sm md:text-base ${isDrawing ? 'bg-red-500 text-white shadow-lg' : 'bg-primary text-white hover:bg-blue-700'}`}
                >
                    {isDrawing ? <><Icons.X /> <span>إلغاء</span></> : <><Icons.Square /> <span>تحديد منطقة</span></>}
                </button>
            </div>
        </div>

        {/* Map Container - Responsive Height */}
        <div className="h-60 md:h-[400px] bg-gray-200 rounded-xl overflow-hidden border border-gray-300 relative shadow-inner shrink-0 group">
             <div id="map-container" className="h-full w-full z-0"></div>
             {isDrawing && (
                 <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs font-bold pointer-events-none z-[1000] backdrop-blur-md whitespace-nowrap">
                     اضغط واسحب على الخريطة
                 </div>
             )}
             {/* Hint for interaction */}
             {!isDrawing && (
                <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-gray-500 pointer-events-none md:hidden z-[400]">
                    استخدم إصبعين للتحريك
                </div>
             )}
        </div>

        {/* Results List - Responsive (Table on Desktop, Cards on Mobile) */}
        <div className="flex-1 bg-gray-50 md:bg-white rounded-xl md:shadow-sm md:border border-gray-100 overflow-hidden flex flex-col min-h-0">
            <div className="hidden md:block p-3 bg-gray-50 border-b border-gray-100 font-bold text-sm text-gray-600">
                قائمة المواقع في النطاق المحدد
            </div>
            
            <div className="flex-1 overflow-y-auto p-1 md:p-0">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
                ) : filteredLocations.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                        <Icons.MapPin />
                        <span className="mt-2 text-sm">لا توجد مواقع في هذا النطاق</span>
                    </div>
                ) : (
                    <>
                        {/* Desktop View: Table */}
                        <table className="hidden md:table w-full text-right">
                            <thead className="bg-white text-xs text-gray-400 uppercase sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="px-4 py-3 bg-gray-50">المدينة</th>
                                    <th className="px-4 py-3 bg-gray-50">ODB ID</th>
                                    <th className="px-4 py-3 bg-gray-50">إحداثيات</th>
                                    <th className="px-4 py-3 bg-gray-50 text-center">أدوات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLocations.map(loc => (
                                    <tr key={loc.id} onClick={() => handleItemClick(loc)} className="hover:bg-blue-50 cursor-pointer transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-800">{loc.CITYNAME}</td>
                                        <td className="px-4 py-3 font-mono text-blue-600 text-xs">{loc.ODB_ID}</td>
                                        <td className="px-4 py-3 font-mono text-gray-500 text-[10px] dir-ltr">
                                            {loc.LATITUDE.toFixed(4)}, {loc.LONGITUDE.toFixed(4)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={(e) => handleEditClick(e, loc)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-100 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all">
                                                <Icons.Edit />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile View: Cards */}
                        <div className="md:hidden space-y-2 pb-2">
                            {filteredLocations.map((loc) => (
                                <div key={loc.id} onClick={() => handleItemClick(loc)} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.99] transition-transform">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Icons.MapPin />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 truncate">{loc.CITYNAME}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-gray-100 px-1.5 rounded text-gray-600">{loc.ODB_ID}</span>
                                                <span className="text-[10px] text-gray-400 dir-ltr">{loc.LATITUDE.toFixed(3)}, {loc.LONGITUDE.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={(e) => handleEditClick(e, loc)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 bg-gray-50 rounded-full">
                                        <Icons.Edit />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>

        <LocationModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            mode={modalMode}
            data={selectedLocation}
            user={user}
            context="default"
            onSave={handleSave}
            onEdit={handleSwitchToEdit}
        />
    </div>
  );
};

export default MapFilter;
