
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ODBTable from './components/ODBTable';
import NearbyPlaces from './components/NearbyPlaces';
import Profile from './components/Profile';
import SiteSettingsComponent from './components/SiteSettings';
import UserManagement from './components/UserManagement';
import { Icons } from './components/Icons';
import { User, View } from './types';
import { getSession, mockLogout, getSiteSettings, applySiteSettings } from './services/mockBackend';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  // Sidebar state is now mainly for Desktop toggling or specialized mobile drawers if needed
  // But for this "App-like" refactor, we use Bottom Nav for mobile.
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [siteName, setSiteName] = useState('ODB Manager Pro');

  useEffect(() => {
    // Load Session
    const session = getSession();
    if (session) {
      setUser(session);
    }

    // Apply Site Settings (Theme & Title)
    const settings = getSiteSettings();
    setSiteName(settings.siteName);
    applySiteSettings(settings);
    
    const interval = setInterval(() => {
        const s = getSiteSettings();
        if (s.siteName !== siteName) setSiteName(s.siteName);
    }, 1000);

    return () => clearInterval(interval);
  }, [siteName]);

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    setCurrentView(View.DASHBOARD);
  };

  const handleLogout = () => {
    if (window.confirm('هل تريد تسجيل الخروج؟')) {
        mockLogout();
        setUser(null);
        setCurrentView(View.LOGIN);
    }
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
        return <NearbyPlaces user={user} />;
      case View.PROFILE:
        return <Profile user={user} />;
      case View.SETTINGS_SITE:
          return <SiteSettingsComponent />;
      case View.USERS:
          return <UserManagement />;
      case View.DASHBOARD:
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
            {/* Dashboard Cards */}
            <div onClick={() => setCurrentView(View.SETTINGS_ODB)} className="cursor-pointer bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Icons.Settings />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">إدارة المواقع</h3>
                  <p className="text-gray-500 text-xs">تعديل وحذف البيانات</p>
                </div>
            </div>

            <div onClick={() => setCurrentView(View.NEARBY)} className="cursor-pointer bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Icons.MapPin />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">الأماكن القريبة</h3>
                  <p className="text-gray-500 text-xs">استعراض الخريطة</p>
                </div>
            </div>

            {user.role === 'admin' && (
                <div onClick={() => setCurrentView(View.USERS)} className="cursor-pointer bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shadow-sm">
                    <Icons.Users />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">المستخدمين</h3>
                        <p className="text-gray-500 text-xs">إدارة الصلاحيات</p>
                    </div>
                </div>
            )}
            
            {user.role === 'admin' && (
                <div onClick={() => setCurrentView(View.SETTINGS_SITE)} className="cursor-pointer bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center shadow-sm">
                    <Icons.Palette />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">مظهر التطبيق</h3>
                        <p className="text-gray-500 text-xs">الألوان والإعدادات</p>
                    </div>
                </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* ================= DESKTOP SIDEBAR (Hidden on Mobile) ================= */}
      <aside className={`
        hidden md:flex flex-col fixed inset-y-0 right-0 z-50 w-64 bg-secondary text-white transition-all duration-300 shadow-xl
      `}>
        <div className="p-6 border-b border-gray-700/50">
          <h1 className="text-xl font-bold tracking-wider truncate">{siteName}</h1>
        </div>
        
        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto">
          <SidebarItem 
            active={currentView === View.DASHBOARD} 
            onClick={() => setCurrentView(View.DASHBOARD)} 
            icon={<Icons.Dashboard />} 
            text="الرئيسية" 
          />
          <div className="pt-4 pb-2 px-2 text-xs font-semibold text-gray-500 uppercase">البيانات</div>
          <SidebarItem 
            active={currentView === View.SETTINGS_ODB} 
            onClick={() => setCurrentView(View.SETTINGS_ODB)} 
            icon={<Icons.Settings />} 
            text="قائمة المواقع" 
          />
          <SidebarItem 
            active={currentView === View.NEARBY} 
            onClick={() => setCurrentView(View.NEARBY)} 
            icon={<Icons.MapPin />} 
            text="الأماكن القريبة" 
          />

          <div className="pt-4 pb-2 px-2 text-xs font-semibold text-gray-500 uppercase">النظام</div>
          {user.role === 'admin' && (
            <>
                <SidebarItem active={currentView === View.USERS} onClick={() => setCurrentView(View.USERS)} icon={<Icons.Users />} text="المستخدمين" />
                <SidebarItem active={currentView === View.SETTINGS_SITE} onClick={() => setCurrentView(View.SETTINGS_SITE)} icon={<Icons.Palette />} text="المظهر" />
            </>
          )}
          <SidebarItem active={currentView === View.PROFILE} onClick={() => setCurrentView(View.PROFILE)} icon={<Icons.User />} text="حسابي" />
        </nav>

        <div className="p-4 border-t border-gray-700/50 bg-secondary/50">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 py-2 transition-colors hover:bg-red-900/20 rounded-lg">
            <Icons.LogOut />
            <span>خروج</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-gray-50 w-full md:mr-64 transition-all">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 sticky top-0 z-30 w-full shadow-sm safe-area-top">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                {siteName.charAt(0)}
             </div>
             <h2 className="text-base font-bold text-gray-800 truncate max-w-[150px]">{siteName}</h2>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-600 p-2">
             <Icons.LogOut />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-gray-200 h-16 items-center justify-between px-8 sticky top-0 z-30 w-full shadow-sm">
           <h2 className="text-xl font-bold text-gray-800">
                {currentView === View.DASHBOARD && 'لوحة التحكم'}
                {currentView === View.SETTINGS_ODB && 'إدارة مواقع ODB'}
                {currentView === View.NEARBY && 'البحث الجغرافي'}
                {currentView === View.PROFILE && 'الملف الشخصي'}
                {currentView === View.SETTINGS_SITE && 'إعدادات الموقع'}
                {currentView === View.USERS && 'إدارة المستخدمين'}
            </h2>
            <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">مرحباً، <span className="font-bold text-gray-900">{user.name}</span></div>
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold ring-2 ring-white shadow-sm">
                    {user.username.substring(0, 2).toUpperCase()}
                </div>
            </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-8 w-full scroll-smooth pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto">
                {renderContent()}
            </div>
        </div>
      </main>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
            <MobileNavItem 
                active={currentView === View.DASHBOARD} 
                onClick={() => setCurrentView(View.DASHBOARD)} 
                icon={<Icons.Dashboard />} 
                label="الرئيسية" 
            />
            <MobileNavItem 
                active={currentView === View.SETTINGS_ODB} 
                onClick={() => setCurrentView(View.SETTINGS_ODB)} 
                icon={<Icons.Settings />} 
                label="القائمة" 
            />
            <div className="-mt-8">
                <button 
                    onClick={() => setCurrentView(View.NEARBY)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-4 border-gray-50 ${currentView === View.NEARBY ? 'bg-primary text-white' : 'bg-secondary text-white'}`}
                >
                    <Icons.MapPin />
                </button>
            </div>
            <MobileNavItem 
                active={currentView === View.PROFILE} 
                onClick={() => setCurrentView(View.PROFILE)} 
                icon={<Icons.User />} 
                label="حسابي" 
            />
             {/* If admin, show users, else show placeholder or nothing. Let's toggle admin view or use dashboard for more */}
             {user.role === 'admin' ? (
                 <MobileNavItem 
                 active={currentView === View.USERS} 
                 onClick={() => setCurrentView(View.USERS)} 
                 icon={<Icons.Users />} 
                 label="الأعضاء" 
             />
             ) : (
                 <div className="w-full"></div> // Spacer
             )}
        </div>
      </nav>

    </div>
  );
};

// Helper Components
const SidebarItem = ({ active, onClick, icon, text }: any) => (
    <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${active ? 'bg-primary text-white shadow-lg translate-x-1' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
    >
    <span className={`${active ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{icon}</span>
    <span className="font-medium">{text}</span>
    </button>
);

const MobileNavItem = ({ active, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-colors ${active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
    >
        <span className={`${active ? 'animate-bounce-short' : ''} [&>svg]:w-6 [&>svg]:h-6`}>{icon}</span>
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

export default App;
