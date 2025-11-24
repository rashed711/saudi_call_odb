
import { ODBLocation, User, SiteSettings, NearbyLocation, Permission } from '../types';

const API_BASE_URL = 'https://start.enjaz.cloud/api/api.php'; 
const STORAGE_KEY_USER_SESSION = 'odb_user_session_v3_perm';

// --- DEFAULT PERMISSIONS TEMPLATES ---
const ADMIN_PERMISSIONS: Permission[] = [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'odb', actions: ['view', 'create', 'edit', 'delete', 'export'] },
    { resource: 'nearby', actions: ['view', 'create', 'edit'] },
    { resource: 'users', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'settings', actions: ['view', 'edit'] },
    { resource: 'my_activity', actions: ['view'] },
    { resource: 'map_filter', actions: ['view'] },
    { resource: 'search_odb', actions: ['view'] }
];

const SUPERVISOR_PERMISSIONS: Permission[] = [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'odb', actions: ['view', 'create', 'edit'] }, // No delete
    { resource: 'nearby', actions: ['view'] },
    { resource: 'users', actions: ['view', 'create', 'edit'] }, // Manage their delegates only
    { resource: 'my_activity', actions: ['view'] },
    { resource: 'map_filter', actions: ['view'] },
    { resource: 'search_odb', actions: ['view'] }
];

const DELEGATE_PERMISSIONS: Permission[] = [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'odb', actions: ['view'] }, // View only global list
    { resource: 'nearby', actions: ['view'] },
    { resource: 'my_activity', actions: ['view', 'edit'] }, // Can edit their own work
    { resource: 'map_filter', actions: ['view'] },
    { resource: 'search_odb', actions: ['view'] }
];

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: 'ODB Manager Pro',
    primaryColor: '#1e40af',
    secondaryColor: '#1e293b',
    accentColor: '#3b82f6',
    searchRadius: 50,
    maxResults: 20 // Updated to 20 per user request
};

// --- HELPER ---
async function apiRequest(action: string, method: 'GET' | 'POST' = 'GET', body: any = null, signal?: AbortSignal, silent: boolean = false) {
    const url = `${API_BASE_URL}?action=${action}`;
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        signal
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(url, options);
        const text = await response.text();
        
        let data;
        try { 
            data = JSON.parse(text); 
        } catch (e) { 
            if (response.ok) {
                 console.error("Non-JSON Response from Server:", text);
                 if (text.includes("Fatal error") || text.includes("Parse error")) {
                    throw new Error("خطأ برمجي في السيرفر (PHP Error).");
                 }
                 throw new Error('الخادم أرسل استجابة غير صحيحة (Invalid JSON)'); 
            }
        }

        if (!response.ok) {
            if (data && data.error) {
                throw new Error(data.error);
            }
            const cleanText = text ? text.replace(/<[^>]+>/g, '').trim().substring(0, 150) : response.statusText;
            throw new Error(`Server Error (${response.status}): ${cleanText}`);
        }

        if (data.error) throw new Error(data.error);
        return data;

    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        if (error.message === 'Failed to fetch') {
             throw new Error("فشل الاتصال بالسيرفر. تأكد من تشغيل ملف api.php وإعدادات CORS.");
        }
        if (!silent) console.error(`API Request Failed [${action}]:`, error);
        throw error;
    }
}

// --- UTILS ---
// Haversine formula to calculate distance in KM
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI/180);
}

// --- AUTH & PERMISSIONS ---
export const mockLogin = async (username: string, pass: string): Promise<User> => {
    const user = await apiRequest('login', 'POST', { username, password: pass });
    
    let finalUser = { ...user };
    if (typeof finalUser.permissions === 'string') {
        try { finalUser.permissions = JSON.parse(finalUser.permissions); } catch(e) { finalUser.permissions = null; }
    }

    if (!finalUser.permissions || !Array.isArray(finalUser.permissions)) {
        if (finalUser.role === 'admin') finalUser.permissions = ADMIN_PERMISSIONS;
        else if (finalUser.role === 'supervisor') finalUser.permissions = SUPERVISOR_PERMISSIONS;
        else finalUser.permissions = DELEGATE_PERMISSIONS;
    }
    
    finalUser.id = Number(finalUser.id);
    finalUser.supervisorId = finalUser.supervisorId ? Number(finalUser.supervisorId) : null;

    localStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(finalUser));
    return finalUser as User;
};

export const mockLogout = () => {
  localStorage.removeItem(STORAGE_KEY_USER_SESSION);
};

export const getSession = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY_USER_SESSION);
  return data ? JSON.parse(data) : null;
};

