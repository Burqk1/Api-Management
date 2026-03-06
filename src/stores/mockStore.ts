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
  delay: number;
  enabled: boolean;
  hitCount: number;
  lastHit?: number;
  createdAt: number;
}

export interface MockRequestLog {
  id: string;
  method: HttpMethod;
  path: string;
  requestBody?: string;
  responseStatus: number;
  responseBody: string;
  matched: boolean;
  timestamp: number;
}

export interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface MockState {
  routes: MockRoute[];
  isRunning: boolean;
  port: number;
  mockBaseUrl: string;
  requestLog: MockRequestLog[];
  addRoute: (data: Omit<MockRoute, 'id' | 'createdAt' | 'hitCount'>) => void;
  updateRoute: (id: string, data: Partial<MockRoute>) => void;
  removeRoute: (id: string) => void;
  toggleServer: () => void;
  handleMockRequest: (method: HttpMethod, path: string, body?: string) => Promise<MockResponse | null>;
  clearRequestLog: () => void;
  initialize: () => Promise<void>;
}

export const useMockStore = create<MockState>((set, get) => ({
  routes: [],
  isRunning: false,
  port: 3456,
  mockBaseUrl: 'mock://localhost',
  requestLog: [],

  addRoute: (data) => {
    const route: MockRoute = { ...data, id: generateId(), hitCount: 0, createdAt: Date.now() };
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

  handleMockRequest: async (method, path, body) => {
    const state = get();
    if (!state.isRunning) return null;

    const route = state.routes.find((r) => {
      if (!r.enabled || r.method !== method) return false;
      return matchPath(r.path, path);
    });

    const logEntry: MockRequestLog = {
      id: generateId(),
      method,
      path,
      requestBody: body,
      responseStatus: route ? route.statusCode : 404,
      responseBody: route ? route.responseBody : '{"error": "No matching mock route"}',
      matched: !!route,
      timestamp: Date.now(),
    };

    set((s) => ({
      requestLog: [logEntry, ...s.requestLog].slice(0, 100),
    }));

    if (!route) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: '{"error": "No matching mock route"}',
      };
    }

    if (route.delay > 0) {
      await new Promise((res) => setTimeout(res, route.delay));
    }

    set((s) => ({
      routes: s.routes.map((r) =>
        r.id === route.id ? { ...r, hitCount: r.hitCount + 1, lastHit: Date.now() } : r
      ),
    }));

    let responseBody = route.responseBody;
    if (body) {
      try {
        const reqBody = JSON.parse(body);
        responseBody = responseBody.replace(/\{\{request\.body\.(\w+)\}\}/g, (_match, key) => {
          return reqBody[key] !== undefined ? String(reqBody[key]) : '';
        });
      } catch {}
    }
    responseBody = responseBody
      .replace(/\{\{timestamp\}\}/g, String(Date.now()))
      .replace(/\{\{randomId\}\}/g, generateId());

    return {
      status: route.statusCode,
      headers: route.responseHeaders,
      body: responseBody,
    };
  },

  clearRequestLog: () => set({ requestLog: [] }),

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem('mock_routes');
      if (saved) set({ routes: JSON.parse(saved) });
    } catch {}
  },
}));

function matchPath(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, i) => {
    if (part.startsWith(':')) return true;
    if (part === '*') return true;
    return part === pathParts[i];
  });
}
