import React, { useState, useEffect } from 'react';
import { ODBLocation } from '../types';
import { getODBLocations, saveODBLocation, deleteODBLocation } from '../services/mockBackend';
import { Icons } from './Icons';
import { generateRandomLocations } from '../services/geminiService';

const ODBTable: React.FC = () => {
  const [locations, setLocations] = useState<ODBLocation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [formData, setFormData] = useState<Partial<ODBLocation>>({
    CITYNAME: '',
    LATITUDE: 0,
    LONGITUDE: 0,
  });

  useEffect(() => {
    setLocations(getODBLocations());
  }, []);

  const handleDelete = (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموقع؟')) {
      const updated = deleteODBLocation(id);
      setLocations(updated);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.CITYNAME) return;

    const newLoc: ODBLocation = {
      ODB_ID: formData.ODB_ID || 0, // 0 will trigger ID generation in mockBackend
      CITYNAME: formData.CITYNAME,
      LATITUDE: Number(formData.LATITUDE),
      LONGITUDE: Number(formData.LONGITUDE),
    };

    const updatedList = saveODBLocation(newLoc);
    setLocations(updatedList);
    setIsModalOpen(false);
    setFormData({ CITYNAME: '', LATITUDE: 0, LONGITUDE: 0 });
  };

  const handleAIGenerate = async () => {
    setIsLoadingAI(true);
    try {
      const newCities = await generateRandomLocations();
      let currentList = getODBLocations();
      for(const city of newCities) {
        // Assign a quick temp ID or let saveODBLocation handle it iteratively
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
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">إدارة مواقع ODB</h2>
          <p className="text-sm text-gray-500 mt-1">قاعدة بيانات المدن والإحداثيات</p>
        </div>
        <div className="flex gap-2">
             <button
                onClick={handleAIGenerate}
                disabled={isLoadingAI}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
                {isLoadingAI ? "جاري التوليد..." : "إضافة بيانات ذكية (Gemini)"}
            </button>
            <button
                onClick={() => {
                    setFormData({ CITYNAME: '', LATITUDE: 0, LONGITUDE: 0 });
                    setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-primary hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
                <Icons.Plus />
                <span>إضافة موقع</span>
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
              <th className="py-3 px-4 font-semibold">#ID</th>
              <th className="py-3 px-4 font-semibold">اسم المدينة</th>
              <th className="py-3 px-4 font-semibold">خط العرض (Lat)</th>
              <th className="py-3 px-4 font-semibold">خط الطول (Long)</th>
              <th className="py-3 px-4 font-semibold text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">لا توجد بيانات حالياً</td>
                </tr>
            ) : (
                locations.map((loc) => (
                <tr key={loc.ODB_ID} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-blue-600">{loc.ODB_ID}</td>
                    <td className="py-3 px-4 font-medium text-gray-800">{loc.CITYNAME}</td>
                    <td className="py-3 px-4 text-gray-600" dir="ltr">{loc.LATITUDE}</td>
                    <td className="py-3 px-4 text-gray-600" dir="ltr">{loc.LONGITUDE}</td>
                    <td className="py-3 px-4 text-center">
                    <button
                        onClick={() => handleDelete(loc.ODB_ID)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="حذف"
                    >
                        <Icons.Trash />
                    </button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">إضافة موقع جديد</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدينة</label>
                <input
                  type="text"
                  required
                  value={formData.CITYNAME}
                  onChange={(e) => setFormData({ ...formData, CITYNAME: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="مثال: القاهرة"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">خط العرض</label>
                    <input
                    type="number"
                    step="any"
                    required
                    value={formData.LATITUDE}
                    onChange={(e) => setFormData({ ...formData, LATITUDE: parseFloat(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">خط الطول</label>
                    <input
                    type="number"
                    step="any"
                    required
                    value={formData.LONGITUDE}
                    onChange={(e) => setFormData({ ...formData, LONGITUDE: parseFloat(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-blue-800 text-white py-2 rounded-lg transition-colors"
                >
                  حفظ
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
