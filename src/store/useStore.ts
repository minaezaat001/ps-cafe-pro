import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Device, Session, InventoryItem, User } from '../types';

interface CafeState {
  devices: Device[];
  activeSessions: Session[];
  inventory: InventoryItem[];
  currentUser: User | null;
  
  // Actions
  setDevices: (devices: Device[]) => void;
  setActiveSessions: (sessions: Session[]) => void;
  setInventory: (items: InventoryItem[]) => void;
  setCurrentUser: (user: User | null) => void;
}

export const useStore = create<CafeState>()(
  persist(
    (set) => ({
      devices: [],
      activeSessions: [],
      inventory: [],
      currentUser: null,

      setDevices: (devices) => set({ devices }),
      setActiveSessions: (activeSessions) => set({ activeSessions }),
      setInventory: (inventory) => set({ inventory }),
      setCurrentUser: (currentUser) => set({ currentUser }),
    }),
    {
      name: 'cafe-storage-premium',
    }
  )
);
