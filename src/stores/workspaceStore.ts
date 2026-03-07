import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../types/api';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: number;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  addWorkspace: (data: Omit<Workspace, 'id' | 'createdAt'>) => Workspace;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string | null) => void;
  getActiveWorkspace: () => Workspace | null;
  initialize: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,

  addWorkspace: (data) => {
    const ws: Workspace = { ...data, id: generateId(), createdAt: Date.now() };
    set((s) => {
      const updated = [...s.workspaces, ws];
      AsyncStorage.setItem('workspaces', JSON.stringify(updated));
      return { workspaces: updated };
    });
    return ws;
  },

  updateWorkspace: (id, data) => {
    set((s) => {
      const updated = s.workspaces.map((w) => (w.id === id ? { ...w, ...data } : w));
      AsyncStorage.setItem('workspaces', JSON.stringify(updated));
      return { workspaces: updated };
    });
  },

  deleteWorkspace: (id) => {
    set((s) => {
      const updated = s.workspaces.filter((w) => w.id !== id);
      const activeWorkspaceId = s.activeWorkspaceId === id ? null : s.activeWorkspaceId;
      AsyncStorage.setItem('workspaces', JSON.stringify(updated));
      AsyncStorage.setItem('active_workspace', JSON.stringify(activeWorkspaceId));
      return { workspaces: updated, activeWorkspaceId };
    });
  },

  setActiveWorkspace: (id) => {
    AsyncStorage.setItem('active_workspace', JSON.stringify(id));
    set({ activeWorkspaceId: id });
  },

  getActiveWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get();
    return workspaces.find((w) => w.id === activeWorkspaceId) || null;
  },

  initialize: async () => {
    try {
      const [wsData, activeData] = await Promise.all([
        AsyncStorage.getItem('workspaces'),
        AsyncStorage.getItem('active_workspace'),
      ]);
      set({
        workspaces: wsData ? JSON.parse(wsData) : [],
        activeWorkspaceId: activeData ? JSON.parse(activeData) : null,
      });
    } catch {}
  },
}));
