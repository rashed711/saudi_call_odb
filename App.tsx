
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ODBTable from './components/ODBTable';
import NearbyPlaces from './components/NearbyPlaces';
import Profile from './components/Profile';
import SiteSettingsComponent from './components/SiteSettings';
import UserManagement from './components/UserManagement';
import MyActivity from './components/MyActivity';
import MapFilter from './components/MapFilter';
import { Icons } from './components/Icons';
import { User, View } from './types';
import { getSession, mockLogout, getSiteSettings, applySiteSettings, hasPermission, checkSessionStatus } from './services/mockBackend';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [siteName, setSiteName] = useState('ODB Manager Pro');

  // 1. Load Settings & Session on Mount
  useEffect(() => {
    const session = getSession();
    if (session) setUser(session);

    const loadSettings = async () => {
        try {
            const settings = await getSiteSettings();
            setSiteName(settings.siteName);
            applySiteSettings(settings);
        } catch (e) {}
    };
    loadSettings();
    const interval = setInterval(loadSettings, 10000); // Reload settings every 10s
    return () => clearInterval(interval);
  }, []);

  // 2. Security Heartbeat: Check if user is still active every 5 seconds
  useEffect(() => {
    if (!user) return;

    const checkStatus = async () => {
        try {
            await checkSessionStatus(user.id);
        } catch (e: any) {
            // If request fails with "Forbidden" or explicit account suspension message
            if (e.message.includes('إيقاف الحساب') || e.message.includes('Forbidden') || e.message.includes('403')) {
                alert('تم إيقاف حسابك من قبل الإدارة. سيتم تسجيل الخروج.');
                handleLogoutForce();
            }
        }
    };

    const statusInterval = setInterval(checkStatus, 5000);
    return () => clearInterval(statusInterval);
  }, [user]);

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    // Check if user is a delegate and has permission for nearby, if so, redirect there
    if (u.role === 'delegate' && hasPermission(u, 'nearby', 'view')) {
      setCurrentView(View.NEARBY);
    } else {
      setCurrentView(View.DASHBOARD);
    }
  };

  const handleLogout = () => {
    if (window.confirm('هل تريد تسجيل الخروج؟')) {
        mockLogout();
        setUser(null);
        setCurrentView(View.LOGIN);
    }
  };

  const handleLogoutForce = () => {
      mockLogout();
      setUser(null);
      setCurrentView(View.LOGIN);
  };

  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;

  // Permission check helper
  const can = (resource: string, action: string) => hasPermission(user, resource, action);

  const renderContent = () => {
    switch (currentView) {
      case View.SETTINGS_ODB: 
        return can('odb', 'view') ? <ODBTable user={user} /> : <AccessDenied />;
      case View.NEARBY: 
        return can('nearby', 'view') ? <NearbyPlaces user={user} /> : <AccessDenied />;
      case View.MAP_FILTER:
        return can('map_filter', 'view') ? <MapFilter user={user} /> : <AccessDenied />;
      case View.PROFILE: 
        return <Profile user={user} />;
      case View.SETTINGS_SITE: 
        return can('settings', 'view') ? <SiteSettingsComponent /> : <AccessDenied />;
      case View.USERS: 
        return can('users', 'view') ? <UserManagement /> : <AccessDenied />;
      case View.MY_ACTIVITY: 
        return can('my_activity', 'view') ? <MyActivity user={user} /> : <AccessDenied />;
      case View.DASHBOARD:
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4">
            {can('odb', 'view') && (
                <DashboardCard onClick={() => setCurrentView(View.SETTINGS_ODB)} icon={<Icons.Database />} color="blue" title="إدارة المواقع" desc="السجل العام" />
            )}
            {can('nearby', 'view') && (
                <DashboardCard onClick={() => setCurrentView(View.NEARBY)} icon={<Icons.MapPin />} color="purple" title="الأماكن القريبة" desc="الخريطة" />
            )}
            {can('map_filter', 'view') && (
                <DashboardCard onClick={() => setCurrentView(View.MAP_FILTER)} icon={<Icons.Map />} color="green" title="فلترة الخريطة" desc="بحث بالنطاق الجغرافي" />
            )}
            {can('my_activity', 'view') && (
                <DashboardCard onClick={() => setCurrentView(View.MY_ACTIVITY)} icon={<Icons.Check />} color="orange" title="نشاطي" desc="المواقع التي أضفتها" />
            )}
            {can('users', 'view') && (
                <DashboardCard onClick={() => setCurrentView(View.USERS)} icon={<Icons.Users />} color="gray" title="فريق العمل" desc="إدارة الصلاحيات والهيكل" />
            )}
            {can('settings', 'view') && (
                <DashboardCard onClick={() => setCurrentView(View.SETTINGS_SITE)} icon={<Icons.Settings />} color="gray" title="النظام" desc="إعدادات التطبيق" />
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex h-[100dvh] bg-gray-50 font-sans overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-secondary text-white shadow-xl shrink-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-gray-700/50">
          <h1 className="text-lg font-bold tracking-wider truncate">{siteName}</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <SidebarItem active={currentView === View.DASHBOARD} onClick={() => setCurrentView(View.DASHBOARD)} icon={<Icons.Dashboard />} text="الرئيسية" />
          
          <div className="pt-4 pb-2 px-2 text-xs font-semibold text-gray-500 uppercase">العمليات</div>
          {can('odb', 'view') && <SidebarItem active={currentView === View.SETTINGS_ODB} onClick={() => setCurrentView(View.SETTINGS_ODB)} icon={<Icons.Database />} text="كل المواقع" />}
          {can('map_filter', 'view') && <SidebarItem active={currentView === View.MAP_FILTER} onClick={() => setCurrentView(View.MAP_FILTER)} icon={<Icons.Map />} text="فلترة الخريطة" />}
          {can('my_activity', 'view') && <SidebarItem active={currentView === View.MY_ACTIVITY} onClick={() => setCurrentView(View.MY_ACTIVITY)} icon={<Icons.Check />} text="نشاطي" />}
          {can('nearby', 'view') && <SidebarItem active={currentView === View.NEARBY} onClick={() => setCurrentView(View.NEARBY)} icon={<Icons.MapPin />} text="الأماكن القريبة" />}
          
          {(can('users', 'view') || can('settings', 'view')) && <div className="pt-4 pb-2 px-2 text-xs font-semibold text-gray-500 uppercase">الإدارة</div>}
          {can('users', 'view') && <SidebarItem active={currentView === View.USERS} onClick={() => setCurrentView(View.USERS)} icon={<Icons.Users />} text="المستخدمين" />}
          {can('settings', 'view') && <SidebarItem active={currentView === View.SETTINGS_SITE} onClick={() => setCurrentView(View.SETTINGS_SITE)} icon={<Icons.Settings />} text="إعدادات الموقع" />}
          
          <SidebarItem active={currentView === View.PROFILE} onClick={() => setCurrentView(View.PROFILE)} icon={<Icons.User />} text="حسابي" />
        </nav>
        <div className="p-4 border-t border-gray-700/50">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-900/20 py-2 rounded-lg">
            <Icons.LogOut /> <span>خروج</span>
          </button>
        </div>
      </aside>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="shrink-0 h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-20">
            <div className="flex items-center gap-3 md:hidden">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">{siteName.charAt(0)}</div>
                <h2 className="text-base font-bold text-gray-800 truncate max-w-[150px]">{siteName}</h2>
            </div>
            <div className="hidden md:block text-xl font-bold text-gray-800">
                {currentView === View.DASHBOARD && 'لوحة التحكم'}
                {currentView === View.SETTINGS_ODB && 'سجل المواقع المركزي'}
                {currentView === View.MAP_FILTER && 'فلترة الخريطة (Bounding Box)'}
                {currentView === View.MY_ACTIVITY && 'سجل نشاطي'}
                {currentView === View.USERS && 'إدارة الصلاحيات'}
                {currentView === View.SETTINGS_SITE && 'إعدادات الموقع'}
                {currentView === View.NEARBY && 'الأماكن القريبة'}
                {currentView === View.PROFILE && 'الملف الشخصي'}
            </div>
            <div className="flex items-center gap-3">
                 <div className="hidden md:block text-sm text-gray-600"><span className="font-bold text-gray-900">{user.name}</span> <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full border">{user.role === 'admin' ? 'مدير' : user.role === 'supervisor' ? 'مشرف' : 'مندوب'}</span></div>
                 <button onClick={handleLogout} className="md:hidden text-gray-400"><Icons.LogOut /></button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-3 md:p-8 pb-24 md:pb-8">
            {renderContent()}
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden shrink-0 h-[calc(4rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-200 flex justify-around items-start pt-1 px-2 z-30 shadow-up pb-[env(safe-area-inset-bottom)]">
            <MobileNavItem active={currentView === View.DASHBOARD} onClick={() => setCurrentView(View.DASHBOARD)} icon={<Icons.Dashboard />} label="الرئيسية" />
            {can('odb', 'view') && <MobileNavItem active={currentView === View.SETTINGS_ODB} onClick={() => setCurrentView(View.SETTINGS_ODB)} icon={<Icons.Database />} label="القائمة" />}
            {can('map_filter', 'view') && (
                <div className="-mt-6">
                    <button onClick={() => setCurrentView(View.MAP_FILTER)} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${currentView === View.MAP_FILTER ? 'bg-primary text-white' : 'bg-secondary text-white'}`}>
                        <Icons.Map />
                    </button>
                </div>
            )}
            {can('my_activity', 'view') && <MobileNavItem active={currentView === View.MY_ACTIVITY} onClick={() => setCurrentView(View.MY_ACTIVITY)} icon={<Icons.Check />} label="نشاطي" />}
            {can('users', 'view') && <MobileNavItem active={currentView === View.USERS} onClick={() => setCurrentView(View.USERS)} icon={<Icons.Users />} label="الأعضاء" />}
        </nav>
      </main>
    </div>
  );
};

const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Icons.Lock />
        <h2 className="mt-2 font-bold text-gray-600">عفواً، ليس لديك صلاحية للوصول لهذه الصفحة</h2>
    </div>
);

const DashboardCard = ({ onClick, icon, title, desc, color }: any) => {
    const colors: any = { blue: 'bg-blue-100 text-blue-600', purple: 'bg-purple-100 text-purple-600', green: 'bg-green-100 text-green-600', gray: 'bg-gray-100 text-gray-600', orange: 'bg-orange-100 text-orange-600' };
    return (
        <div onClick={onClick} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all flex items-center gap-4 hover:border-blue-200">
            <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center shadow-sm`}>{icon}</div>
            <div><h3 className="text-lg font-bold text-gray-800">{title}</h3><p className="text-gray-500 text-xs">{desc}</p></div>
        </div>
    );
};

const SidebarItem = ({ active, onClick, icon, text }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
        <span className={active ? 'text-white' : 'text-gray-500'}>{icon}</span><span className="font-medium">{text}</span>
    </button>
);

const MobileNavItem = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center h-14 space-y-1 ${active ? 'text-primary' : 'text-gray-400'}`}>
        <span className="[&>svg]:w-6 [&>svg]:h-6">{icon}</span><span className="text-[10px] font-medium">{label}</span>
    </button>
);

export default App;