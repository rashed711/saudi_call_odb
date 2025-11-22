
import { ODBLocation, User, SiteSettings } from '../types';

// This service mocks what your PHP/SQL backend would do.
// In a real implementation, these functions would use fetch() to call your PHP endpoints.

const STORAGE_KEY_ODB = 'odb_data_v3';
const STORAGE_KEY_USER_SESSION = 'odb_user_session';
// Updated key to v2 to force refresh of user data with correct passwords
const STORAGE_KEY_USERS_DB = 'odb_users_db_v2';
const STORAGE_KEY_SETTINGS = 'odb_settings_v2'; // Updated key for new settings structure

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: 'ODB Manager Pro',
    primaryColor: '#1e40af', // blue-800
    secondaryColor: '#1e293b', // slate-800
    accentColor: '#3b82f6', // blue-500
    searchRadius: 50, // 50 km default
    maxResults: 20    // 20 items default
};

const INITIAL_MOCK_USERS: User[] = [
    { id: 1, username: 'admin', name: 'المدير العام', email: 'admin@example.com', role: 'admin', password: '123456', isActive: true },
    { id: 2, username: 'user1', name: 'محمد أحمد', email: 'mohamed@example.com', role: 'user', password: '123456', isActive: true },
    { id: 3, username: 'guest', name: 'زائر مؤقت', email: 'guest@example.com', role: 'user', password: '123456', isActive: false },
];

const INITIAL_MOCK_DATA: ODBLocation[] = [
  { id: 1, ODB_ID: "101", CITYNAME: 'Cairo (Downtown)', LATITUDE: 30.0444, LONGITUDE: 31.2357 },
  { id: 2, ODB_ID: "GZA-01", CITYNAME: 'Giza (Pyramids)', LATITUDE: 29.9792, LONGITUDE: 31.1342 },
  { id: 3, ODB_ID: "ALX_ZN1", CITYNAME: 'Alexandria', LATITUDE: 31.2001, LONGITUDE: 29.9187 },
  { id: 4, ODB_ID: "SHARM-100", CITYNAME: 'Sharm El Sheikh', LATITUDE: 27.9158, LONGITUDE: 34.3299 },
  { id: 5, ODB_ID: "LUX-TEMPLE", CITYNAME: 'Luxor', LATITUDE: 25.6872, LONGITUDE: 32.6396 },
  { id: 6, ODB_ID: "ASW-HIGH", CITYNAME: 'Aswan', LATITUDE: 24.0889, LONGITUDE: 32.8998 },
  { id: 7, ODB_ID: "HRG-RED", CITYNAME: 'Hurghada', LATITUDE: 27.2579, LONGITUDE: 33.8116 },
  { id: 8, ODB_ID: "108-B", CITYNAME: 'Mansoura', LATITUDE: 31.0409, LONGITUDE: 31.3785 },
  { id: 9, ODB_ID: "TNT-09", CITYNAME: 'Tanta', LATITUDE: 30.7865, LONGITUDE: 31.0004 },
  { id: 10, ODB_ID: "ISM-CANAL", CITYNAME: 'Ismailia', LATITUDE: 30.6043, LONGITUDE: 32.2723 },
  { id: 11, ODB_ID: "PTS-PORT", CITYNAME: 'Port Said', LATITUDE: 31.2653, LONGITUDE: 32.3019 },
  { id: 12, ODB_ID: "SUEZ-01", CITYNAME: 'Suez', LATITUDE: 29.9668, LONGITUDE: 32.5498 },
];

// --- USERS DB HELPER ---
const getUsersDB = (): User[] => {
    const data = localStorage.getItem(STORAGE_KEY_USERS_DB);
    if (!data) {
        localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(INITIAL_MOCK_USERS));
        return INITIAL_MOCK_USERS;
    }
    return JSON.parse(data);
};

const saveUsersDB = (users: User[]) => {
    localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(users));
};