// New function to support Real-Time Permission Updates
export const refreshUserSession = async (userId: number): Promise<User | null> => {
    try {
        // Fetch all users to find the specific one (Simulating 'get_me' since backend might not have it)
        const allUsers = await apiRequest('get_users', 'GET', null, undefined, true); // silent request
        const rawUser = allUsers.find((u: any) => Number(u.id) === userId);
        
        if (!rawUser) return null;

        let permissions = rawUser.permissions;
        if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions); } catch(e) { permissions = null; }
        }

        if (!permissions || !Array.isArray(permissions)) {
             if (rawUser.role === 'admin') permissions = ADMIN_PERMISSIONS;
             else if (rawUser.role === 'supervisor') permissions = SUPERVISOR_PERMISSIONS;
             else permissions = DELEGATE_PERMISSIONS;
        }

        const freshUser: User = {
            id: Number(rawUser.id),
            username: rawUser.username,
            name: rawUser.name,
            email: rawUser.email,
            role: rawUser.role,
            supervisorId: rawUser.supervisorId ? Number(rawUser.supervisorId) : null,
            isActive: rawUser.isActive == 1 || rawUser.isActive === true,
            permissions: permissions
        };
        
        // Note: We don't automatically update localStorage here to allow the App to decide when to re-render,
        // but we return the fresh object.
        return freshUser;

    } catch (e) {
        return null;
    }
};

export const checkSessionStatus = async (userId: number): Promise<void> => {
    await apiRequest(`check_session&id=${userId}`, 'GET', null, undefined, true);
};

export const hasPermission = (user: User, resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; 
    const resPerm = user.permissions.find(p => p.resource === resource);
    return resPerm ? resPerm.actions.includes(action as any) : false;
};

// --- USER MANAGEMENT ---
export const getUsers = async (currentUser: User): Promise<User[]> => {
    const allUsers = await apiRequest('get_users');
    let usersList = allUsers.map((u: any) => ({
        ...u,
        id: Number(u.id),
        supervisorId: u.supervisorId ? Number(u.supervisorId) : null,
        isActive: u.isActive == 1 || u.isActive === true,
        permissions: u.permissions ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions) : (u.role === 'admin' ? ADMIN_PERMISSIONS : (u.role === 'supervisor' ? SUPERVISOR_PERMISSIONS : DELEGATE_PERMISSIONS))
    }));

    if (currentUser.role === 'supervisor') {
        return usersList.filter((u: User) => u.id === currentUser.id || u.supervisorId === currentUser.id);
    } else if (currentUser.role === 'delegate') {
        return usersList.filter((u: User) => u.id === currentUser.id);
    }
    return usersList;
};

export const saveUser = async (userToSave: User): Promise<void> => {
    const payload = { ...userToSave, permissions: userToSave.permissions };
    await apiRequest('save_user', 'POST', payload);
};

export const deleteUser = async (id: number): Promise<void> => {
    await apiRequest(`delete_user&id=${id}`, 'GET');
};

export const toggleUserStatus = async (id: number): Promise<void> => {
    await apiRequest(`toggle_user_status&id=${id}`, 'GET');
};

// --- LOCATIONS & ACTIVITY (OPTIMIZED) ---

