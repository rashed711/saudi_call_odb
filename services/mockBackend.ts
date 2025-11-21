
import { ODBLocation, User } from '../types';

// This service mocks what your PHP/SQL backend would do.
// In a real implementation, these functions would use fetch() to call your PHP endpoints.

const STORAGE_KEY_ODB = 'odb_data_v3'; // Changed key to reset data structure for string IDs
const STORAGE_KEY_USER = 'odb_user_session';

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

export const mockLogin = async (username: string, password: string): Promise<User> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (username === 'admin' && password === '123456') {
    const user: User = {
      id: 1,
      username: 'admin',
      name: 'المدير العام',
      email: 'admin@example.com',
      role: 'admin',
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  }
  throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
};

export const mockLogout = () => {
  localStorage.removeItem(STORAGE_KEY_USER);
};

export const getSession = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY_USER);
  return data ? JSON.parse(data) : null;
};

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
  // Check if updating existing record based on internal ID
  const existingIndex = current.findIndex(l => l.id === location.id);
  
  if (existingIndex >= 0) {
    current[existingIndex] = location;
  } else {
    // New Record
    // Generate Internal ID (Automatic & Unique)
    const maxId = current.reduce((max, item) => (item.id > max ? item.id : max), 0);
    location.id = maxId + 1;
    // NOTE: location.ODB_ID comes from the form input
    current.push(location);
  }
  
  localStorage.setItem(STORAGE_KEY_ODB, JSON.stringify(current));
  return current;
};

// Bulk save for importing large files
export const saveBulkODBLocations = (locations: Omit<ODBLocation, 'id'>[]) => {
  const current = getODBLocations();
  let maxId = current.reduce((max, item) => (item.id > max ? item.id : max), 0);
  
  const newEntries = locations.map((loc) => {
    maxId++;
    return {
      ...loc,
      id: maxId
    } as ODBLocation;
  });

  const updatedList = [...current, ...newEntries];
  localStorage.setItem(STORAGE_KEY_ODB, JSON.stringify(updatedList));
  return updatedList;
};

export const deleteODBLocation = (id: number) => {
  let current = getODBLocations();
  // Delete by internal ID
  current = current.filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEY_ODB, JSON.stringify(current));
  return current;
};

// Haversine formula to calculate distance in KM
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
