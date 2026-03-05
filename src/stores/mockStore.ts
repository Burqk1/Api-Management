import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId, HttpMethod } from '../types/api';

export interface MockRoute {
  id: string;
  path: string;
  method: HttpMethod;
  statusCode: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  delay: number; // ms
  enabled: boolean;
  createdAt: number;
}

interface MockState {
  routes: MockRoute[];
  isRunning: boolean;
  port: number;
  addRoute: (data: Omit<MockRoute, 'id' | 'createdAt'>) => void;
  updateRoute: (id: string, data: Partial<MockRoute>) => void;
  removeRoute: (id: string) => void;
  toggleServer: () => void;
  handleMockRequest: (method: HttpMethod, path: string) => Promise<{ status: number; headers: Record<string, string>; body: string } | null>;
  initialize: () => Promise<void>;
}

export const useMockStore = create<MockState>((set, get) => ({
  routes: [],
  isRunning: false,
  port: 3456,

  addRoute: (data) => {
    const route: MockRoute = { ...data, id: generateId(), createdAt: Date.now() };
    set((s) => {
      const updated = [...s.routes, route];
      AsyncStorage.setItem('mock_routes', JSON.stringify(updated));
      return { routes: updated };
    });
  },

  updateRoute: (id, data) => {
    set((s) => {
      const updated = s.routes.map((r) => (r.id === id ? { ...r, ...data } : r));
      AsyncStorage.setItem('mock_routes', JSON.stringify(updated));
      return { routes: updated };
    });
  },

  removeRoute: (id) => {
    set((s) => {
      const updated = s.routes.filter((r) => r.id !== id);
      AsyncStorage.setItem('mock_routes', JSON.stringify(updated));
      return { routes: updated };
    });
  },

  toggleServer: () => set((s) => ({ isRunning: !s.isRunning })),

  handleMockRequest: async (method, path) => {
    const route = get().routes.find((r) => r.enabled && r.method === method && r.path === path);
    if (!route) return null;
    if (route.delay > 0) await new Promise((res) => setTimeout(res, route.delay));
    return {
      status: route.statusCode,
      headers: route.responseHeaders,
      body: route.responseBody,
    };
  },

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem('mock_routes');
      if (saved) set({ routes: JSON.parse(saved) });
    } catch {}
  },
}));
