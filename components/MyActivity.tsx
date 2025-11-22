
import React, { useState, useEffect } from 'react';
import { User, ODBLocation } from '../types';
import { getMyActivity, saveODBLocation } from '../services/mockBackend';
import { Icons } from './Icons';
import { PermissionGuard } from './PermissionGuard';

interface Props {
    user: User;
}

const MyActivity: React.FC<Props> = ({ user }) => {
    const [locations, setLocations] = useState<ODBLocation[]>([]);
    const [loading, setLoading] = useState(true);
    
    // States for Modals
    const [isEditing, setIsEditing] = useState(false);
    const [isViewing, setIsViewing] = useState(false);
    
    const [selectedLoc, setSelectedLoc] = useState<ODBLocation | null>(null);
    const [formData, setFormData] = useState<Partial<ODBLocation>>({});

    useEffect(() => {
        loadActivity();
    }, [user.id]);

    const loadActivity = async () => {
        setLoading(true);
        try {
            const searchTerm = user.name || user.username;
            const res = await getMyActivity(searchTerm);
            setLocations(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (loc: ODBLocation) => {
        setSelectedLoc(loc);
        setIsViewing(true);
    };

    const handleEdit = (e: React.MouseEvent, loc: ODBLocation) => {
        e.stopPropagation(); // Prevent opening view modal
        setSelectedLoc(loc);
        setFormData({ ...loc });
        setIsEditing(true);
        setIsViewing(false); // Close view modal if open
    };

    const handleSwitchToEdit = () => {
        if (selectedLoc) {
            setFormData({ ...selectedLoc });
            setIsEditing(true);
            setIsViewing(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.CITYNAME) return;
        
        const updated: ODBLocation = {
            ...selectedLoc!,
            ...formData as ODBLocation,
            lastEditedBy: user.name,
            lastEditedAt: new Date().toISOString()
        };

        await saveODBLocation(updated);
        setIsEditing(false);
        loadActivity();
    };

    return (
        <div className="space-y-4 md:space-y-6 h-full flex flex-col">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Icons.Check />
                        <span>نشاطي الميداني</span>
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500">المواقع التي قمت بإضافتها أو تعديلها ({user.name})</p>
                </div>
                <div className="text-xl font-bold text-primary bg-blue-50 px-3 py-1 rounded-lg">
                    {locations.length}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 md:px-6">المدينة</th>
                                <th className="px-4 py-3 md:px-6 hidden md:table-cell">كود ODB</th>
                                <th className="px-4 py-3 md:px-6 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={3} className="text-center py-8">...</td></tr>
                            ) : locations.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-12 text-gray-400 text-sm">لم يتم العثور على نشاط مسجل باسم "{user.name}"</td></tr>
                            ) : locations.map(loc => (
                                <tr key={loc.id} onClick={() => handleView(loc)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                    <td className="px-4 py-3 md:px-6">
                                        <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                            {loc.image ? <Icons.MapPin /> : <span className="w-4 h-4 rounded-full bg-gray-200"></span>}
                                            {loc.CITYNAME}
                                        </div>
                                        <div className="md:hidden text-xs text-blue-600 font-mono mt-1">{loc.ODB_ID}</div>
                                        <div className="text-[10px] text-gray-400 mt-1" dir="ltr">
                                            {loc.lastEditedAt ? loc.lastEditedAt.split('T')[0] : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 md:px-6 font-mono text-blue-600 hidden md:table-cell">{loc.ODB_ID}</td>
                                    <td className="px-4 py-3 md:px-6 text-center">
                                        <PermissionGuard 
                                            user={user} 
                                            resource="my_activity" 
                                            action="edit"
                                            fallback={<button onClick={(e) => { e.stopPropagation(); handleView(loc); }} className="text-gray-400 hover:text-blue-600 p-2"><Icons.Eye /></button>}
                                        >
                                            <button onClick={(e) => handleEdit(e, loc)} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors">
                                                <Icons.Edit />
                                            </button>
                                        </PermissionGuard>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VIEW DETAILS MODAL */}
            {isViewing && selectedLoc && (
                <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsViewing(false)}></div>
                    <div className="relative bg-white w-full md:w-[500px] rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
                        
                        {/* Modal Header */}
                        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent text-white">
                            <h3 className="font-bold text-lg shadow-black drop-shadow-md">{selectedLoc.CITYNAME}</h3>
                            <button onClick={() => setIsViewing(false)} className="bg-black/20 hover:bg-black/40 rounded-full p-1 backdrop-blur-md"><Icons.X /></button>
                        </div>

                        {/* Image or Placeholder */}
                        <div className="h-56 bg-gray-100 relative">
                            {selectedLoc.image ? (
                                <img src={selectedLoc.image} className="w-full h-full object-cover" alt={selectedLoc.CITYNAME} />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                    <div className="scale-150"><Icons.MapPin /></div>
                                    <span className="mt-2 text-sm">لا توجد صورة</span>
                                </div>
                            )}
                             <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-mono font-bold text-blue-600 shadow-sm">
                                {selectedLoc.ODB_ID}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Coordinates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Latitude</span>
                                    <span className="font-mono font-bold text-gray-800">{selectedLoc.LATITUDE.toFixed(6)}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Longitude</span>
                                    <span className="font-mono font-bold text-gray-800">{selectedLoc.LONGITUDE.toFixed(6)}</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Icons.Edit /> ملاحظات
                                </h4>
                                <div className="bg-yellow-50 p-4 rounded-xl text-sm text-gray-700 border border-yellow-100 min-h-[80px]">
                                    {selectedLoc.notes ? selectedLoc.notes : <span className="text-gray-400 italic">لا توجد ملاحظات مسجلة</span>}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="text-center border-t pt-4">
                                <p className="text-xs text-gray-400">
                                    تم التعديل بواسطة <span className="font-bold text-gray-600">{selectedLoc.lastEditedBy}</span>
                                </p>
                                <p className="text-[10px] text-gray-300 mt-1 font-mono">
                                    {selectedLoc.lastEditedAt ? new Date(selectedLoc.lastEditedAt).toLocaleString('ar-EG') : '-'}
                                </p>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="p-4 bg-gray-50 border-t flex gap-3">
                            <button onClick={() => setIsViewing(false)} className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold shadow-sm hover:bg-gray-50">
                                إغلاق
                            </button>
                            <PermissionGuard user={user} resource="my_activity" action="edit">
                                <button onClick={handleSwitchToEdit} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700">
                                    تعديل البيانات
                                </button>
                            </PermissionGuard>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditing && (
                <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 animate-in zoom-in-95 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Icons.Edit /> تعديل البيانات
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4">
                             <div className="bg-blue-50 p-3 rounded-lg mb-2 text-sm flex justify-between border border-blue-100 text-blue-800">
                                <span className="font-bold">{formData.CITYNAME}</span>
                                <span className="font-mono">{formData.ODB_ID}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500">خط العرض (Lat)</label>
                                    <input type="number" required step="any" placeholder="Lat" value={formData.LATITUDE} onChange={e => setFormData({...formData, LATITUDE: parseFloat(e.target.value)})} className="w-full p-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500">خط الطول (Lng)</label>
                                    <input type="number" required step="any" placeholder="Lng" value={formData.LONGITUDE} onChange={e => setFormData({...formData, LONGITUDE: parseFloat(e.target.value)})} className="w-full p-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" />
                                </div>
                             </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">الملاحظات</label>
                                <textarea 
                                    value={formData.notes || ''} 
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                    className="w-full p-3 border rounded-xl h-24 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                    placeholder="اكتب ملاحظاتك هنا..."
                                ></textarea>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold text-gray-600 transition-colors">إلغاء</button>
                                <button type="submit" className="flex-1 bg-primary hover:bg-blue-800 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all">حفظ التعديلات</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyActivity;
