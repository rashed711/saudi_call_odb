
import React, { useState } from 'react';
import { User, ODBLocation } from '../types';
import { searchODBLocation, saveODBLocation } from '../services/mockBackend';
import { Icons } from './Icons';
import { LocationModal } from './LocationModal';
import { PermissionGuard } from './PermissionGuard';

interface Props {
    user: User;
}

const SearchODB: React.FC<Props> = ({ user }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ODBLocation[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
    const [selectedLocation, setSelectedLocation] = useState<Partial<ODBLocation>>({});

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);
        setResults([]);
        
        try {
            const data = await searchODBLocation(query);
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = (loc: ODBLocation) => {
        setSelectedLocation(loc);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleSave = async (data: ODBLocation) => {
        try {
            await saveODBLocation(data);
            // Refresh logic if needed, or update local list
            setResults(prev => prev.map(r => r.id === data.id ? {...r, ...data} : r));
        } catch (e) {
            alert('خطأ في الحفظ');
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Search Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-4 shrink-0">
                <div className="p-3 bg-blue-50 text-primary rounded-full mb-1">
                    <Icons.Search />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">استعلام عن ODB</h2>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                       ابحث عن أي موقع باستخدام كود ODB مباشرة
                    </p>
                </div>

                <form onSubmit={handleSearch} className="w-full max-w-lg relative flex items-center shadow-lg rounded-xl overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="أدخل كود ODB أو اسم المدينة..."
                        className="flex-1 p-4 bg-white border-none outline-none text-lg font-medium placeholder-gray-400"
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !query.trim()}
                        className="bg-primary text-white px-6 py-4 font-bold hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span> : <Icons.Search />}
                        <span className="hidden sm:inline">بحث</span>
                    </button>
                </form>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto">
                {hasSearched && (
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-12 text-gray-400">جاري البحث...</div>
                        ) : results.length > 0 ? (
                            <>
                                <h3 className="font-bold text-gray-700 text-sm px-1">نتائج البحث ({results.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {results.map(loc => (
                                        <div 
                                            key={loc.id} 
                                            onClick={() => handleResultClick(loc)}
                                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-primary hover:shadow-md cursor-pointer transition-all active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-primary flex items-center justify-center">
                                                        <Icons.MapPin />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{loc.CITYNAME}</div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5 bg-gray-100 inline-block px-1.5 rounded">{loc.ODB_ID}</div>
                                                    </div>
                                                </div>
                                                <div className="text-gray-300">
                                                    <Icons.Navigation />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
                                <Icons.Ban />
                                <span className="mt-2 text-sm font-bold">لا توجد نتائج مطابقة لـ "{query}"</span>
                            </div>
                        )}
                    </div>
                )}
                
                {!hasSearched && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-50 pb-20">
                        <div className="scale-150 mb-4"><Icons.Database /></div>
                        <p className="text-sm font-medium">ابدأ البحث لعرض النتائج</p>
                    </div>
                )}
            </div>

            <LocationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                data={selectedLocation}
                user={user}
                context="search_odb"
                onSave={handleSave}
                onEdit={() => setModalMode('edit')}
            />
        </div>
    );
};

export default SearchODB;
