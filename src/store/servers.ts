import { atom } from 'jotai';
import { api } from '@/lib/ipc';

// Types
export interface Server {
  id: string;
  name: string;
  description?: string;
  status: string;
  transport: string;
  runMode: string;
  createdAt: Date;
  updatedAt: Date;
  tools?: any[];
  connections?: any[];
  _count?: {
    tools: number;
    connections: number;
    versions: number;
  };
}

// Atoms
export const serversAtom = atom<Server[]>([]);

export const selectedServerIdAtom = atom<string | null>(null);

// Derived atoms
export const selectedServerAtom = atom((get) => {
  const servers = get(serversAtom);
  const selectedId = get(selectedServerIdAtom);
  return servers.find((s) => s.id === selectedId) || null;
});

// Async atoms (actions)
export const loadServersAtom = atom(
  null,
  async (get, set) => {
    if (!api) return;

    try {
      const response = await api.servers.list();
      if (response.success) {
        set(serversAtom, response.data);
      } else {
        console.error('Failed to load servers:', response.error);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  }
);

export const createServerAtom = atom(
  null,
  async (get, set, data: Partial<Server>) => {
    if (!api) return null;

    try {
      const response = await api.servers.create(data);
      if (response.success) {
        // Reload servers
        await set(loadServersAtom);
        return response.data;
      } else {
        console.error('Failed to create server:', response.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating server:', error);
      return null;
    }
  }
);

export const deleteServerAtom = atom(
  null,
  async (get, set, serverId: string) => {
    if (!api) return false;

    try {
      const response = await api.servers.delete(serverId);
      if (response.success) {
        // Reload servers
        await set(loadServersAtom);
        return true;
      } else {
        console.error('Failed to delete server:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error deleting server:', error);
      return false;
    }
  }
);
