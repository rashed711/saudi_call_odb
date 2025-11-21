import { ODBLocation, User } from '../types';

// This service mocks what your PHP/SQL backend would do.
// In a real implementation, these functions would use fetch() to call your PHP endpoints.

const STORAGE_KEY_ODB = 'odb_data_v1';
const STORAGE_KEY_USER = 'odb_user_session';

const INITIAL_MOCK_DATA: ODBLocation[] = [
  { ODB_ID: 1, CITYNAME: 'Cairo (Downtown)', LATITUDE: 30.0444, LONGITUDE: 31.2357 },
  { ODB_ID: 2, CITYNAME: 'Giza (Pyramids)', LATITUDE: 29.9792, LONGITUDE: 31.1342 },
  { ODB_ID: 3, CITYNAME: 'Alexandria', LATITUDE: 31.2001, LONGITUDE: 29.9187 },
  { ODB_ID: 4, CITYNAME: 'Sharm El Sheikh', LATITUDE: 27.9158, LONGITUDE: 34.3299 },
  { ODB_ID: 5, CITYNAME: 'Luxor', LATITUDE: 25.6872, LONGITUDE: 32.6396 },
  { ODB_ID: 6, CITYNAME: 'Aswan', LATITUDE: 24.0889, LONGITUDE: 32.8998 },
  { ODB_ID: 7, CITYNAME: 'Hurghada', LATITUDE: 27.2579, LONGITUDE: 33.8116 },
  { ODB_ID: 8, CITYNAME: 'Mansoura', LATITUDE: 31.0409, LONGITUDE: 31.3785 },
  { ODB_ID: 9, CITYNAME: 'Tanta', LATITUDE: 30.7865, LONGITUDE: 31.0004 },
  { ODB_ID: 10, CITYNAME: 'Ismailia', LATITUDE: 30.6043, LONGITUDE: 32.2723 },
  { ODB_ID: 11, CITYNAME: 'Port Said', LATITUDE: 31.2653, LONGITUDE: 32.3019 },
  { ODB_ID: 12, CITYNAME: 'Suez', LATITUDE: 29.9668, LONGITUDE: 32.5498 },
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
  const existingIndex = current.findIndex(l => l.ODB_ID === location.ODB_ID);
  
  if (existingIndex >= 0) {
    current[existingIndex] = location;
  } else {
    // Generate ID if new (simple max+1 logic)
    const maxId = current.reduce((max, item) => (item.ODB_ID > max ? item.ODB_ID : max), 0);
    location.ODB_ID = maxId + 1;
    current.push(location);
  }
  
  localStorage.setItem(STORAGE_KEY_ODB, JSON.stringify(current));
  return current;
};

export const deleteODBLocation = (id: number) => {
  let current = getODBLocations();
  current = current.filter(l => l.ODB_ID !== id);
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
