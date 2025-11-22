
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  password?: string; // Only used for creating/updating, not always returned
  role: 'admin' | 'user';
  isActive: boolean;
}

export interface ODBLocation {
  id: number; // System internal ID (Auto-increment, Unique)
  ODB_ID: string; // Business Logic ID (Alphanumeric & Symbols)
  CITYNAME: string;
  LATITUDE: number;
  LONGITUDE: number;
  image?: string; // Base64 string for the image
  notes?: string; // User notes
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface NearbyLocation extends ODBLocation {
  distance: number; // in kilometers
}

export interface SiteSettings {
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  searchRadius: number; // in Kilometers (0 = unlimited)
  maxResults: number;   // Number of items to show
}

export enum View {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SETTINGS_ODB = 'SETTINGS_ODB',
  SETTINGS_SITE = 'SETTINGS_SITE',
  USERS = 'USERS',
  PROFILE = 'PROFILE',
  NEARBY = 'NEARBY',
}