// --- AUTH ---
export const mockLogin = async (username: string, pass: string): Promise<User> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const users = getUsersDB();
  const foundUser = users.find(u => u.username === username && u.password === pass);

  if (foundUser) {
      if (!foundUser.isActive) {
          throw new Error('تم إيقاف حسابك. يرجى مراجعة المسؤول.');
      }
      const { password, ...safeUser } = foundUser;
      localStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(safeUser));
      return safeUser as User;
  }
  
  throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
};

export const mockLogout = () => {
  localStorage.removeItem(STORAGE_KEY_USER_SESSION);
};

export const getSession = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY_USER_SESSION);
  return data ? JSON.parse(data) : null;
};

// --- USER MANAGEMENT ---
export const getUsers = (): User[] => {
    const users = getUsersDB();
    // remove passwords from list view
    return users.map(({ password, ...u }) => ({...u, password: ''} as User));
};

export const saveUser = (user: User) => {
    let users = getUsersDB();
    if (user.id) {
        // Update
        users = users.map(u => {
            if (u.id === user.id) {
                // Only update password if provided, else keep old
                const newPass = user.password ? user.password : u.password;
                return { ...u, ...user, password: newPass };
            }
            return u;
        });
    } else {
        // Create
        const maxId = users.reduce((max, u) => (u.id > max ? u.id : max), 0);
        users.push({ ...user, id: maxId + 1 });
    }
    saveUsersDB(users);
    return users;
};

export const deleteUser = (id: number) => {
    let users = getUsersDB();
    users = users.filter(u => u.id !== id);
    saveUsersDB(users);
    return users;
};

export const toggleUserStatus = (id: number) => {
    let users = getUsersDB();
    users = users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u);
    saveUsersDB(users);
    return users;
};


// --- ODB LOCATIONS ---
export const getODBLocations = (): ODBLocation[] => {
  const data = localStorage.getItem(STORAGE_KEY_ODB);
  if (!data) {
    localStorage.setItem(STORAGE_KEY_ODB, JSON.stringify(INITIAL_MOCK_DATA));
    return INITIAL_MOCK_DATA;
  }
  return JSON.parse(data);
};

export const saveODBLocation = (location: ODBLocation) => {
  const current = getODBLocations();
  const existingIndex = current.findIndex(l => l.id === location.id);
  
  if (existingIndex >= 0) {
    current[existingIndex] = location;
  } else {
    const maxId = current.reduce((max, item) => (item.id > max ? item.id : max), 0);
    location.id = maxId + 1;
    current.push(location);
  }
  
  localStorage.setItem(STORAGE_KEY_ODB, JSON.stringify(current));
  return current;
};

export const saveBulkODBLocations = (locations: Omit<ODBLocation, 'id'>[]) => {
  const current = getODBLocations();
  let maxId = current.reduce((max, item) => (item.id > max ? item.id : max), 0);
  
  const newEntries = locations.map((loc) => {
    maxId++;
    return { ...loc, id: maxId } as ODBLocation;
  });

  const updatedList = [...current, ...newEntries];
  localStorage.setItem(STORAGE_KEY_ODB, JSON.stringify(updatedList));
  return updatedList;
};

export const deleteODBLocation = (id: number) => {
  let current = getODBLocations();
  current = current.filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEY_ODB, JSON.stringify(current));
  return current;
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return d;
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// --- SITE SETTINGS ---
export const getSiteSettings = (): SiteSettings => {
    const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (data) {
        const parsed = JSON.parse(data);
        // Ensure new fields exist if loading old data
        return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return DEFAULT_SETTINGS;
};

export const saveSiteSettings = (settings: SiteSettings) => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    applySiteSettings(settings);
    return settings;
};

export const applySiteSettings = (settings: SiteSettings) => {
    // Update Document Title
    document.title = settings.siteName;

    // Update CSS Variables for Tailwind colors
    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.primaryColor);
    root.style.setProperty('--color-secondary', settings.secondaryColor);
    root.style.setProperty('--color-accent', settings.accentColor);
};