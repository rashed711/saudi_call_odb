
export type PermissionResource = 'dashboard' | 'odb' | 'nearby' | 'users' | 'settings' | 'my_activity' | 'map_filter';
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export interface Permission {
  resource: PermissionResource;
  actions: PermissionAction[];
}

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'supervisor' | 'delegate'; // Admin, Supervisor, Delegate
  supervisorId?: number | null; // If user is delegate, who is their supervisor?
  isActive: boolean;
  permissions: Permission[]; // Custom permissions list
}

export interface ODBLocation {
  id: number; 
  ODB_ID: string; 
  CITYNAME: string;
  LATITUDE: number;
  LONGITUDE: number;
  image?: string; 
  notes?: string; 
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface NearbyLocation extends ODBLocation {
  distance: number; 
}

export interface SiteSettings {
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  searchRadius: number; 
  maxResults: number;   
}

export enum View {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SETTINGS_ODB = 'SETTINGS_ODB',
  SETTINGS_SITE = 'SETTINGS_SITE',
  USERS = 'USERS',
  PROFILE = 'PROFILE',
  NEARBY = 'NEARBY',
  MY_ACTIVITY = 'MY_ACTIVITY',
  MAP_FILTER = 'MAP_FILTER' // New View
}