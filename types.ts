export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface ODBLocation {
  ODB_ID: number;
  CITYNAME: string;
  LATITUDE: number;
  LONGITUDE: number;
}

export interface NearbyLocation extends ODBLocation {
  distance: number; // in kilometers
}

export enum View {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SETTINGS_ODB = 'SETTINGS_ODB',
  PROFILE = 'PROFILE',
  NEARBY = 'NEARBY',
}
