
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
    { resource: 'my_activity', actions: ['view'] }
];

const SUPERVISOR_PERMISSIONS: Permission[] = [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'odb', actions: ['view', 'create', 'edit'] }, // No delete
    { resource: 'nearby', actions: ['view'] },
    { resource: 'users', actions: ['view', 'create', 'edit'] }, // Manage their delegates only
    { resource: 'my_activity', actions: ['view'] }
];

const DELEGATE_PERMISSIONS: Permission[] = [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'odb', actions: ['view'] }, // View only global list
    { resource: 'nearby', actions: ['view'] },
    { resource: 'my_activity', actions: ['view', 'edit'] } // Can edit their own work
];

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: 'ODB Manager Pro',
    primaryColor: '#1e40af',
    secondaryColor: '#1e293b',
    accentColor: '#3b82f6',
    searchRadius: 50,
    maxResults: 20
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
            // If response is OK but not JSON, that's an issue
            if (response.ok) {
                 console.error("Non-JSON Response from Server:", text);
                 if (text.includes("Fatal error") || text.includes("Parse error")) {
                    throw new Error("خطأ برمجي في السيرفر (PHP Error).");
                 }
                 throw new Error('الخادم أرسل استجابة غير صحيحة (Invalid JSON)'); 
            }
            // If response is NOT OK, we will handle it below
        }

        // Handle HTTP errors (4xx, 5xx)
        if (!response.ok) {
            // If the server sent a JSON error message (e.g., { "error": "User exists" }), use it
            if (data && data.error) {
                throw new Error(data.error);
            }
            
            // Otherwise, use the status text or a snippet of the raw response
            const cleanText = text ? text.replace(/<[^>]+>/g, '').trim().substring(0, 150) : response.statusText;
            throw new Error(`Server Error (${response.status}): ${cleanText}`);
        }

        // Handle Logic errors inside 200 OK (if any)
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

export const checkSessionStatus = async (userId: number): Promise<void> => {
    // Silent request to check if user is still active
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
            // OPTIMIZATION: Do NOT map the image here to save bandwidth. 
            image: undefined 
        }));
        return { data: mappedData, total: Number(result.total), totalPages: Number(result.totalPages) };
    } catch (e: any) {
        if (e.message.includes("Invalid JSON")) {
             console.error("Backend returned invalid JSON. Possible PHP Error.");
        }
        throw e;
    }
};

// 2. Get Single Location Details (HEAVY - With Image)
export const getLocationDetails = async (id: number): Promise<ODBLocation> => {
    const result = await apiRequest(`get_location_details&id=${id}`, 'GET');
    
    // Support both single object and array return
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
        image: loc.image // Here we DO include the image
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
        image: undefined // OPTIMIZATION: No image in list
    }));
    
    return { data: mappedData, total: Number(result.total) };
};

export const getNearbyLocationsAPI = async (lat: number, lng: number, radius: number, limit: number): Promise<NearbyLocation[]> => {
    const effectiveRadius = radius === 0 ? 20000 : radius;
    const data = await apiRequest(`get_nearby_locations&lat=${lat}&lng=${lng}&radius=${effectiveRadius}&limit=${limit}`, 'GET');
    
    if (!Array.isArray(data)) {
        console.error("Expected array for nearby locations, got:", data);
        return [];
    }

    return data.map((loc: any) => ({
        ...loc,
        id: Number(loc.id),
        ODB_ID: loc.ODB_ID || loc.odb_id,
        CITYNAME: loc.CITYNAME || loc.city_name,
        LATITUDE: Number(loc.LATITUDE || loc.latitude),
        LONGITUDE: Number(loc.LONGITUDE || loc.longitude),
        distance: Number(loc.distance),
        lastEditedBy: loc.last_edited_by || loc.lastEditedBy,
        lastEditedAt: loc.last_edited_at || loc.lastEditedAt,
        image: undefined // OPTIMIZATION: No image in list
    }));
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
