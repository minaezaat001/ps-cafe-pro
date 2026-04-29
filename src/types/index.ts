export type DeviceType = 'PRIVATE' | 'PS4' | 'PS5';
export type SessionType = 'OPEN' | 'FIXED';
export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface OrderItem {
  id: string;
  inventoryItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Session {
  id: string;
  deviceId: string;
  startTime: string; // ISO string for JSON serialization
  type: SessionType;
  durationMinutes?: number;
  drinks: OrderItem[];
  isActive: boolean;
  totalPrice?: number;
}

export interface Device {
  id: string;
  number: string;
  type: DeviceType;
  hourlyRateSingle: number;
  hourlyRateMulti: number;
  currentSessionId?: string;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
}