// 1. Get List (LIGHTWEIGHT - No Images)
export const getODBLocationsPaginated = async (page: number, limit: number, search: string = '', signal?: AbortSignal): Promise<{data: ODBLocation[], total: number, totalPages: number}> => {
    try {
        const result = await apiRequest(`get_locations_paginated&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, 'GET', null, signal);
        const mappedData = result.data.map((loc: any) => ({
            ...loc,
            id: Number(loc.id),
            ODB_ID: loc.ODB_ID || loc.odb_id,
            CITYNAME: loc.CITYNAME || loc.city_name,
            LATITUDE: Number(loc.LATITUDE || loc.latitude),
            LONGITUDE: Number(loc.LONGITUDE || loc.longitude),
            lastEditedBy: loc.last_edited_by || loc.lastEditedBy,
            lastEditedAt: loc.last_edited_at || loc.lastEditedAt,
            image: undefined 
        }));
        return { data: mappedData, total: Number(result.total), totalPages: Number(result.totalPages) };
    } catch (e: any) {
        throw e;
    }
};

// Specialized Search Function (Optimized for single result)
export const searchODBLocation = async (query: string): Promise<ODBLocation[]> => {
    // We reuse the paginated endpoint but limit to 5 results to keep it fast
    const result = await getODBLocationsPaginated(1, 5, query);
    return result.data;
};

export const getAllLocationsForMap = async (): Promise<ODBLocation[]> => {
     try {
        const result = await apiRequest(`get_locations_paginated&page=1&limit=500`, 'GET');
        return result.data.map((loc: any) => ({
            ...loc,
            id: Number(loc.id),
            ODB_ID: loc.ODB_ID || loc.odb_id,
            CITYNAME: loc.CITYNAME || loc.city_name,
            LATITUDE: Number(loc.LATITUDE || loc.latitude),
            LONGITUDE: Number(loc.LONGITUDE || loc.longitude),
            image: undefined 
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const getLocationDetails = async (id: number): Promise<ODBLocation> => {
    const result = await apiRequest(`get_location_details&id=${id}`, 'GET');
    const loc = Array.isArray(result) ? result[0] : result;
    
    if (!loc) throw new Error("الموقع غير موجود");

    return {
        ...loc,
        id: Number(loc.id),
        ODB_ID: loc.ODB_ID || loc.odb_id,
        CITYNAME: loc.CITYNAME || loc.city_name,
        LATITUDE: Number(loc.LATITUDE || loc.latitude),
        LONGITUDE: Number(loc.LONGITUDE || loc.longitude),
        lastEditedBy: loc.last_edited_by || loc.lastEditedBy,
        lastEditedAt: loc.last_edited_at || loc.lastEditedAt,
        image: loc.image
    };
};

export const getMyActivity = async (username: string, page: number = 1, limit: number = 20): Promise<{data: ODBLocation[], total: number}> => {
    const result = await apiRequest(`get_locations_paginated&page=${page}&limit=${limit}&editor=${encodeURIComponent(username)}`, 'GET');
    
    const mappedData = result.data.map((loc: any) => ({
        ...loc,
        id: Number(loc.id),
        ODB_ID: loc.ODB_ID || loc.odb_id,
        CITYNAME: loc.CITYNAME || loc.city_name,
        LATITUDE: Number(loc.LATITUDE || loc.latitude),
        LONGITUDE: Number(loc.LONGITUDE || loc.longitude),
        lastEditedBy: loc.last_edited_by || loc.lastEditedBy,
        lastEditedAt: loc.last_edited_at || loc.lastEditedAt,
        image: undefined 
    }));
    
    return { data: mappedData, total: Number(result.total) };
};

export const getNearbyLocationsAPI = async (lat: number, lng: number, radius: number, limit: number): Promise<NearbyLocation[]> => {
    const effectiveRadius = radius === 0 ? 50000 : radius;
    // We request more from the server if possible, then filter accurately on client to be safe
    // But since this is a proxy, we trust the server first.
    let data = await apiRequest(`get_nearby_locations&lat=${lat}&lng=${lng}&radius=${effectiveRadius}&limit=${limit}`, 'GET');
    
    if (!Array.isArray(data)) {
        // Fallback: If backend returns object or error, try fetching all and sorting client-side (Emergency mode)
        // For now, return empty array to prevent crash
        return [];
    }

    // MAP AND ENSURE DISTANCE
    let mappedLocations = data.map((loc: any) => {
        const lLat = Number(loc.LATITUDE || loc.latitude);
        const lLng = Number(loc.LONGITUDE || loc.longitude);
        
        // If API didn't return distance, calculate it
        let dist = loc.distance ? Number(loc.distance) : calculateDistance(lat, lng, lLat, lLng);

        return {
            ...loc,
            id: Number(loc.id),
            ODB_ID: loc.ODB_ID || loc.odb_id,
            CITYNAME: loc.CITYNAME || loc.city_name,
            LATITUDE: lLat,
            LONGITUDE: lLng,
            distance: dist,
            lastEditedBy: loc.last_edited_by || loc.lastEditedBy,
            lastEditedAt: loc.last_edited_at || loc.lastEditedAt,
            image: undefined 
        };
    });

    // Client-side sort to guarantee "Nearest 20"
    mappedLocations.sort((a, b) => a.distance - b.distance);

    // Enforce limit if API didn't
    if (limit > 0) {
        mappedLocations = mappedLocations.slice(0, limit);
    }

    return mappedLocations;
};

export const saveODBLocation = async (location: ODBLocation): Promise<void> => {
    const payload = {
        ...location,
        last_edited_by: location.lastEditedBy,
        last_edited_at: location.lastEditedAt
    };
    await apiRequest('save_location', 'POST', payload);
};

export const saveBulkODBLocations = async (locations: Omit<ODBLocation, 'id'>[]): Promise<{success: boolean, added: number, skipped: number}> => {
    const result = await apiRequest('save_bulk_locations', 'POST', { locations });
    return result; 
};

export const deleteODBLocation = async (id: number): Promise<void> => {
    await apiRequest(`delete_location&id=${id}`, 'GET');
};

// --- SITE SETTINGS ---
export const getSiteSettings = async (): Promise<SiteSettings> => {
    try {
        const settings = await apiRequest('get_settings', 'GET', null, undefined, true);
        return { ...DEFAULT_SETTINGS, ...settings, searchRadius: Number(settings.searchRadius), maxResults: Number(settings.maxResults) };
    } catch (e) {
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