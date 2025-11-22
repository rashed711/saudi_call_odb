
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
async function apiRequest(action: string, method: 'GET' | 'POST' = 'GET', body: any = null, signal?: AbortSignal) {
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
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
             throw new Error(`Server Error (HTML response)`);
        }
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON'); }

        if (response.ok) {
            if (data.error) throw new Error(data.error);
            return data;
        } else {
            throw new Error(data.error || `HTTP Error: ${response.status}`);
        }
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error(`API Request Failed [${action}]:`, error);
        throw error;
    }
}

// --- AUTH & PERMISSIONS ---
export const mockLogin = async (username: string, pass: string): Promise<User> => {
    // Real login to verify credentials
    const user = await apiRequest('login', 'POST', { username, password: pass });
    
    // INJECT PERMISSIONS (Simulation since DB might not have them yet)
    // In a real app, these come from the DB. Here we attach defaults if missing.
    let finalUser = { ...user };
    // Parse permissions if they come as string from DB
    if (typeof finalUser.permissions === 'string') {
        try { finalUser.permissions = JSON.parse(finalUser.permissions); } catch(e) { finalUser.permissions = null; }
    }

    if (!finalUser.permissions || !Array.isArray(finalUser.permissions)) {
        if (finalUser.role === 'admin') finalUser.permissions = ADMIN_PERMISSIONS;
        else if (finalUser.role === 'supervisor') finalUser.permissions = SUPERVISOR_PERMISSIONS;
        else finalUser.permissions = DELEGATE_PERMISSIONS;
    }
    
    // Normalize ID
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

// Helper to check permissions
export const hasPermission = (user: User, resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has all power
    const resPerm = user.permissions.find(p => p.resource === resource);
    return resPerm ? resPerm.actions.includes(action as any) : false;
};

// --- USER MANAGEMENT (HIERARCHY AWARE) ---
export const getUsers = async (currentUser: User): Promise<User[]> => {
    const allUsers = await apiRequest('get_users');
    
    // Map & Clean
    let usersList = allUsers.map((u: any) => ({
        ...u,
        id: Number(u.id),
        supervisorId: u.supervisorId ? Number(u.supervisorId) : null,
        isActive: u.isActive == 1 || u.isActive === true,
        permissions: u.permissions ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions) : (u.role === 'admin' ? ADMIN_PERMISSIONS : (u.role === 'supervisor' ? SUPERVISOR_PERMISSIONS : DELEGATE_PERMISSIONS))
    }));

    // HIERARCHY FILTER
    if (currentUser.role === 'supervisor') {
        // Supervisor sees only themselves and their delegates
        return usersList.filter((u: User) => u.id === currentUser.id || u.supervisorId === currentUser.id);
    } else if (currentUser.role === 'delegate') {
        // Delegate sees only themselves
        return usersList.filter((u: User) => u.id === currentUser.id);
    }

    // Admin sees everyone
    return usersList;
};

export const saveUser = async (userToSave: User): Promise<void> => {
    // Convert permissions array to string for DB storage
    const payload = {
        ...userToSave,
        permissions: userToSave.permissions // Send as array, let PHP encode it
    };
    
    await apiRequest('save_user', 'POST', payload);
};

export const deleteUser = async (id: number): Promise<void> => {
    await apiRequest(`delete_user&id=${id}`, 'GET');
};

export const toggleUserStatus = async (id: number): Promise<void> => {
    await apiRequest(`toggle_user_status&id=${id}`, 'GET');
};

// --- LOCATIONS & ACTIVITY ---

export const getODBLocationsPaginated = async (page: number, limit: number, search: string = '', signal?: AbortSignal): Promise<{data: ODBLocation[], total: number, totalPages: number}> => {
    const result = await apiRequest(`get_locations_paginated&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, 'GET', null, signal);
    const mappedData = result.data.map((loc: any) => ({
        ...loc,
        id: Number(loc.id),
        LATITUDE: Number(loc.LATITUDE),
        LONGITUDE: Number(loc.LONGITUDE),
        // Map snake_case from DB to camelCase for Frontend
        lastEditedBy: loc.last_edited_by || loc.lastEditedBy,
        lastEditedAt: loc.last_edited_at || loc.lastEditedAt
    }));
    return { data: mappedData, total: Number(result.total), totalPages: Number(result.totalPages) };
};

// NEW: Get My Activity (Filtered by username/editor)
// Accepts a search term which is now expected to be the User ID or Username
export const getMyActivity = async (username: string, page: number = 1, limit: number = 20): Promise<{data: ODBLocation[], total: number}> => {
    // The backend 'get_locations_paginated' endpoint searches in 'last_edited_by' as well
    // We pass the username to filter by who edited/created it.
    const result = await apiRequest(`get_locations_paginated&page=${page}&limit=${limit}&search=${encodeURIComponent(username)}`, 'GET');
    
    const mappedData = result.data.map((loc: any) => ({
        ...loc,
        id: Number(loc.id),
        LATITUDE: Number(loc.LATITUDE),
        LONGITUDE: Number(loc.LONGITUDE),
        // Map snake_case from DB to camelCase for Frontend
        lastEditedBy: loc.last_edited_by || loc.lastEditedBy,
        lastEditedAt: loc.last_edited_at || loc.lastEditedAt
    }));
    
    return { data: mappedData, total: Number(result.total) };
};

export const getNearbyLocationsAPI = async (lat: number, lng: number, radius: number, limit: number): Promise<NearbyLocation[]> => {
    const effectiveRadius = radius === 0 ? 20000 : radius;
    const data = await apiRequest(`get_nearby_locations&lat=${lat}&lng=${lng}&radius=${effectiveRadius}&limit=${limit}`, 'GET');
    return data.map((loc: any) => ({
        ...loc,
        id: Number(loc.id),
        LATITUDE: Number(loc.LATITUDE),
        LONGITUDE: Number(loc.LONGITUDE),
        distance: Number(loc.distance),
        // Map snake_case from DB to camelCase for Frontend
        lastEditedBy: loc.last_edited_by || loc.lastEditedBy,
        lastEditedAt: loc.last_edited_at || loc.lastEditedAt
    }));
};

export const saveODBLocation = async (location: ODBLocation): Promise<void> => {
    // Ensure we send snake_case keys for the backend to understand
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
        const settings = await apiRequest('get_settings');
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
