
import { ODBLocation, User, SiteSettings, NearbyLocation } from '../types';

// ---------------------------------------------------------------------------
// تم تحديث الرابط ليعمل على الاستضافة الجديدة (Cloud)
// ---------------------------------------------------------------------------
const API_BASE_URL = 'https://start.enjaz.cloud/api/api.php'; 

const STORAGE_KEY_USER_SESSION = 'odb_user_session_v2';

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: 'ODB Manager Pro',
    primaryColor: '#1e40af',
    secondaryColor: '#1e293b',
    accentColor: '#3b82f6',
    searchRadius: 50,
    maxResults: 20
};

// --- HELPER: GENERIC FETCH WRAPPER ---
async function apiRequest(action: string, method: 'GET' | 'POST' = 'GET', body: any = null, signal?: AbortSignal) {
    // Append action to URL
    const url = `${API_BASE_URL}?action=${action}`;
    
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        // Standard CORS mode
        mode: 'cors',
        signal // Pass the abort signal
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        
        // التحقق مما إذا كان السيرفر يرجع صفحة HTML (خطأ 404 أو 500) بدلاً من JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
             const text = await response.text();
             console.error(`Server returned HTML instead of JSON at ${url}. Preview:`, text.substring(0, 150));
             
             if (text.includes("Parse error") || text.includes("Fatal error") || text.includes("Syntax error")) {
                 throw new Error(`خطأ برمجي في ملف PHP (Syntax Error). تأكد من أنك كتبت require_once بشكل صحيح (كلمة واحدة).`);
             }
             
             throw new Error(`خطأ في الرابط: السيرفر رد بصفحة HTML بدلاً من JSON. تأكد من مسار ملف api.php.`);
        }

        const text = await response.text();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse Error. Response body:", text);
            throw new Error('البيانات القادمة من السيرفر غير صالحة (Invalid JSON).');
        }

        if (response.ok) {
            if (data.error) throw new Error(data.error);
            return data;
        } else {
            throw new Error(data.error || `HTTP Error: ${response.status}`);
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw error; // Let the caller handle aborts (usually ignore)
        }
        console.error(`API Request Failed [${action}]:`, error);
        
        if (error.message === 'Failed to fetch') {
            try {
                await fetch(url, { mode: 'no-cors', method: 'GET' });
                throw new Error(`تم كشف السيرفر ولكن تم حظر الاتصال (CORS)! \nالحل: تأكد من وجود كود الـ Header في ملف api.php على السيرفر الجديد.`);
            } catch (innerError) {
                throw new Error(`تعذر الوصول للسيرفر نهائياً (${API_BASE_URL}). \nتأكد أن الرابط صحيح وأن الاستضافة تعمل.`);
            }
        }
        throw error;
    }
}

// --- AUTH ---
export const mockLogin = async (username: string, pass: string): Promise<User> => {
    const user = await apiRequest('login', 'POST', { username, password: pass });
    localStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(user));
    return user as User;
};

export const mockLogout = () => {
  localStorage.removeItem(STORAGE_KEY_USER_SESSION);
};

export const getSession = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY_USER_SESSION);
  return data ? JSON.parse(data) : null;
};

// --- USER MANAGEMENT ---
export const getUsers = async (): Promise<User[]> => {
    const users = await apiRequest('get_users');
    return users.map((u: any) => ({
        ...u,
        id: Number(u.id),
        isActive: u.isActive == 1 || u.isActive === true
    }));
};

export const saveUser = async (user: User): Promise<void> => {
    await apiRequest('save_user', 'POST', user);
};

export const deleteUser = async (id: number): Promise<void> => {
    await apiRequest(`delete_user&id=${id}`, 'GET');
};

export const toggleUserStatus = async (id: number): Promise<void> => {
    await apiRequest(`toggle_user_status&id=${id}`, 'GET');
};

// --- ODB LOCATIONS ---

// Legacy method (DEPRECATED for large datasets)
export const getODBLocations = async (): Promise<ODBLocation[]> => {
    const data = await apiRequest('get_locations');
    return data.map((loc: any) => ({
        ...loc,
        id: Number(loc.id),
        LATITUDE: Number(loc.LATITUDE),
        LONGITUDE: Number(loc.LONGITUDE)
    }));
};

// Server-Side Nearby Search (Highly Efficient)
export const getNearbyLocationsAPI = async (lat: number, lng: number, radius: number, limit: number): Promise<NearbyLocation[]> => {
    // If radius is 0 (unlimited), we pass a very large number to SQL
    const effectiveRadius = radius === 0 ? 20000 : radius;
    
    const data = await apiRequest(`get_nearby_locations&lat=${lat}&lng=${lng}&radius=${effectiveRadius}&limit=${limit}`, 'GET');
    
    return data.map((loc: any) => ({
        ...loc,
        id: Number(loc.id),
        LATITUDE: Number(loc.LATITUDE),
        LONGITUDE: Number(loc.LONGITUDE),
        distance: Number(loc.distance) // SQL calculates this now
    }));
};

// New method (Server-side Pagination) - Used for ODBTable
export const getODBLocationsPaginated = async (page: number, limit: number, search: string = '', signal?: AbortSignal): Promise<{data: ODBLocation[], total: number, totalPages: number}> => {
    const result = await apiRequest(`get_locations_paginated&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, 'GET', null, signal);
    
    const mappedData = result.data.map((loc: any) => ({
        ...loc,
        id: Number(loc.id),
        LATITUDE: Number(loc.LATITUDE),
        LONGITUDE: Number(loc.LONGITUDE)
    }));

    return {
        data: mappedData,
        total: Number(result.total),
        totalPages: Number(result.totalPages)
    };
};

export const saveODBLocation = async (location: ODBLocation): Promise<void> => {
    await apiRequest('save_location', 'POST', location);
};

export const saveBulkODBLocations = async (locations: Omit<ODBLocation, 'id'>[]): Promise<{success: boolean, added: number, skipped: number}> => {
    const result = await apiRequest('save_bulk_locations', 'POST', { locations });
    return result; 
};

export const deleteODBLocation = async (id: number): Promise<void> => {
    await apiRequest(`delete_location&id=${id}`, 'GET');
};

// Helper: Calculate Distance (Client Side logic - Keeping it for fallback if needed)
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
export const getSiteSettings = async (): Promise<SiteSettings> => {
    try {
        const settings = await apiRequest('get_settings');
        return { ...DEFAULT_SETTINGS, ...settings, searchRadius: Number(settings.searchRadius), maxResults: Number(settings.maxResults) };
    } catch (e) {
        console.warn("Failed to load settings from API, using defaults. Check API connection.");
        return DEFAULT_SETTINGS;
    }
};

export const saveSiteSettings = async (settings: SiteSettings): Promise<void> => {
    await apiRequest('save_settings', 'POST', settings);
    applySiteSettings(settings);
};

export const applySiteSettings = (settings: SiteSettings) => {
    document.title = settings.siteName;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.primaryColor);
    root.style.setProperty('--color-secondary', settings.secondaryColor);
    root.style.setProperty('--color-accent', settings.accentColor);
};
