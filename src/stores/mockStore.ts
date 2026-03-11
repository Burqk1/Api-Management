import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId, HttpMethod } from '../types/api';

export interface MockCondition {
  field: 'header' | 'query' | 'body_contains' | 'body_json_path';
  key: string;
  operator: 'equals' | 'contains' | 'exists' | 'regex';
  value: string;
}

export interface MockConditionalResponse {
  id: string;
  conditions: MockCondition[];
  statusCode: number;
  responseBody: string;
  priority: number;
}

export interface MockRoute {
  id: string;
  path: string;
  method: HttpMethod;
  statusCode: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  delay: number;
  delayRange?: { min: number; max: number };
  enabled: boolean;
  hitCount: number;
  lastHit?: number;
  createdAt: number;
  conditionalResponses?: MockConditionalResponse[];
  proxyUrl?: string;
  responseSequence?: string[];
  sequenceIndex?: number;
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

    // Calculate delay (range or fixed)
    const delayMs = route.delayRange
      ? route.delayRange.min + Math.floor(Math.random() * (route.delayRange.max - route.delayRange.min))
      : route.delay;
    if (delayMs > 0) {
      await new Promise((res) => setTimeout(res, delayMs));
    }

    // Check conditional responses
    let statusCode = route.statusCode;
    let responseBody = route.responseBody;

    if (route.conditionalResponses?.length) {
      const sorted = [...route.conditionalResponses].sort((a, b) => b.priority - a.priority);
      for (const cr of sorted) {
        if (evaluateConditions(cr.conditions, method, path, body)) {
          statusCode = cr.statusCode;
          responseBody = cr.responseBody;
          break;
        }
      }
    }

    // Sequence responses (round-robin)
    if (route.responseSequence?.length) {
      const idx = route.sequenceIndex || 0;
      responseBody = route.responseSequence[idx % route.responseSequence.length];
      set((s) => ({
        routes: s.routes.map((r) =>
          r.id === route.id ? { ...r, sequenceIndex: (idx + 1) % (r.responseSequence?.length || 1) } : r
        ),
      }));
    }

    set((s) => ({
      routes: s.routes.map((r) =>
        r.id === route.id ? { ...r, hitCount: r.hitCount + 1, lastHit: Date.now() } : r
      ),
    }));

    // Template variable replacement
    if (body) {
      try {
        const reqBody = JSON.parse(body);
        responseBody = responseBody.replace(/\{\{request\.body\.(\w+)\}\}/g, (_match, key) => {
          return reqBody[key] !== undefined ? String(reqBody[key]) : '';
        });
      } catch { /* body parse is best-effort */ }
    }
    responseBody = responseBody
      .replace(/\{\{timestamp\}\}/g, String(Date.now()))
      .replace(/\{\{randomId\}\}/g, generateId())
      .replace(/\{\{hitCount\}\}/g, String(route.hitCount + 1))
      .replace(/\{\{method\}\}/g, method)
      .replace(/\{\{path\}\}/g, path)
      .replace(/\{\{randomInt\}\}/g, String(Math.floor(Math.random() * 10000)))
      .replace(/\{\{randomFloat\}\}/g, (Math.random()).toFixed(4));

    return {
      status: statusCode,
      headers: route.responseHeaders,
      body: responseBody,
    };
  },

  clearRequestLog: () => set({ requestLog: [] }),

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem('mock_routes');
      if (saved) set({ routes: JSON.parse(saved) });
    } catch (e) { console.warn('[mockStore] Failed to initialize:', e); }
  },
}));

function evaluateConditions(conditions: MockCondition[], _method: HttpMethod, path: string, body?: string): boolean {
  return conditions.every((c) => {
    let target = '';
    if (c.field === 'query') {
      const qIdx = path.indexOf('?');
      if (qIdx >= 0) {
        const params = new URLSearchParams(path.slice(qIdx));
        target = params.get(c.key) || '';
      }
    } else if (c.field === 'header') {
      target = '';
    } else if (c.field === 'body_contains') {
      target = body || '';
    } else if (c.field === 'body_json_path') {
      try {
        const parsed = JSON.parse(body || '{}');
        target = String(parsed[c.key] ?? '');
      } catch { target = ''; }
    }
    switch (c.operator) {
      case 'equals': return target === c.value;
      case 'contains': return target.includes(c.value);
      case 'exists': return target.length > 0;
      case 'regex': try { return new RegExp(c.value).test(target); } catch { return false; }
      default: return false;
    }
  });
}

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
