import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ODBTable from './components/ODBTable';
import NearbyPlaces from './components/NearbyPlaces';
import Profile from './components/Profile';
import { Icons } from './components/Icons';
import { User, View } from './types';
import { getSession, mockLogout } from './services/mockBackend';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
    }
  }, []);

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    setCurrentView(View.DASHBOARD);
  };

  const handleLogout = () => {
    mockLogout();
    setUser(null);
    setCurrentView(View.LOGIN);
  };

  // If not logged in, show login screen
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case View.SETTINGS_ODB:
        return <ODBTable />;
      case View.NEARBY:
        return <NearbyPlaces />;
      case View.PROFILE:
        return <Profile user={user} />;
      case View.DASHBOARD:
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div onClick={() => setCurrentView(View.SETTINGS_ODB)} className="cursor-pointer bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-95 transform duration-200">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Icons.Settings />
              </div>
              <h3 className="text-xl font-bold text-gray-800">إدارة ODB</h3>
              <p className="text-gray-500 mt-2 text-sm">عرض وتعديل وحذف بيانات المواقع الجغرافية.</p>
            </div>

            <div onClick={() => setCurrentView(View.NEARBY)} className="cursor-pointer bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-95 transform duration-200">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Icons.MapPin />
              </div>
              <h3 className="text-xl font-bold text-gray-800">الأماكن القريبة</h3>
              <p className="text-gray-500 mt-2 text-sm">استعراض أقرب 20 نقطة لموقعك الحالي.</p>
            </div>

            <div onClick={() => setCurrentView(View.PROFILE)} className="cursor-pointer bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-95 transform duration-200">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
                <Icons.User />
              </div>
              <h3 className="text-xl font-bold text-gray-800">الملف الشخصي</h3>
              <p className="text-gray-500 mt-2 text-sm">عرض بيانات حسابك والصلاحيات.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm md:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 right-0 z-50 w-64 bg-secondary text-white transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-wider">ODB<span className="text-accent">Manager</span></h1>
          {/* Close button for mobile */}
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <nav className="mt-6 px-4 space-y-2 overflow-y-auto h-[calc(100vh-180px)]">
          <button
            onClick={() => { setCurrentView(View.DASHBOARD); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === View.DASHBOARD ? 'bg-primary text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Icons.Dashboard />
            <span>لوحة التحكم</span>
          </button>

          <div className="pt-4 pb-2 px-2 text-xs font-semibold text-gray-500 uppercase">البيانات</div>

          <button
            onClick={() => { setCurrentView(View.SETTINGS_ODB); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === View.SETTINGS_ODB ? 'bg-primary text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Icons.Settings />
            <span>إعدادات ODB</span>
          </button>
          
          <button
            onClick={() => { setCurrentView(View.NEARBY); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === View.NEARBY ? 'bg-primary text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Icons.MapPin />
            <span>الأماكن القريبة</span>
          </button>

          <div className="pt-4 pb-2 px-2 text-xs font-semibold text-gray-500 uppercase">الحساب</div>

          <button
            onClick={() => { setCurrentView(View.PROFILE); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === View.PROFILE ? 'bg-primary text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Icons.User />
            <span>الملف الشخصي</span>
          </button>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-700 bg-secondary">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 py-2 transition-colors hover:bg-red-900/20 rounded-lg"
          >
            <Icons.LogOut />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 w-full relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 min-h-[64px] flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 w-full shadow-sm">
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setSidebarOpen(true)} 
                className="md:hidden text-gray-600 p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
                <Icons.Menu />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 truncate max-w-[200px] md:max-w-none">
                {currentView === View.DASHBOARD && 'الرئيسية'}
                {currentView === View.SETTINGS_ODB && 'الإعدادات / ODB'}
                {currentView === View.NEARBY && 'البحث الجغرافي'}
                {currentView === View.PROFILE && 'الملف الشخصي'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-gray-600">
                مرحباً، <span className="font-bold text-gray-900">{user.name}</span>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold shadow-md ring-2 ring-blue-100">
                {user.username.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto">
                {renderContent()}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;