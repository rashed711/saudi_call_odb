
import React, { useState, useEffect } from 'react';
import { User, ODBLocation } from '../types';
import { getMyActivity, saveODBLocation } from '../services/mockBackend';
import { Icons } from './Icons';

interface Props {
    user: User;
}

const MyActivity: React.FC<Props> = ({ user }) => {
    const [locations, setLocations] = useState<ODBLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedLoc, setSelectedLoc] = useState<ODBLocation | null>(null);
    const [formData, setFormData] = useState<Partial<ODBLocation>>({});

    useEffect(() => {
        loadActivity();
    }, [user.id]);

    const loadActivity = async () => {
        setLoading(true);
        try {
            const res = await getMyActivity(user.username); // Assuming backend filters by username
            // Client side filtering fallback for mock environment
            const myWork = res.data.filter(l => 
                l.lastEditedBy === user.name || 
                l.lastEditedBy === user.username || 
                l.lastEditedBy === 'You'
            );
            setLocations(myWork);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (loc: ODBLocation) => {
        setSelectedLoc(loc);
        setFormData({ ...loc });
        setIsEditing(true);
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
                    <p className="text-xs md:text-sm text-gray-500">المواقع التي قمت بإضافتها أو تعديلها</p>
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
                                <tr><td colSpan={3} className="text-center py-12 text-gray-400 text-sm">لم تقم بأي نشاط بعد</td></tr>
                            ) : locations.map(loc => (
                                <tr key={loc.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 md:px-6">
                                        <div className="font-bold text-gray-800 text-sm">{loc.CITYNAME}</div>
                                        <div className="md:hidden text-xs text-blue-600 font-mono">{loc.ODB_ID}</div>
                                        <div className="text-[10px] text-gray-400 mt-1" dir="ltr">{loc.lastEditedAt?.split('T')[0]}</div>
                                    </td>
                                    <td className="px-4 py-3 md:px-6 font-mono text-blue-600 hidden md:table-cell">{loc.ODB_ID}</td>
                                    <td className="px-4 py-3 md:px-6 text-center">
                                        <button onClick={() => handleEdit(loc)} className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                            <Icons.Edit />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isEditing && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4">تعديل بيانات الموقع</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                             <div className="grid grid-cols-2 gap-2">
                                <input type="number" placeholder="Lat" value={formData.LATITUDE} onChange={e => setFormData({...formData, LATITUDE: parseFloat(e.target.value)})} className="p-3 border rounded-lg text-sm" />
                                <input type="number" placeholder="Lng" value={formData.LONGITUDE} onChange={e => setFormData({...formData, LONGITUDE: parseFloat(e.target.value)})} className="p-3 border rounded-lg text-sm" />
                             </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">الملاحظات</label>
                                <textarea 
                                    value={formData.notes || ''} 
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                    className="w-full p-3 border rounded-lg h-24 text-sm"
                                ></textarea>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 py-3 rounded-lg font-bold text-gray-600">إلغاء</button>
                                <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-lg font-bold">حفظ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyActivity;
