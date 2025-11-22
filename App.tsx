
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
  const [siteName, setSiteName] = useState('ODB Manager Pro');

  useEffect(() => {
    const session = getSession();
    if (session) setUser(session);

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

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case View.SETTINGS_ODB: return <ODBTable />;
      case View.NEARBY: return <NearbyPlaces user={user} />;
      case View.PROFILE: return <Profile user={user} />;
      case View.SETTINGS_SITE: return <SiteSettingsComponent />;
      case View.USERS: return <UserManagement />;
      case View.DASHBOARD:
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4">
            <DashboardCard 
                onClick={() => setCurrentView(View.SETTINGS_ODB)} 
                icon={<Icons.Settings />} 
                color="blue"
                title="إدارة المواقع" 
                desc="تعديل وحذف البيانات" 
            />
            <DashboardCard 
                onClick={() => setCurrentView(View.NEARBY)} 
                icon={<Icons.MapPin />} 
                color="purple"
                title="الأماكن القريبة" 
                desc="استعراض الخريطة" 
            />
            {user.role === 'admin' && (
                <>
                    <DashboardCard 
                        onClick={() => setCurrentView(View.USERS)} 
                        icon={<Icons.Users />} 
                        color="green"
                        title="المستخدمين" 
                        desc="إدارة الصلاحيات" 
                    />
                    <DashboardCard 
                        onClick={() => setCurrentView(View.SETTINGS_SITE)} 
                        icon={<Icons.Palette />} 
                        color="gray"
                        title="مظهر التطبيق" 
                        desc="الألوان والإعدادات" 
                    />
                </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex h-[100dvh] bg-gray-50 font-sans overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-secondary text-white shadow-xl shrink-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-gray-700/50 bg-secondary">
          <h1 className="text-lg font-bold tracking-wider truncate">{siteName}</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <SidebarItem active={currentView === View.DASHBOARD} onClick={() => setCurrentView(View.DASHBOARD)} icon={<Icons.Dashboard />} text="الرئيسية" />
          <div className="pt-4 pb-2 px-2 text-xs font-semibold text-gray-500 uppercase">البيانات</div>
          <SidebarItem active={currentView === View.SETTINGS_ODB} onClick={() => setCurrentView(View.SETTINGS_ODB)} icon={<Icons.Settings />} text="قائمة المواقع" />
          <SidebarItem active={currentView === View.NEARBY} onClick={() => setCurrentView(View.NEARBY)} icon={<Icons.MapPin />} text="الأماكن القريبة" />
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

      {/* Main Layout */}
      <main className="flex-1 flex flex-col relative min-w-0">
        
        {/* Headers */}
        <header className="shrink-0 h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-20 safe-area-top">
            <div className="flex items-center gap-3 md:hidden">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-sm">{siteName.charAt(0)}</div>
                <h2 className="text-base font-bold text-gray-800 truncate max-w-[160px]">{siteName}</h2>
            </div>
            <div className="hidden md:block text-xl font-bold text-gray-800">
                {currentView === View.DASHBOARD && 'لوحة التحكم'}
                {currentView === View.SETTINGS_ODB && 'إدارة مواقع ODB'}
                {currentView === View.NEARBY && 'البحث الجغرافي'}
                {currentView === View.PROFILE && 'الملف الشخصي'}
                {currentView === View.SETTINGS_SITE && 'إعدادات الموقع'}
                {currentView === View.USERS && 'إدارة المستخدمين'}
            </div>
            <div className="flex items-center gap-3">
                 <div className="hidden md:block text-sm text-gray-600">مرحباً، <span className="font-bold text-gray-900">{user.name}</span></div>
                 <button onClick={handleLogout} className="md:hidden text-gray-400 hover:text-red-600 p-2"><Icons.LogOut /></button>
                 <div className="hidden md:flex w-9 h-9 bg-blue-100 text-blue-600 rounded-full items-center justify-center font-bold ring-2 ring-white shadow-sm">
                    {user.username.substring(0, 2).toUpperCase()}
                 </div>
            </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-3 md:p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto min-h-full pb-20 md:pb-0">
                {renderContent()}
            </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden shrink-0 h-[calc(4rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-200 flex justify-around items-start pt-1 px-2 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
            <MobileNavItem active={currentView === View.DASHBOARD} onClick={() => setCurrentView(View.DASHBOARD)} icon={<Icons.Dashboard />} label="الرئيسية" />
            <MobileNavItem active={currentView === View.SETTINGS_ODB} onClick={() => setCurrentView(View.SETTINGS_ODB)} icon={<Icons.Settings />} label="القائمة" />
            <div className="-mt-6">
                <button 
                    onClick={() => setCurrentView(View.NEARBY)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 border-4 border-gray-50 ${currentView === View.NEARBY ? 'bg-primary text-white scale-110' : 'bg-secondary text-white'}`}
                >
                    <Icons.MapPin />
                </button>
            </div>
            <MobileNavItem active={currentView === View.PROFILE} onClick={() => setCurrentView(View.PROFILE)} icon={<Icons.User />} label="حسابي" />
            {user.role === 'admin' ? (
                 <MobileNavItem active={currentView === View.USERS} onClick={() => setCurrentView(View.USERS)} icon={<Icons.Users />} label="الأعضاء" />
             ) : (
                 <div className="flex-1"></div>
             )}
        </nav>
      </main>

    </div>
  );
};

// Helper Components
const DashboardCard = ({ onClick, icon, title, desc, color }: any) => {
    const colors: any = {
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        green: 'bg-green-100 text-green-600',
        gray: 'bg-gray-100 text-gray-600'
    };
    return (
        <div onClick={onClick} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all flex items-center gap-4 group hover:border-blue-100">
            <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-gray-500 text-xs">{desc}</p>
            </div>
        </div>
    );
}

const SidebarItem = ({ active, onClick, icon, text }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${active ? 'bg-primary text-white shadow-lg translate-x-1' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
        <span className={`${active ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{icon}</span>
        <span className="font-medium">{text}</span>
    </button>
);

const MobileNavItem = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center h-14 space-y-1 transition-colors ${active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <span className={`${active ? 'animate-bounce-short' : ''} [&>svg]:w-6 [&>svg]:h-6`}>{icon}</span>
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

export default App;
